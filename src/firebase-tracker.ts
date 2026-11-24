import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface ProjectRecord {
  status: string;
  owner: string;
  note: string;
  updatedAtMs?: number;
}

export interface TrackerSyncState {
  user: User | null;
  ready: boolean;
  syncing: boolean;
  lastSavedAt: number | null;
  error: string | null;
}

const VALID_STATUSES = [
  'Chưa cập nhật',
  'Chưa bắt đầu',
  'Đang thực hiện',
  'Hoàn thành',
  'Tạm dừng',
];

const PROJECT_ID_RE = /^[A-F][0-9]{2}$/;

function sanitizeStatus(status: unknown): string {
  const s = String(status ?? '');
  return VALID_STATUSES.includes(s) ? s : VALID_STATUSES[0];
}

function sanitizeOwner(owner: unknown): string {
  return String(owner ?? '').slice(0, 120);
}

function sanitizeNote(note: unknown): string {
  return String(note ?? '').slice(0, 500);
}

function sanitizeBudget(budget: unknown): number {
  const n = Number(budget);
  if (!Number.isFinite(n)) return 3000;
  return Math.max(0, Math.min(1000000, n));
}

function sanitizeWeights(weights: unknown): number[] {
  const fallback = [35, 15, 10, 10, 12, 10, 3, 5];
  if (!Array.isArray(weights) || weights.length !== 8) return fallback;
  return weights.map((w) => Math.max(0, Math.min(60, Math.round(Number(w) || 0))));
}

function sanitizeCompletedTasks(tasksObj: Record<string, boolean> | undefined): number[] {
  if (!tasksObj || typeof tasksObj !== 'object') return [];
  const list: number[] = [];
  for (let i = 0; i < 20; i++) {
    if (tasksObj[String(i)]) list.push(i);
  }
  return list;
}

interface BridgeCallbacks {
  getLocalState: () => {
    tasks: Record<string, boolean>;
    projects: Record<string, ProjectRecord>;
    budget: number;
    weights: number[];
  };
  applyRemoteProjects: (projects: Record<string, ProjectRecord>) => void;
  applyRemotePreferences: (prefs: {
    budget: number;
    weights: number[];
    completedTasks: number[];
  }) => void;
  onSyncStateChange: (syncState: TrackerSyncState) => void;
  onToast: (msg: string) => void;
}

class FirebaseTrackerBridge {
  private syncState: TrackerSyncState = {
    user: null,
    ready: false,
    syncing: false,
    lastSavedAt: null,
    error: null,
  };
  private unsubProjects: Unsubscribe | null = null;
  private unsubMeta: Unsubscribe | null = null;
  private existingProjectIds = new Set<string>();
  private hasPreferencesDoc = false;
  private initialProjectsLoaded = false;
  private callbacks: BridgeCallbacks | null = null;

  init(callbacks: BridgeCallbacks) {
    this.callbacks = callbacks;

    onAuthStateChanged(auth, async (user) => {
      this.cleanupListeners();
      this.existingProjectIds.clear();
      this.hasPreferencesDoc = false;
      this.initialProjectsLoaded = false;

      if (!user) {
        this.updateSyncState({
          user: null,
          ready: true,
          syncing: false,
          error: null,
        });
        return;
      }

      this.updateSyncState({
        user,
        ready: true,
        syncing: true,
        error: null,
      });

      try {
        await this.ensureUserProfile(user);
        this.attachListeners(user);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.updateSyncState({ syncing: false, error: msg });
        this.callbacks?.onToast('Không thể kết nối hồ sơ người dùng trên Cloud.');
      }
    });
  }

  private updateSyncState(patch: Partial<TrackerSyncState>) {
    this.syncState = { ...this.syncState, ...patch };
    this.callbacks?.onSyncStateChange(this.syncState);
  }

  getSyncState(): TrackerSyncState {
    return this.syncState;
  }

  private cleanupListeners() {
    if (this.unsubProjects) {
      this.unsubProjects();
      this.unsubProjects = null;
    }
    if (this.unsubMeta) {
      this.unsubMeta();
      this.unsubMeta = null;
    }
  }

  private async ensureUserProfile(user: User) {
    const path = `users/${user.uid}`;
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      const email = String(user.email || '').slice(0, 160);
      const displayName = String(user.displayName || '').slice(0, 120);
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email,
          displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, {
          email,
          displayName,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  private attachListeners(user: User) {
    const projectsPath = `users/${user.uid}/trackerProjects`;
    const projectsQuery = query(
      collection(db, 'users', user.uid, 'trackerProjects'),
      where('ownerId', '==', user.uid)
    );

    this.unsubProjects = onSnapshot(
      projectsQuery,
      async (snapshot) => {
        const remoteProjects: Record<string, ProjectRecord> = {};
        const nextIds = new Set<string>();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (PROJECT_ID_RE.test(docSnap.id)) {
            nextIds.add(docSnap.id);
            remoteProjects[docSnap.id] = {
              status: sanitizeStatus(d.status),
              owner: sanitizeOwner(d.owner),
              note: sanitizeNote(d.note),
              updatedAtMs:
                d.updatedAt && typeof d.updatedAt.toMillis === 'function'
                  ? d.updatedAt.toMillis()
                  : undefined,
            };
          }
        });
        this.existingProjectIds = nextIds;

        const firstLoad = !this.initialProjectsLoaded;
        this.initialProjectsLoaded = true;

        if (firstLoad) {
          // Merge any unsynced local changes into Firestore on initial sign-in
          const local = this.callbacks?.getLocalState();
          if (local) {
            const toUpload: Array<[string, ProjectRecord]> = [];
            for (const [id, rec] of Object.entries(local.projects || {})) {
              if (!PROJECT_ID_RE.test(id)) continue;
              const isNonDefault =
                (rec.status && rec.status !== VALID_STATUSES[0]) ||
                Boolean(rec.owner) ||
                Boolean(rec.note);
              if (isNonDefault && !nextIds.has(id)) {
                toUpload.push([id, rec]);
              }
            }
            if (toUpload.length > 0) {
              try {
                await this.saveProjectsBatch(toUpload);
              } catch {
                // Error already logged by handleFirestoreError
              }
            }
          }
        }

        this.callbacks?.applyRemoteProjects(remoteProjects);
        this.updateSyncState({
          syncing: false,
          lastSavedAt: Date.now(),
          error: null,
        });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, projectsPath);
        } catch (wrapped) {
          this.updateSyncState({
            syncing: false,
            error: wrapped instanceof Error ? wrapped.message : String(wrapped),
          });
          this.callbacks?.onToast('Không thể tải dữ liệu dự án từ Cloud.');
        }
      }
    );

    const metaPath = `users/${user.uid}/trackerMeta`;
    const metaQuery = query(
      collection(db, 'users', user.uid, 'trackerMeta'),
      where('ownerId', '==', user.uid)
    );

    this.unsubMeta = onSnapshot(
      metaQuery,
      (snapshot) => {
        const prefDoc = snapshot.docs.find((d) => d.id === 'preferences');
        if (prefDoc) {
          this.hasPreferencesDoc = true;
          const d = prefDoc.data();
          const completedTasks = Array.isArray(d.completedTasks)
            ? d.completedTasks.filter(
                (n): n is number => Number.isInteger(n) && n >= 0 && n < 20
              )
            : [];
          this.callbacks?.applyRemotePreferences({
            budget: sanitizeBudget(d.budget),
            weights: sanitizeWeights(d.weights),
            completedTasks,
          });
        } else {
          this.hasPreferencesDoc = false;
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, metaPath);
        } catch (wrapped) {
          console.error(wrapped);
        }
      }
    );
  }

  async signIn(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await signInWithPopup(auth, provider);
      this.callbacks?.onToast(
        `Đã đăng nhập: ${cred.user.email || cred.user.displayName || 'Google'}`
      );
      return cred.user;
    } catch (error) {
      console.error('Sign in failed:', error);
      this.callbacks?.onToast('Đăng nhập Google không thành công hoặc đã bị hủy.');
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.callbacks?.onToast('Đã đăng xuất khỏi Cloud.');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  async saveProject(projectId: string, record: ProjectRecord): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    if (!PROJECT_ID_RE.test(projectId)) return false;

    const path = `users/${user.uid}/trackerProjects/${projectId}`;
    const ref = doc(db, 'users', user.uid, 'trackerProjects', projectId);

    this.updateSyncState({ syncing: true, error: null });

    const payload = {
      status: sanitizeStatus(record.status),
      owner: sanitizeOwner(record.owner),
      note: sanitizeNote(record.note),
      updatedAt: serverTimestamp(),
    };

    try {
      let exists = this.existingProjectIds.has(projectId);
      if (!exists) {
        const snap = await getDoc(ref);
        exists = snap.exists();
      }
      if (!exists) {
        await setDoc(ref, {
          projectId,
          ownerId: user.uid,
          ...payload,
          createdAt: serverTimestamp(),
        });
        this.existingProjectIds.add(projectId);
      } else {
        await updateDoc(ref, payload);
      }
      this.updateSyncState({
        syncing: false,
        lastSavedAt: Date.now(),
        error: null,
      });
      return true;
    } catch (error) {
      this.updateSyncState({ syncing: false });
      try {
        handleFirestoreError(
          error,
          this.existingProjectIds.has(projectId)
            ? OperationType.UPDATE
            : OperationType.CREATE,
          path
        );
      } catch (wrapped) {
        this.updateSyncState({
          error: wrapped instanceof Error ? wrapped.message : String(wrapped),
        });
        this.callbacks?.onToast('Lỗi lưu lên Cloud. Dữ liệu vẫn được giữ cục bộ.');
      }
      return false;
    }
  }

  async saveProjectsBatch(entries: Array<[string, ProjectRecord]>): Promise<boolean> {
    const user = auth.currentUser;
    if (!user || entries.length === 0) return false;

    const path = `users/${user.uid}/trackerProjects`;
    this.updateSyncState({ syncing: true, error: null });

    try {
      const batch = writeBatch(db);
      for (const [projectId, record] of entries) {
        if (!PROJECT_ID_RE.test(projectId)) continue;
        const ref = doc(db, 'users', user.uid, 'trackerProjects', projectId);
        const payload = {
          status: sanitizeStatus(record.status),
          owner: sanitizeOwner(record.owner),
          note: sanitizeNote(record.note),
          updatedAt: serverTimestamp(),
        };
        if (this.existingProjectIds.has(projectId)) {
          batch.update(ref, payload);
        } else {
          batch.set(ref, {
            projectId,
            ownerId: user.uid,
            ...payload,
            createdAt: serverTimestamp(),
          });
          this.existingProjectIds.add(projectId);
        }
      }
      await batch.commit();
      this.updateSyncState({
        syncing: false,
        lastSavedAt: Date.now(),
        error: null,
      });
      return true;
    } catch (error) {
      this.updateSyncState({ syncing: false });
      try {
        handleFirestoreError(error, OperationType.WRITE, path);
      } catch (wrapped) {
        this.updateSyncState({
          error: wrapped instanceof Error ? wrapped.message : String(wrapped),
        });
        this.callbacks?.onToast('Không thể đồng bộ hàng loạt lên Cloud.');
      }
      return false;
    }
  }

  async savePreferences(prefs: {
    budget: number;
    weights: number[];
    tasks: Record<string, boolean>;
  }): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    const path = `users/${user.uid}/trackerMeta/preferences`;
    const ref = doc(db, 'users', user.uid, 'trackerMeta', 'preferences');

    const payload = {
      budget: sanitizeBudget(prefs.budget),
      weights: sanitizeWeights(prefs.weights),
      completedTasks: sanitizeCompletedTasks(prefs.tasks),
      updatedAt: serverTimestamp(),
    };

    try {
      let exists = this.hasPreferencesDoc;
      if (!exists) {
        const snap = await getDoc(ref);
        exists = snap.exists();
      }
      if (!exists) {
        await setDoc(ref, {
          ownerId: user.uid,
          ...payload,
          createdAt: serverTimestamp(),
        });
        this.hasPreferencesDoc = true;
      } else {
        await updateDoc(ref, payload);
      }
      return true;
    } catch (error) {
      try {
        handleFirestoreError(
          error,
          this.hasPreferencesDoc ? OperationType.UPDATE : OperationType.CREATE,
          path
        );
      } catch (wrapped) {
        console.error(wrapped);
      }
      return false;
    }
  }
}

declare global {
  interface Window {
    __ovnFirebaseTracker?: FirebaseTrackerBridge;
  }
}

const bridge = new FirebaseTrackerBridge();
window.__ovnFirebaseTracker = bridge;
export default bridge;
