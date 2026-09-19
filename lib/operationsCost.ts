import type { MenuItem, WorkState } from './types';

export type GasCostMode = 'KG' | 'CYLINDER' | 'MANUAL';
export type TransportMode = 'EVENT_SHARED' | 'FUNCTION_WISE';

export type GasCostInput = {
  mode: GasCostMode;
  cylinderSizeKg: number;
  cylinderPrice: number;
  usedKg: number;
  cylindersUsed: number;
  manualCost: number;
};

export type TransportCostInput = {
  vehicleLabel: string;
  ratePerTrip: number;
  vehicles: number;
  tripsPerVehicle: number;
  tollParking: number;
  loadingUnloading: number;
  other: number;
};

export type FunctionOperationsRow = {
  id: string;
  serviceId?: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  gas: GasCostInput;
  transport: TransportCostInput;
};

export type OperationsCostState = {
  transportMode: TransportMode;
  sharedTransport: TransportCostInput;
  functions: FunctionOperationsRow[];
};

export type WorkWithOperations = WorkState & {
  operations?: OperationsCostState;
};

export const DEFAULT_GAS_COST: GasCostInput = {
  mode: 'KG',
  cylinderSizeKg: 19,
  cylinderPrice: 0,
  usedKg: 0,
  cylindersUsed: 0,
  manualCost: 0,
};

export const DEFAULT_TRANSPORT_COST: TransportCostInput = {
  vehicleLabel: 'Tempo',
  ratePerTrip: 0,
  vehicles: 1,
  tripsPerVehicle: 1,
  tollParking: 0,
  loadingUnloading: 0,
  other: 0,
};

function safe(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

export function calculateGasCost(input: GasCostInput) {
  if (input.mode === 'MANUAL') {
    return safe(input.manualCost);
  }

  const cylinderPrice = safe(input.cylinderPrice);

  if (input.mode === 'CYLINDER') {
    return cylinderPrice * safe(input.cylindersUsed);
  }

  const cylinderSizeKg = safe(input.cylinderSizeKg);
  if (!(cylinderSizeKg > 0)) return 0;

  const ratePerKg = cylinderPrice / cylinderSizeKg;
  return ratePerKg * safe(input.usedKg);
}

export function calculateTransportCost(input: TransportCostInput) {
  return (
    safe(input.ratePerTrip) *
      safe(input.vehicles) *
      safe(input.tripsPerVehicle) +
    safe(input.tollParking) +
    safe(input.loadingUnloading) +
    safe(input.other)
  );
}

function serviceIdentity(item: Pick<MenuItem, 'serviceId' | 'dayLabel' | 'mealLabel'>) {
  return item.serviceId?.trim()
    ? `service:${item.serviceId.trim()}`
    : `meal:${normalize(item.dayLabel)}::${normalize(item.mealLabel)}`;
}

export function buildFunctionOperationsRows(
  work: WorkState,
  saved?: OperationsCostState,
): FunctionOperationsRow[] {
  const rows = new Map<string, FunctionOperationsRow>();
  const fallbackPax = safe(work.event.pax);
  const fallbackMeal = work.event.functionType?.trim() || 'Event Menu';

  work.menu.forEach((item) => {
    const id = serviceIdentity(item);
    const existing = rows.get(id);
    const pax = safe(item.servicePax) || fallbackPax;

    if (existing) {
      existing.pax = Math.max(existing.pax, pax);
      return;
    }

    const savedRow = saved?.functions?.find((row) => row.id === id);

    rows.set(id, {
      id,
      serviceId: item.serviceId?.trim() || undefined,
      dayLabel: item.dayLabel?.trim() || '',
      mealLabel: item.mealLabel?.trim() || fallbackMeal,
      pax,
      gas: {
        ...DEFAULT_GAS_COST,
        ...(savedRow?.gas || {}),
      },
      transport: {
        ...DEFAULT_TRANSPORT_COST,
        ...(savedRow?.transport || {}),
      },
    });
  });

  if (rows.size === 0) {
    const savedRow = saved?.functions?.[0];
    rows.set('event:default', {
      id: 'event:default',
      dayLabel: '',
      mealLabel: fallbackMeal,
      pax: fallbackPax,
      gas: {
        ...DEFAULT_GAS_COST,
        ...(savedRow?.gas || {}),
      },
      transport: {
        ...DEFAULT_TRANSPORT_COST,
        ...(savedRow?.transport || {}),
      },
    });
  }

  return Array.from(rows.values());
}

export function normalizeOperationsState(
  work: WorkState,
  saved?: OperationsCostState,
): OperationsCostState {
  return {
    transportMode:
      saved?.transportMode === 'FUNCTION_WISE'
        ? 'FUNCTION_WISE'
        : 'EVENT_SHARED',
    sharedTransport: {
      ...DEFAULT_TRANSPORT_COST,
      ...(saved?.sharedTransport || {}),
    },
    functions: buildFunctionOperationsRows(work, saved),
  };
}

export function calculateOperationsTotals(
  state: OperationsCostState,
  automaticGasTotal?: number,
) {
  const gasTotal =
    automaticGasTotal === undefined
      ? state.functions.reduce(
          (sum, row) =>
            sum +
            calculateGasCost(
              row.gas,
            ),
          0,
        )
      : safe(
          automaticGasTotal,
        );

  const transportTotal =
    state.transportMode === 'EVENT_SHARED'
      ? calculateTransportCost(state.sharedTransport)
      : state.functions.reduce(
          (sum, row) => sum + calculateTransportCost(row.transport),
          0,
        );

  return {
    gasTotal,
    transportTotal,
    total: gasTotal + transportTotal,
  };
}
