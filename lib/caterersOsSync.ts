import type { WorkState } from './types';

export type CompletedCostingSummary = {
  menuCount: number;
  totalCovers: number;
  totalCost: number;
  sellingPricePerPlate: number;
  totalSelling: number;
  totalProfit: number;
};

export type CaterersOsSyncResult =
  | { status: 'not_configured' }
  | { status: 'synced'; created: boolean; eventId: string }
  | { status: 'failed'; error: string };

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function cleanText(value: unknown, maxLength = 200) {
  return String(value || '').trim().slice(0, maxLength);
}

export function buildCaterersOsEventPayload({
  workspaceId,
  work,
  summary,
  completedAt = new Date().toISOString(),
}: {
  workspaceId: string;
  work: WorkState;
  summary: CompletedCostingSummary;
  completedAt?: string;
}) {
  const functions = Array.from(
    work.menu.reduce((map, item) => {
      const serviceId = cleanText(item.serviceId || 'default', 120);
      const dayLabel = cleanText(item.dayLabel, 120);
      const mealLabel = cleanText(item.mealLabel || 'Event Menu', 120);
      const key = `${serviceId}::${dayLabel}::${mealLabel}`;
      const existing = map.get(key);

      map.set(key, {
        serviceId,
        dayLabel,
        mealLabel,
        guests: Math.max(
          existing?.guests || 0,
          finiteNumber(item.servicePax) || finiteNumber(work.event.pax)
        ),
        dishCount: (existing?.dishCount || 0) + 1,
      });
      return map;
    }, new Map<string, {
      serviceId: string;
      dayLabel: string;
      mealLabel: string;
      guests: number;
      dishCount: number;
    }>()).values()
  );

  return {
    workspaceId: cleanText(workspaceId, 120),
    costingId: cleanText(work.costingId, 120),
    completedAt,
    event: {
      eventName: cleanText(work.event.eventName, 140),
      clientName: cleanText(work.event.clientName, 140),
      eventDate: cleanText(work.event.eventDate, 64),
      functionType: cleanText(work.event.functionType || 'Event', 80),
      city: cleanText(work.event.city, 120),
      venue: cleanText(work.event.venue, 200),
      pax: Math.max(0, finiteNumber(work.event.pax)),
    },
    functions,
    menu: work.menu.slice(0, 1000).map((item) => ({
      id: cleanText(item.id, 120),
      name: cleanText(item.name, 180),
      category: cleanText(item.category, 120),
      costPerPlate: Math.max(0, finiteNumber(item.costPerPlate)),
      portionQuantity: Math.max(0, finiteNumber(item.portionQuantity)),
      portionUnit: cleanText(item.portionUnit, 40),
      serviceId: cleanText(item.serviceId, 120),
      dayLabel: cleanText(item.dayLabel, 120),
      mealLabel: cleanText(item.mealLabel, 120),
      servicePax: Math.max(0, finiteNumber(item.servicePax)),
      serviceStyle: cleanText(item.serviceStyle, 40),
    })),
    manpower: work.manpower.slice(0, 500).map((row) => ({
      id: cleanText(row.id, 120),
      role: cleanText(row.role, 120),
      quantity: Math.max(0, finiteNumber(row.quantity)),
      rate: Math.max(0, finiteNumber(row.rate)),
      rateMode: cleanText(row.rateMode, 40),
      shiftLabel: cleanText(row.shiftLabel, 80),
      serviceId: cleanText(row.serviceId, 120),
      dayLabel: cleanText(row.dayLabel, 120),
      mealLabel: cleanText(row.mealLabel, 120),
      servicePax: Math.max(0, finiteNumber(row.servicePax)),
    })),
    extras: {
      staff: Math.max(0, finiteNumber(work.extras.staff)),
      transport: Math.max(0, finiteNumber(work.extras.transport)),
      gasFuel: Math.max(0, finiteNumber(work.extras.gasFuel)),
      disposable: Math.max(0, finiteNumber(work.extras.disposable)),
      other: Math.max(0, finiteNumber(work.extras.other)),
    },
    disposableItems: work.disposableItems.slice(0, 500).map((item) => ({
      id: cleanText(item.id, 120),
      name: cleanText(item.name, 180),
      quantity: Math.max(0, finiteNumber(item.quantity)),
      unitCost: Math.max(0, finiteNumber(item.unitCost)),
    })),
    summary: {
      menuCount: Math.max(0, Math.round(finiteNumber(summary.menuCount))),
      totalCovers: Math.max(0, Math.round(finiteNumber(summary.totalCovers))),
      totalCost: finiteNumber(summary.totalCost),
      sellingPricePerPlate: finiteNumber(summary.sellingPricePerPlate),
      totalSelling: finiteNumber(summary.totalSelling),
      totalProfit: finiteNumber(summary.totalProfit),
    },
  };
}

export async function syncCompletedCostingToCaterersOs({
  work,
  summary,
}: {
  work: WorkState;
  summary: CompletedCostingSummary;
}): Promise<CaterersOsSyncResult> {
  const apiUrl = process.env.CATERERSOS_API_URL?.trim();
  const workspaceId = process.env.CATERERSOS_WORKSPACE_ID?.trim();
  const secret = process.env.CATERERSOS_SYNC_SECRET?.trim();

  if (!apiUrl && !workspaceId && !secret) {
    return { status: 'not_configured' };
  }
  if (!apiUrl || !workspaceId || !secret) {
    return {
      status: 'failed',
      error: 'CaterersOS sync environment is incomplete',
    };
  }

  try {
    const endpoint = new URL('/api/integrations/menu-costing/events', apiUrl);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Menu-Costing-Secret': secret,
      },
      body: JSON.stringify(
        buildCaterersOsEventPayload({ workspaceId, work, summary })
      ),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => ({})) as {
      created?: boolean;
      event?: { id?: string };
      error?: string;
    };

    if (!response.ok) {
      return {
        status: 'failed',
        error: cleanText(data.error || `CaterersOS returned HTTP ${response.status}`, 240),
      };
    }

    return {
      status: 'synced',
      created: Boolean(data.created),
      eventId: cleanText(data.event?.id, 120),
    };
  } catch (error) {
    return {
      status: 'failed',
      error:
        error instanceof Error && error.name === 'TimeoutError'
          ? 'CaterersOS sync timed out'
          : 'Could not reach CaterersOS',
    };
  }
}
