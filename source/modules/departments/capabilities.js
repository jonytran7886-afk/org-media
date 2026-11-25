import { data, portal } from '../../shared/data-service.js';

export function getStrategyCapabilities(dept) {
  const documents = (portal.documents || []).filter(d => d.departmentId === dept.id);
  const readable = documents.filter(d => d.status !== 'Chưa cập nhật' && (d.internalRoute || d.filePath || d.contentPath));
  const comms = dept.workspaceMode === 'communications';
  return {
    overview: true,
    strategy: comms || readable.some(d => /chiến lược/i.test(d.title)),
    plans: comms && Boolean(data.campaigns?.length || data.quarters?.length),
    projects: comms && Boolean(data.projects?.length),
    documents: documents.length > 0,
    'budget-kpi': comms && Boolean(data.budgetnames?.length && data.sections?.some(s => s.p === 9)),
  };
}
