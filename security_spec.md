# Security Specification — Master Project Tracker Firestore Rules

## 1. Data Invariants
1. **Default Deny**: No document in Firestore is readable or writable unless an explicit rule grants access.
2. **User Isolation & PII Protection**: `/users/{userId}` documents contain `email` and `displayName` and are strictly readable/writable only by the owning verified user (`request.auth.uid == userId`) or a verified bootstrapped admin. Blanket `list` on `/users` is forbidden.
3. **Master Gate**: Subcollections `/users/{userId}/trackerProjects/{projectId}` and `/users/{userId}/trackerMeta/{metaId}` require the parent `/users/{userId}` document to exist on single-document operations (`create`, `update`, `delete`).
4. **Identity Integrity**: Every document must bind `uid` / `ownerId` strictly to `request.auth.uid`, and `ownerId`/`projectId`/`createdAt` are immutable after creation.
5. **Verified Users & Server Time**: All writes require `request.auth != null && request.auth.token.email_verified == true`, and `createdAt`/`updatedAt` must equal `request.time`.
6. **Strict Schema & Bounds**: Every write validates exact key sets (`hasAll` + `hasOnly`), string `.size()` limits, `projectId` regex `^[A-F][0-9]{2}$`, and allowed status enum values.
7. **Secure List Queries**: `allow list` on `trackerProjects` and `trackerMeta` evaluates `isOwner(userId) && resource.data.ownerId == request.auth.uid` without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Reading or writing `/users/u1/trackerProjects/A01` with `auth == null`.
2. **Unverified Email Write**: Creating `trackerProjects/A01` with `email_verified: false`.
3. **Cross-User Read**: User `u2` attempting `get` or `list` on `/users/u1/trackerProjects`.
4. **Cross-User Spoofed OwnerId**: User `u1` creating `/users/u1/trackerProjects/A01` with `ownerId: "u2"`.
5. **Shadow / Ghost Field Injection**: Creating or updating `trackerProjects/A01` with extra key `isAdmin: true`.
6. **Oversized Note (Denial of Wallet)**: Writing `note` with length > 500 characters.
7. **Invalid Project ID Poisoning**: Writing to `/users/u1/trackerProjects/INVALID_ID_9999` (fails `^[A-F][0-9]{2}$`).
8. **Invalid Status Enum**: Updating `status` to `"HackStatus"`.
9. **Client-Spoofed Timestamp**: Creating or updating with `updatedAt` set to a past client timestamp instead of `request.time`.
10. **Immutable Field Mutation**: Updating `createdAt` or `ownerId` on an existing `trackerProjects/A01`.
11. **Blanket Users List Scrape**: Signed-in user attempting `list` on `/users`.
12. **Unbounded Array Injection**: Writing `completedTasks` with 25 items (> 20) or `weights` with wrong length (!= 8).
