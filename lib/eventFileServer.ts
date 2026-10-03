import { prisma } from './prisma';
export async function findEventWork(tenantId: string, costingId: string) {
  const where = { tenantId_costingId: { tenantId, costingId } };
  const draft = await prisma.tenantDraftCosting.findUnique({ where, select: { workData: true } });
  if (draft) return draft.workData;
  const completed = await prisma.tenantCostingHistory.findUnique({ where, select: { snapshot: true } });
  return completed?.snapshot ?? null;
}
