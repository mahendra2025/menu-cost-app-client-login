'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import {
  calculate,
  defaultManpower,
  getMenuServiceKey,
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';

import {
  calculateManpowerCost,
  getManpowerRateMode,
  inferManpowerShift,
  manpowerBillableCost,
  manpowerIncludedInSharedRate,
  manpowerRateModeLabel,
  manpowerRawCost,
} from '../../../lib/manpowerCost';

import type {
  ManpowerRow,
  MenuItem,
  ServiceStyle,
  Session,
  WorkState,
} from '../../../lib/types';

type FunctionOption = {
  serviceKey: string;
  serviceId: string;
  dayLabel: string;
  mealLabel: string;
  servicePax: number;
  serviceStyle: ServiceStyle;
};

type ManpowerGroup = FunctionOption & {
  rows: ManpowerRow[];
};

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function rowTotal(
  row: ManpowerRow,
) {
  return manpowerRawCost(
    row,
  );
}

function canAssignDishes(
  role: string,
) {
  return /cook|chef|helper|masi|counter|bartender|master|maker|halwai|tandoor/i.test(
    String(role || ''),
  );
}

function DishAssignmentControl({
  row,
  dishes,
  onChange,
}: {
  row: ManpowerRow;
  dishes: MenuItem[];
  onChange: (dishIds: string[]) => void;
}) {
  if (!canAssignDishes(row.role)) {
    return (
      <span className="manpower-dish-not-applicable">
        —
      </span>
    );
  }

  const selected =
    new Set(
      Array.isArray(row.assignedDishIds)
        ? row.assignedDishIds
        : [],
    );

  const assignedDishes =
    dishes.filter(
      (dish) =>
        selected.has(dish.id),
    );

  const selectedCount =
    assignedDishes.length;

  /*
   * Automatic chef station:
   * detected dishes stay visible and extra dishes
   * can be attached without increasing chef quantity.
   */
  if (row.autoStationHelper) {
    return (
      <div className="manpower-auto-dish">
        <div className="manpower-auto-dish-top">
          <span className="manpower-auto-badge">
            AUTO
          </span>

          <small>
            {`${row.stationLabel || 'Station'} helper`}
          </small>
        </div>

        {assignedDishes.length ? (
          <div className="manpower-auto-dish-chips">
            {assignedDishes.map((dish) => (
              <span
                key={dish.id}
                className="manpower-auto-dish-chip"
              >
                <b>{dish.name}</b>
                <small>{dish.category}</small>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (row.autoDishAssignment) {
    const availableDishes =
      dishes.filter(
        (dish) =>
          !selected.has(dish.id),
      );

    return (
      <div className="manpower-auto-dish">
        <div className="manpower-auto-dish-top">
          <span className="manpower-auto-badge">
            AUTO
          </span>

          <small>
            1 station → 1 chef
          </small>
        </div>

        {assignedDishes.length ? (
          <div className="manpower-auto-dish-chips">
            {assignedDishes.map((dish) => (
              <span
                key={dish.id}
                className="manpower-auto-dish-chip"
              >
                <b>{dish.name}</b>
                <small>{dish.category}</small>
              </span>
            ))}
          </div>
        ) : (
          <span className="manpower-dish-not-applicable">
            Dish unavailable
          </span>
        )}

        <details className="manpower-dish-selector manpower-auto-dish-selector">
          <summary>
            + Add Dish
          </summary>

          <div className="manpower-dish-selector-panel">
            {availableDishes.length ? (
              <div className="manpower-dish-selector-list">
                {availableDishes.map((dish) => (
                  <label key={dish.id}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() =>
                        onChange([
                          ...Array.from(selected),
                          dish.id,
                        ])
                      }
                    />

                    <span>
                      <b>{dish.name}</b>
                      <small>{dish.category}</small>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <span className="manpower-dish-not-applicable">
                All dishes assigned
              </span>
            )}
          </div>
        </details>
      </div>
    );
  }

  if (!dishes.length) {
    return (
      <span className="manpower-dish-not-applicable">
        No dishes
      </span>
    );
  }

  function toggleDish(
    dishId: string,
  ) {
    const next =
      new Set(selected);

    if (next.has(dishId)) {
      next.delete(dishId);
    } else {
      next.add(dishId);
    }

    onChange(
      Array.from(next),
    );
  }

  return (
    <details className="manpower-dish-selector">
      <summary>
        {selectedCount
          ? `${selectedCount} dish${selectedCount === 1 ? '' : 'es'}`
          : 'Select dishes'}
      </summary>

      <div className="manpower-dish-selector-panel">
        <div className="manpower-dish-selector-actions">
          <button
            type="button"
            onClick={() =>
              onChange(
                dishes.map(
                  (dish) => dish.id,
                ),
              )
            }
          >
            Select all
          </button>

          <button
            type="button"
            onClick={() =>
              onChange([])
            }
          >
            Clear
          </button>
        </div>

        <div className="manpower-dish-selector-list">
          {dishes.map((dish) => (
            <label
              key={dish.id}
              className={
                selected.has(dish.id)
                  ? 'is-selected'
                  : ''
              }
            >
              <input
                type="checkbox"
                checked={
                  selected.has(
                    dish.id,
                  )
                }
                onChange={() =>
                  toggleDish(
                    dish.id,
                  )
                }
              />

              <span>
                <b>
                  {dish.name}
                </b>

                <small>
                  {dish.category}
                </small>
              </span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function QuantityControl({
  row,
  onChange,
}: {
  row: ManpowerRow;
  onChange: (quantity: number) => void;
}) {
  const quantity = Math.max(0, Number(row.quantity) || 0);

  return (
    <div className="manpower-quantity-control">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, quantity - 1))}
        disabled={quantity === 0}
        aria-label={`Remove one ${row.role}`}
      >
        −
      </button>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={row.quantity || ''}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        placeholder="0"
        aria-label={`Quantity for ${row.role}`}
      />
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label={`Add one ${row.role}`}
      >
        +
      </button>
    </div>
  );
}


function RateModeControl({
  row,
  onChange,
}: {
  row: ManpowerRow;
  onChange: (
    patch: Partial<ManpowerRow>,
  ) => void;
}) {
  const mode =
    getManpowerRateMode(row);

  if (
    row.autoDishAssignment ||
    row.autoStationHelper
  ) {
    return (
      <span className="manpower-rate-basis-auto">
        Per Meal
      </span>
    );
  }

  return (
    <div className="manpower-rate-mode-control">
      <select
        className="input manpower-rate-mode-select"
        value={mode}
        onChange={(event) => {
          const nextMode =
            event.target.value as
              | 'PER_MEAL'
              | 'PER_SHIFT'
              | 'PER_DAY';

          onChange({
            rateMode:
              nextMode,

            ...(nextMode ===
            'PER_SHIFT'
              ? {
                  shiftLabel:
                    row.shiftLabel ||
                    inferManpowerShift(
                      row,
                    ),
                }
              : {}),
          });
        }}
      >
        <option value="PER_MEAL">
          Per Meal
        </option>

        <option value="PER_SHIFT">
          Per Shift
        </option>

        <option value="PER_DAY">
          Per Day
        </option>
      </select>

      {mode === 'PER_SHIFT' ? (
        <select
          className="input manpower-shift-select"
          value={
            row.shiftLabel ||
            inferManpowerShift(
              row,
            )
          }
          onChange={(event) =>
            onChange({
              shiftLabel:
                event.target.value,
            })
          }
        >
          <option value="Morning">
            Morning
          </option>

          <option value="Afternoon">
            Afternoon
          </option>

          <option value="Evening">
            Evening
          </option>

          <option value="Night">
            Night
          </option>
        </select>
      ) : null}
    </div>
  );
}

function BilledManpowerTotal({
  row,
  rows,
}: {
  row: ManpowerRow;
  rows: ManpowerRow[];
}) {
  const billed =
    manpowerBillableCost(
      row,
      rows,
    );

  const included =
    manpowerIncludedInSharedRate(
      row,
      rows,
    );

  return (
    <div className="manpower-billed-total">
      <b>
        {money(billed)}
      </b>

      <small>
        {included
          ? `Included in ${manpowerRateModeLabel(
              row,
            )}`
          : manpowerRateModeLabel(
              row,
            )}
      </small>
    </div>
  );
}


type ServiceStaffRecommendation = {
  role: string;
  quantity: number;
  rateRole: string;
};

function serviceStyleLabel(
  style: ServiceStyle,
) {
  switch (style) {
    case 'TABLE_SERVICE':
      return 'Table Service';

    case 'PACKED_MEAL':
      return 'Packed Meal';

    case 'LIVE_COUNTER':
      return 'Live Counter';

    default:
      return 'Buffet';
  }
}

function serviceStaffRecommendation(
  style: ServiceStyle,
  pax: number,
): ServiceStaffRecommendation[] {
  const members =
    Math.max(
      0,
      Number(pax) || 0,
    );

  if (!members) {
    return [];
  }

  const qty = (
    divisor: number,
  ) =>
    Math.max(
      1,
      Math.ceil(
        members / divisor,
      ),
    );

  switch (style) {
    case 'TABLE_SERVICE':
      return [
        {
          role: 'Waiter',
          quantity: qty(12),
          rateRole: 'Waiter',
        },
        {
          role: 'Captain',
          quantity: qty(100),
          rateRole: 'Captain',
        },
        {
          role: 'Supervisor',
          quantity: qty(250),
          rateRole: 'Supervisor',
        },
      ];

    case 'PACKED_MEAL':
      return [
        {
          role: 'Packing Staff',
          quantity: qty(75),
          rateRole: 'Helper / Masi',
        },
        {
          role: 'Supervisor',
          quantity: qty(300),
          rateRole: 'Supervisor',
        },
      ];

    case 'LIVE_COUNTER':
      return [
        {
          role: 'Waiter',
          quantity: qty(30),
          rateRole: 'Waiter',
        },
        {
          role: 'Captain',
          quantity: qty(150),
          rateRole: 'Captain',
        },
        {
          role: 'Counter Attendant',
          quantity: qty(75),
          rateRole: 'Counter Attendant',
        },
      ];

    case 'BUFFET':
    default:
      return [
        {
          role: 'Waiter',
          quantity: qty(25),
          rateRole: 'Waiter',
        },
        {
          role: 'Captain',
          quantity: qty(150),
          rateRole: 'Captain',
        },
        {
          role: 'Counter Attendant',
          quantity: qty(100),
          rateRole: 'Counter Attendant',
        },
      ];
  }
}

function getFunctions(
  menu: MenuItem[],
): FunctionOption[] {
  const functions =
    new Map<
      string,
      FunctionOption
    >();

  menu.forEach((item) => {
    const serviceKey =
      getMenuServiceKey(
        item,
      );

    if (
      functions.has(
        serviceKey,
      )
    ) {
      return;
    }

    functions.set(
      serviceKey,
      {
        serviceKey,

        serviceId:
          item.serviceId ??
          'default',

        dayLabel:
          item.dayLabel ?? '',

        mealLabel:
          item.mealLabel ??
          'Event Function',

        servicePax:
          Math.max(
            0,
            Number(
              item.servicePax,
            ) || 0,
          ),

        serviceStyle:
          item.serviceStyle ??
          'BUFFET',
      },
    );
  });

  return Array.from(
    functions.values(),
  );
}

function specialistForDish(
  dish: MenuItem,
): {
  role: string;
  rateRole: string;
} | null {
  const category = String(
    dish.category || '',
  ).trim().toLowerCase();

  const name = String(
    dish.name || '',
  ).trim().toLowerCase();

  if (
    category === 'welcome drink' ||
    category === 'mocktail' ||
    name.includes('juice')
  ) {
    return {
      role: 'Juice / Mocktail Maker',
      rateRole: 'Bartender',
    };
  }

  if (category === 'soup') {
    return {
      role: 'Soup Cook',
      rateRole: 'Cook',
    };
  }

  if (category === 'starter') {
    return {
      role: 'Starter Cook',
      rateRole: 'Cook',
    };
  }

  if (category === 'chaat') {
    return {
      role: 'Chaat Master',
      rateRole: 'Cook',
    };
  }

  if (category === 'chinese') {
    return {
      role: 'Chinese Cook',
      rateRole: 'Cook',
    };
  }

  if (
    category === 'italian' ||
    category === 'pizza' ||
    category === 'pasta'
  ) {
    return {
      role: 'Italian Cook',
      rateRole: 'Cook',
    };
  }

  if (category === 'bread') {
    return {
      role: 'Indian Bread / Tandoor Cook',
      rateRole: 'Cook',
    };
  }

  if (
    category === 'dal/kadhi' ||
    category === 'dal' ||
    category === 'kadhi'
  ) {
    return {
      role: 'Dal / Kadhi Cook',
      rateRole: 'Cook',
    };
  }

  if (category === 'rice') {
    return {
      role: 'Rice Cook',
      rateRole: 'Cook',
    };
  }

  if (
    category === 'sabji' ||
    category === 'paneer'
  ) {
    return {
      role: 'Sabji Cook',
      rateRole: 'Cook',
    };
  }

  if (
    category === 'sweet' ||
    category === 'dessert'
  ) {
    return {
      role: 'Sweet / Halwai',
      rateRole: 'Cook',
    };
  }

  if (category === 'farsan') {
    return {
      role: 'Farsan Cook',
      rateRole: 'Cook',
    };
  }

  return null;
}

function specialistRate(
  rateRole: string,
) {
  return (
    defaultManpower.find(
      (row) =>
        row.role ===
        rateRole,
    )?.rate || 0
  );
}

function autoAssignDishCooks(
  work: WorkState,
  rows: ManpowerRow[],
) {
  const previousAutoAssignments =
    new Map<string, string[]>(
      rows
        .filter(
          (row) =>
            row.autoDishAssignment,
        )
        .map(
          (row): [string, string[]] => [
            row.id,
            Array.isArray(
              row.assignedDishIds,
            )
              ? row.assignedDishIds
              : [],
          ],
        ),
    );

  const manualRows = rows.filter(
    (row) =>
      !row.autoDishAssignment &&
      !row.autoStationHelper,
  );

  const nextRows = [...manualRows];

  type Station = {
    serviceKey: string;
    serviceId?: string;
    dayLabel?: string;
    mealLabel?: string;
    servicePax: number;
    stationLabel: string;
    role: string;
    rateRole: string;
    dishIds: string[];
  };

  const stations = new Map<string, Station>();

  work.menu.forEach((dish) => {
    const specialist =
      specialistForDish(dish);

    if (!specialist) return;

    const serviceKey =
      getMenuServiceKey(dish);

    const stationLabel =
      specialist.role
        .replace(
          /\s+(?:cook|master|maker)$/i,
          '',
        )
        .trim() || specialist.role;

    const stationKey =
      `${serviceKey}::${specialist.role.toLowerCase()}`;

    const current =
      stations.get(stationKey) ?? {
        serviceKey,
        serviceId: dish.serviceId,
        dayLabel: dish.dayLabel,
        mealLabel: dish.mealLabel,
        servicePax: Math.max(
          0,
          Number(dish.servicePax) || 0,
        ),
        stationLabel,
        role: specialist.role,
        rateRole: specialist.rateRole,
        dishIds: [],
      };

    current.dishIds.push(dish.id);

    stations.set(
      stationKey,
      current,
    );
  });

  stations.forEach((station) => {
    const safeStation =
      station.stationLabel
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          '_',
        )
        .replace(
          /^_+|_+$/g,
          '',
        );

    // One chef handles all dishes in this station.
    // Extra manually-added dishes are preserved.
    const stationRowId =
      `manpower_station_${station.serviceKey}_${safeStation}`;

    const validServiceDishIds =
      new Set(
        work.menu
          .filter(
            (dish) =>
              getMenuServiceKey(dish) ===
              station.serviceKey,
          )
          .map(
            (dish) => dish.id,
          ),
      );

    const preservedDishIds =
      previousAutoAssignments.get(
        stationRowId,
      ) ?? [];

    const assignedDishIds =
      Array.from(
        new Set([
          ...station.dishIds,

          ...preservedDishIds.filter(
            (dishId) =>
              validServiceDishIds.has(
                dishId,
              ),
          ),
        ]),
      );

    nextRows.push({
      id: stationRowId,

      role: station.role,

      // Chef stays 1 even after adding dishes.
      quantity: 1,

      rate:
        specialistRate(
          station.rateRole,
        ),

      rateMode: 'PER_MEAL',

      assignedDishIds,

      autoDishAssignment: true,

      stationLabel:
        station.stationLabel,

      serviceId:
        station.serviceId,

      dayLabel:
        station.dayLabel,

      mealLabel:
        station.mealLabel,

      servicePax:
        station.servicePax,
    });

  });

  return nextRows;
}

function createFunctionDefaults(
  service: FunctionOption,
): ManpowerRow[] {
  return defaultManpower.map((template) => ({
    ...template,
    id: `${template.id}_${service.serviceKey}`,
    serviceId: service.serviceId,
    dayLabel: service.dayLabel,
    mealLabel: service.mealLabel,
    servicePax: service.servicePax,
  }));
}

function initializeFunctionManpower(work: WorkState): WorkState {
  const functions = getFunctions(work.menu);
  if (!functions.length) return work;

  let rows =
    work.manpower.map(
      (row) => {
        const hasMealIdentity =
          Boolean(
            row.serviceId ||
            row.dayLabel ||
            row.mealLabel,
          );

        if (!hasMealIdentity) {
          return row;
        }

        const currentKey =
          getMenuServiceKey(
            row,
          );

        const matchingFunction =
          functions.find(
            (service) =>
              service.serviceKey ===
              currentKey,
          ) ??
          functions.find(
            (service) =>
              service.dayLabel ===
                (row.dayLabel ?? '') &&
              service.mealLabel ===
                (row.mealLabel ?? '') &&
              (
                !row.servicePax ||
                service.servicePax ===
                  Math.max(
                    0,
                    Number(
                      row.servicePax,
                    ) || 0,
                  )
              ),
          ) ??
          functions.find(
            (service) =>
              service.serviceId ===
              row.serviceId,
          );

        if (!matchingFunction) {
          return row;
        }

        /*
         * Old function templates used:
         * manpower_cook_service_1
         *
         * Re-key them using:
         * service + day + meal
         * so Day 1 Lunch and Day 2 Lunch
         * can never collide.
         */
        const defaultTemplate =
          defaultManpower.find(
            (template) =>
              row.role ===
                template.role &&
              (
                row.id ===
                  template.id ||
                row.id.startsWith(
                  `${template.id}_`,
                )
              ),
          );

        return {
          ...row,

          id:
            defaultTemplate
              ? `${defaultTemplate.id}_${matchingFunction.serviceKey}`
              : row.id,

          serviceId:
            matchingFunction.serviceId,

          dayLabel:
            matchingFunction.dayLabel,

          mealLabel:
            matchingFunction.mealLabel,

          servicePax:
            matchingFunction.servicePax,
        };
      },
    );

  /*
   * Migration safety:
   * avoid duplicate template rows.
   */
  rows =
    Array.from(
      new Map(
        rows.map(
          (row) => [
            row.id,
            row,
          ],
        ),
      ).values(),
    );

  const defaultIds = new Set(
    defaultManpower.map((row) => row.id),
  );
  rows = rows.filter(
    (row) =>
      (
        row.serviceId ||
        row.dayLabel ||
        row.mealLabel
      ) ||
      row.quantity > 0 ||
      !defaultIds.has(row.id),
  );

  functions.forEach((service) => {
    const functionDefaults = createFunctionDefaults(service);
    functionDefaults.forEach((template) => {
      if (!rows.some((row) => row.id === template.id)) {
        rows.push(template);
      }
    });
  });

  /*
   * Automatically create one chef station
   * for each supported menu category.
   */
  rows = autoAssignDishCooks(
    work,
    rows,
  );

  const staff =
    calculateManpowerCost(
      rows,
    );

  if (
    JSON.stringify(rows) === JSON.stringify(work.manpower) &&
    staff === work.extras.staff
  ) {
    return work;
  }

  return {
    ...work,
    manpower: rows,
    extras: {
      ...work.extras,
      staff,
    },
  };
}

export default function ManpowerPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [showUnusedRoles, setShowUnusedRoles] = useState(false);
  const [selectedFunctionId, setSelectedFunctionId] = useState('all');
  const [expandedFunctionIds, setExpandedFunctionIds] = useState<string[]>([]);
  const [hasInitializedFunctions, setHasInitializedFunctions] = useState(false);

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);

    const savedWork = loadWork(current.tenantId);
    const initializedWork = initializeFunctionManpower(savedWork);

    setWork(initializedWork);
    if (initializedWork !== savedWork) {
      saveWork(current.tenantId, initializedWork);
    }
  }, [router]);

  const manpowerGroups = useMemo<ManpowerGroup[]>(() => {
    if (!work) return [];

    const functions = getFunctions(work.menu);
    const groups = functions.map((service) => ({
      ...service,
      rows: work.manpower.filter(
        (row) =>
          Boolean(
            row.serviceId ||
            row.dayLabel ||
            row.mealLabel,
          ) &&
          getMenuServiceKey(
            row,
          ) ===
          service.serviceKey,
      ),
    }));
    const knownKeys =
      new Set(
        functions.map(
          (service) =>
            service.serviceKey,
        ),
      );

    const orphanedFunctionRows =
      work.manpower.filter(
        (row) => {
          const hasMealIdentity =
            Boolean(
              row.serviceId ||
              row.dayLabel ||
              row.mealLabel,
            );

          if (!hasMealIdentity) {
            return false;
          }

          return !knownKeys.has(
            getMenuServiceKey(
              row,
            ),
          );
        },
      );

    const orphanedKeys =
      Array.from(
        new Set(
          orphanedFunctionRows.map(
            (row) =>
              getMenuServiceKey(
                row,
              ),
          ),
        ),
      );

    orphanedKeys.forEach(
      (serviceKey) => {
        const rows =
          orphanedFunctionRows.filter(
            (row) =>
              getMenuServiceKey(
                row,
              ) ===
              serviceKey,
          );

        const first =
          rows[0];

        groups.push({
          serviceKey,

          serviceId:
            first?.serviceId ??
            'default',

          dayLabel:
            first?.dayLabel ?? '',

          mealLabel:
            first?.mealLabel ??
            'Previous Function',

          servicePax:
            Math.max(
              0,
              Number(
                first?.servicePax,
              ) || 0,
            ),

          serviceStyle: 'BUFFET',

          rows,
        });
      },
    );

    const generalRows = work.manpower.filter((row) => !row.serviceId);
    if (generalRows.length || !groups.length) {
      groups.unshift({
        serviceKey: 'general',
        serviceId: 'general',
        dayLabel: '',
        mealLabel: 'General Event Staff',
        servicePax: Math.max(0, Number(work.event.pax) || 0),
        serviceStyle: 'BUFFET',
        rows: generalRows.length
          ? generalRows
          : defaultManpower.map((row) => ({ ...row })),
      });
    }

    return groups;
  }, [work]);

  const visibleManpowerGroups = useMemo(
    () =>
      selectedFunctionId === 'all'
        ? manpowerGroups
        : manpowerGroups.filter(
            (group) =>
              group.serviceKey === selectedFunctionId,
          ),
    [
      manpowerGroups,
      selectedFunctionId,
    ],
  );

  useEffect(() => {
    if (
      selectedFunctionId !== 'all' &&
      !manpowerGroups.some(
        (group) =>
          group.serviceKey === selectedFunctionId,
      )
    ) {
      setSelectedFunctionId('all');
    }
  }, [
    manpowerGroups,
    selectedFunctionId,
  ]);

  const selectedMealGroup =
    selectedFunctionId === 'all'
      ? null
      : manpowerGroups.find(
          (group) =>
            group.serviceKey === selectedFunctionId,
        ) ?? null;

  const manpowerTotal =
    useMemo(
      () =>
        calculateManpowerCost(
          work?.manpower ??
            [],
        ),
      [work],
    );

  useEffect(() => {
    if (hasInitializedFunctions || !manpowerGroups.length) return;

    const functionsNeedingAttention = manpowerGroups
      .filter((group) => group.rows.some(
        (row) => Number(row.quantity) > 0 && !(Number(row.rate) > 0),
      ))
      .map((group) => group.serviceKey);

    setExpandedFunctionIds(
      functionsNeedingAttention.length
        ? functionsNeedingAttention
        : [manpowerGroups[0].serviceKey],
    );
    setHasInitializedFunctions(true);
  }, [hasInitializedFunctions, manpowerGroups]);

  const peopleTotal = useMemo(
    () =>
      (work?.manpower ?? []).reduce(
        (sum, row) =>
          sum + Math.max(0, Number(row.quantity) || 0),
        0,
      ),
    [work],
  );

  const activeRoleCount = useMemo(
    () => (work?.manpower ?? []).filter((row) => Number(row.quantity) > 0).length,
    [work],
  );

  const missingRateCount = useMemo(
    () => (work?.manpower ?? []).filter(
      (row) => Number(row.quantity) > 0 && !(Number(row.rate) > 0),
    ).length,
    [work],
  );

  const plannedFunctionCount = useMemo(
    () => manpowerGroups.filter(
      (group) => group.rows.some((row) => Number(row.quantity) > 0),
    ).length,
    [manpowerGroups],
  );

  const result = useMemo(
    () => work ? calculate(work) : null,
    [work],
  );

  if (!work || !session || !result) {
    return (
      <AppShell title="Manpower">
        <div className="content-grid">
          <div className="glass-card">Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Manpower">
        <LockedCard />
      </AppShell>
    );
  }

  function persistRows(rows: ManpowerRow[]) {
    if (!session || !work) return;

    const staff =
      calculateManpowerCost(
        rows,
      );
    const nextWork: WorkState = {
      ...work,
      manpower: rows,
      extras: {
        ...work.extras,
        staff,
      },
    };

    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
  }

  function updateServiceStyle(
    group: ManpowerGroup,
    serviceStyle: ServiceStyle,
  ) {
    if (!work || !session) {
      return;
    }

    const nextMenu =
      work.menu.map(
        (dish) =>
          getMenuServiceKey(
            dish,
          ) ===
          group.serviceKey
            ? {
                ...dish,
                serviceStyle,
              }
            : dish,
      );

    const nextWork: WorkState = {
      ...work,
      menu: nextMenu,
      updatedAt:
        new Date().toISOString(),
    };

    setWork(nextWork);

    saveWork(
      session.tenantId,
      nextWork,
    );
  }

  function applyServiceStaffRecommendation(
    group: ManpowerGroup,
  ) {
    if (!work) {
      return;
    }

    const recommendations =
      serviceStaffRecommendation(
        group.serviceStyle,
        group.servicePax,
      );

    if (!recommendations.length) {
      window.alert(
        'Set meal pax before auto filling service staff.',
      );
      return;
    }

    const controlledRoles =
      new Set([
        'Waiter',
        'Captain',
        'Supervisor',
        'Counter Attendant',
        'Packing Staff',
      ]);

    /*
     * Auto Fill intentionally resets only
     * service-team roles for this meal.
     *
     * Specialist cooks and kitchen helpers
     * remain untouched.
     */
    let rows =
      work.manpower.map(
        (row) => {
          const belongsToMeal =
            Boolean(
              row.serviceId ||
              row.dayLabel ||
              row.mealLabel,
            ) &&
            getMenuServiceKey(
              row,
            ) ===
              group.serviceKey;

          if (
            belongsToMeal &&
            controlledRoles.has(
              row.role,
            ) &&
            !row.autoDishAssignment &&
            !row.autoStationHelper
          ) {
            return {
              ...row,
              quantity: 0,
            };
          }

          return row;
        },
      );

    recommendations.forEach(
      (recommendation) => {
        const index =
          rows.findIndex(
            (row) =>
              !row.autoDishAssignment &&
              !row.autoStationHelper &&
              row.role ===
                recommendation.role &&
              Boolean(
                row.serviceId ||
                row.dayLabel ||
                row.mealLabel,
              ) &&
              getMenuServiceKey(
                row,
              ) ===
                group.serviceKey,
          );

        const defaultRate =
          specialistRate(
            recommendation.rateRole,
          );

        if (index >= 0) {
          rows[index] = {
            ...rows[index],

            quantity:
              recommendation.quantity,

            rate:
              Number(
                rows[index].rate,
              ) > 0
                ? rows[index].rate
                : defaultRate,

            rateMode:
              rows[index]
                .rateMode ??
              'PER_MEAL',
          };

          return;
        }

        rows.push({
          id:
            uid(
              'manpower_service',
            ),

          role:
            recommendation.role,

          quantity:
            recommendation.quantity,

          rate:
            defaultRate,

          rateMode:
            'PER_MEAL',

          serviceId:
            group.serviceId,

          dayLabel:
            group.dayLabel,

          mealLabel:
            group.mealLabel,

          servicePax:
            group.servicePax,
        });
      },
    );

    setShowUnusedRoles(
      true,
    );

    persistRows(
      rows,
    );
  }

  function updateRow(
    id: string,
    patch: Partial<ManpowerRow>,
  ) {
    if (!work) return;

    persistRows(
      work.manpower.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    );
  }

  function addRole(group: ManpowerGroup) {
    if (!work) return;

    setShowUnusedRoles(true);
    setExpandedFunctionIds((current) => (
      current.includes(group.serviceKey)
        ? current
        : [...current, group.serviceKey]
    ));

    persistRows([
      ...work.manpower,
      {
        id: uid('manpower'),
        role: 'New Role',
        quantity: 0,
        rate: 0,
        ...(group.serviceKey !== 'general'
          ? {
              serviceId: group.serviceId,
              dayLabel: group.dayLabel,
              mealLabel: group.mealLabel,
              servicePax: group.servicePax,
            }
          : {}),
      },
    ]);
  }

  function addDishManpower(
    group: ManpowerGroup,
    dish: MenuItem,
  ) {
    if (!work) return;

    setShowUnusedRoles(true);

    setExpandedFunctionIds(
      (current) =>
        current.includes(
          group.serviceKey,
        )
          ? current
          : [
              ...current,
              group.serviceKey,
            ],
    );

    persistRows([
      ...work.manpower,
      {
        id: uid(
          'manpower_dish',
        ),

        role: 'Cook',

        quantity: 1,

        rate:
          specialistRate(
            'Cook',
          ),

        rateMode:
          'PER_MEAL',

        assignedDishIds: [
          dish.id,
        ],

        serviceId:
          group.serviceId,

        dayLabel:
          group.dayLabel,

        mealLabel:
          group.mealLabel,

        servicePax:
          group.servicePax,
      },
    ]);
  }


  function removeRole(row: ManpowerRow) {
    if (!work) return;
    if (
      (Number(row.quantity) > 0 || Number(row.rate) > 0) &&
      !window.confirm(`Remove ${row.role || 'this role'} from the manpower plan?`)
    ) {
      return;
    }

    persistRows(work.manpower.filter((item) => item.id !== row.id));
  }

  function clearFunction(group: ManpowerGroup) {
    if (!work || !group.rows.some((row) => Number(row.quantity) > 0)) return;
    if (!window.confirm(`Clear all staff quantities for ${group.mealLabel}?`)) return;

    persistRows(
      work.manpower.map((row) =>
        group.rows.some((groupRow) => groupRow.id === row.id)
          ? { ...row, quantity: 0 }
          : row,
      ),
    );
  }

  function resetRows() {
    if (!work) return;

    if (
      !confirm(
        'Reset all function-wise manpower quantities and rates to defaults?',
      )
    ) {
      return;
    }

    const functions = getFunctions(work.menu);
    persistRows(
      functions.length
        ? functions.flatMap(createFunctionDefaults)
        : defaultManpower.map((row) => ({ ...row })),
    );
  }

  function continueToExtraCost() {
    if (!missingRateCount) {
      router.push('/app/extra-cost');
      return;
    }

    const firstMissingRate = document.querySelector<HTMLInputElement>(
      '.manpower-rate-input.is-missing input',
    );
    const functionCard = firstMissingRate?.closest('details');
    const serviceId = functionCard?.dataset.functionId;
    if (serviceId) {
      setExpandedFunctionIds((current) => (
        current.includes(serviceId) ? current : [...current, serviceId]
      ));
    }
    window.requestAnimationFrame(() => {
      firstMissingRate?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstMissingRate?.focus({ preventScroll: true });
    });
  }

  return (
    <AppShell
      title="Manpower"
      subtitle="Step 2 of 6: plan every staff role function-wise"
    >
      <section className="content-grid manpower-page">
        <div className="manpower-overview manpower-overview-v2">
          <div className="manpower-overview-copy">
            <span className="page-eyebrow">Staffing plan</span>
            <h2>Build the right team for every function</h2>
            <p>Choose the number of people for each role, then add their per-person rate. Your costing updates automatically.</p>
            <div className="manpower-progress-row">
              <div className="manpower-progress-track" aria-hidden="true">
                <i style={{ width: `${manpowerGroups.length ? (plannedFunctionCount / manpowerGroups.length) * 100 : 0}%` }} />
              </div>
              <span>{plannedFunctionCount} of {manpowerGroups.length} functions started</span>
            </div>
          </div>
          <div className="manpower-overview-total">
            <span>Total manpower cost</span>
            <b>{money(manpowerTotal)}</b>
            <small>Included in final costing</small>
          </div>
          <div className="manpower-health" aria-label="Manpower planning status">
            <span><b>{peopleTotal}</b> staff assignments</span>
            <span><b>{activeRoleCount}</b> active roles</span>
            <span><b>{result.totalCovers}</b> meal covers</span>
            <span className={missingRateCount ? 'needs-attention' : 'is-complete'}>
              <b>{missingRateCount}</b> {missingRateCount === 1 ? 'rate needs attention' : 'rates need attention'}
            </span>
          </div>
        </div>

        <div className="glass-card manpower-planner-card">
          <div className="section-head manpower-planner-heading">
            <div>
              <div className="section-kicker">Function-wise Planning</div>
              <h2>Manpower by Function</h2>
              <p className="muted">
                Specialist cooks are assigned automatically from the menu.
                Review people and rates, then add service staff as needed.
              </p>
            </div>
            <div className="manpower-planner-controls">
              <button className="ghost-button" type="button" onClick={() => setShowUnusedRoles((current) => !current)}>
                {showUnusedRoles ? 'Show active roles only' : 'Show all role templates'}
              </button>
            </div>
          </div>

          <div className="manpower-meal-selector">
            <div className="manpower-meal-selector-head">
              <div>
                <span className="section-kicker">
                  Event Meals
                </span>

                <h3>
                  Select function to plan
                </h3>
              </div>

              <span className="manpower-meal-selector-count">
                {manpowerGroups.length} functions
              </span>
            </div>

            <div className="manpower-meal-tabs">
              <button
                type="button"
                className={`manpower-meal-tab ${
                  selectedFunctionId === 'all'
                    ? 'is-active'
                    : ''
                }`}
                onClick={() => {
                  setSelectedFunctionId('all');
                }}
              >
                <span className="manpower-meal-tab-icon">
                  ☰
                </span>

                <span>
                  <b>All Meals</b>
                  <small>
                    Complete event
                  </small>
                </span>
              </button>

              {manpowerGroups
                .filter(
                  (group) =>
                    group.serviceKey !== 'general',
                )
                .map((group) => {
                  const activeStaff =
                    group.rows.reduce(
                      (sum, row) =>
                        sum +
                        Math.max(
                          0,
                          Number(row.quantity) || 0,
                        ),
                      0,
                    );

                  const autoSpecialists =
                    group.rows.filter(
                      (row) =>
                        (
                          row.autoDishAssignment ||
                          row.autoStationHelper
                        ) &&
                        Number(row.quantity) > 0,
                    ).length;

                  const mealDishCount =
                    work.menu.filter(
                      (dish) =>
                        getMenuServiceKey(
                          dish,
                        ) ===
                        group.serviceKey,
                    ).length;

                  return (
                    <button
                      key={group.serviceKey}
                      type="button"
                      className={`manpower-meal-tab ${
                        selectedFunctionId ===
                        group.serviceKey
                          ? 'is-active'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedFunctionId(group.serviceKey);

                        setExpandedFunctionIds(
                          (current) =>
                            current.includes(
                              group.serviceKey,
                            )
                              ? current
                              : [
                                  ...current,
                                  group.serviceKey,
                                ],
                        );
                      }}
                    >
                      <span className="manpower-meal-tab-icon">
                        {group.mealLabel
                          .toLowerCase()
                          .includes('breakfast')
                          ? '☕'
                          : group.mealLabel
                              .toLowerCase()
                              .includes('lunch')
                            ? '🍽'
                            : group.mealLabel
                                .toLowerCase()
                                .includes('tea')
                              ? '🫖'
                              : group.mealLabel
                                  .toLowerCase()
                                  .includes('dinner')
                                ? '🌙'
                                : group.mealLabel
                                    .toLowerCase()
                                    .includes('reception')
                                  ? '✨'
                                  : '🍴'}
                      </span>

                      <span className="manpower-meal-tab-copy">
                        {group.dayLabel ? (
                          <small>
                            {group.dayLabel}
                          </small>
                        ) : null}

                        <b>
                          {group.mealLabel}
                        </b>

                        <em>
                          {group.servicePax > 0
                            ? `${group.servicePax} members`
                            : 'Pax not set'}

                          {mealDishCount > 0
                            ? ` · ${mealDishCount} dishes`
                            : ''}

                          {activeStaff > 0
                            ? ` · ${activeStaff} staff`
                            : ''}

                          {autoSpecialists > 0
                            ? ` · ${autoSpecialists} auto`
                            : ''}
                        </em>
                      </span>
                    </button>
                  );
                })}
            </div>

            {selectedMealGroup ? (
              <div className="manpower-selected-meal">
                <div>
                  <span>
                    Currently planning
                  </span>

                  <b>
                    {[
                      selectedMealGroup.dayLabel,
                      selectedMealGroup.mealLabel,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </b>
                </div>

                {selectedMealGroup.servicePax > 0 ? (
                  <strong>
                    {selectedMealGroup.servicePax}
                    {' '}members
                  </strong>
                ) : null}
              </div>
            ) : (
              <div className="manpower-selected-meal is-all">
                <div>
                  <span>
                    Currently viewing
                  </span>

                  <b>
                    All Event Meals
                  </b>
                </div>

                <strong>
                  {manpowerGroups.length}
                  {' '}functions
                </strong>
              </div>
            )}
          </div>

          <div className="manpower-auto-guide">
            <div className="manpower-auto-guide-icon">
              ⚡
            </div>

            <div>
              <b>
                Automatic specialist assignment
              </b>

              <span>
                Farsan · Starter · Juice · Chinese · Chaat · Italian · Indian Bread
              </span>
            </div>

            <small>
              1 dish = 1 specialist
            </small>
          </div>

          <div className="manpower-groups">
            {visibleManpowerGroups.map((group) => {
              const groupPeople = group.rows.reduce(
                (sum, row) =>
                  sum + Math.max(0, Number(row.quantity) || 0),
                0,
              );
              const groupCost =
                group.rows.reduce(
                  (sum, row) =>
                    sum +
                    manpowerBillableCost(
                      row,
                      work.manpower,
                    ),
                  0,
                );
              const activeRows = group.rows.filter((row) => Number(row.quantity) > 0);
              const groupMissingRates = activeRows.filter((row) => !(Number(row.rate) > 0)).length;
              const autoAssignedRows =
                activeRows.filter(
                  (row) =>
                    (
                      row.autoDishAssignment ||
                      row.autoStationHelper
                    ),
                );

              const visibleRows =
                (
                  showUnusedRoles
                    ? group.rows
                    : activeRows
                )
                  .slice()
                  .sort(
                    (a, b) => {
                      const autoDifference =
                        Number(
                          Boolean(
                            b.autoDishAssignment ||
                            b.autoStationHelper,
                          ),
                        ) -
                        Number(
                          Boolean(
                            a.autoDishAssignment ||
                            a.autoStationHelper,
                          ),
                        );

                      if (autoDifference) {
                        return autoDifference;
                      }

                      const activeDifference =
                        Number(b.quantity > 0) -
                        Number(a.quantity > 0);

                      if (activeDifference) {
                        return activeDifference;
                      }

                      return a.role.localeCompare(
                        b.role,
                      );
                    },
                  );

              /*
               * A cook should only see dishes belonging
               * to the same function.
               */
              const groupDishes =
                group.serviceKey ===
                'general'
                  ? work.menu
                  : work.menu.filter(
                      (dish) =>
                        getMenuServiceKey(
                          dish,
                        ) ===
                        group.serviceKey,
                    );

              const serviceStaffPlan =
                serviceStaffRecommendation(
                  group.serviceStyle,
                  group.servicePax,
                );

              return (
                <details
                  className="manpower-function-card"
                  key={group.serviceKey}
                  data-function-id={group.serviceKey}
                  open={expandedFunctionIds.includes(group.serviceKey)}
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setExpandedFunctionIds((current) => (
                      isOpen
                        ? current.includes(group.serviceKey)
                          ? current
                          : [...current, group.serviceKey]
                        : current.filter((serviceId) => serviceId !== group.serviceKey)
                    ));
                  }}
                >
                  <summary>
                    <div className="manpower-function-title">
                      {group.dayLabel ? (
                        <span className="section-kicker">
                          {group.dayLabel}
                        </span>
                      ) : null}
                      <h3>{group.mealLabel}</h3>
                      <small className="manpower-function-progress">
                        {activeRows.length
                          ? `${activeRows.length} active role${activeRows.length === 1 ? '' : 's'} · ${groupPeople} staff${autoAssignedRows.length ? ` · ${autoAssignedRows.length} auto specialist${autoAssignedRows.length === 1 ? '' : 's'}` : ''}`
                          : 'Not started · choose a role below'}
                      </small>
                    </div>
                    <div className="manpower-function-meta">
                      {group.servicePax > 0 ? (
                        <span className="badge green">
                          {group.servicePax} members
                        </span>
                      ) : null}
                      {groupMissingRates ? (
                        <span className="manpower-function-status needs-attention">{groupMissingRates} missing {groupMissingRates === 1 ? 'rate' : 'rates'}</span>
                      ) : activeRows.length ? (
                        <span className="manpower-function-status is-complete">Ready</span>
                      ) : (
                        <span className="manpower-function-status">Not started</span>
                      )}
                      <span className="manpower-function-cost">{money(groupCost)}</span>
                    </div>
                  </summary>

                  {group.serviceKey !== 'general' ? (
                    <div className="manpower-service-style-panel">
                      <div className="manpower-service-style-copy">
                        <span className="section-kicker">
                          Service Team
                        </span>

                        <b>
                          Smart service staffing
                        </b>

                        <small>
                          Choose the service format, then auto-fill staff from pax.
                        </small>
                      </div>

                      <div className="manpower-service-style-controls">
                        <select
                          className="input"
                          value={
                            group.serviceStyle
                          }
                          onChange={(event) =>
                            updateServiceStyle(
                              group,
                              event.target
                                .value as ServiceStyle,
                            )
                          }
                        >
                          <option value="BUFFET">
                            Buffet
                          </option>

                          <option value="TABLE_SERVICE">
                            Table Service
                          </option>

                          <option value="LIVE_COUNTER">
                            Live Counter
                          </option>

                          <option value="PACKED_MEAL">
                            Packed Meal
                          </option>
                        </select>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            applyServiceStaffRecommendation(
                              group,
                            )
                          }
                        >
                          ⚡ Auto Fill Service Staff
                        </button>
                      </div>

                      <div className="manpower-service-recommendations">
                        <span>
                          {serviceStyleLabel(
                            group.serviceStyle,
                          )}
                        </span>

                        {serviceStaffPlan.length ? (
                          serviceStaffPlan.map(
                            (item) => (
                              <b
                                key={
                                  item.role
                                }
                              >
                                {item.role}
                                {' × '}
                                {
                                  item.quantity
                                }
                              </b>
                            ),
                          )
                        ) : (
                          <small>
                            Set pax to calculate staff.
                          </small>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {group.serviceKey !== 'general' ? (
                    <div className="manpower-meal-menu">
                      <div className="manpower-meal-menu-head">
                        <div>
                          <span className="section-kicker">
                            Menu
                          </span>

                          <b>
                            {groupDishes.length}
                            {' '}
                            {groupDishes.length === 1
                              ? 'dish'
                              : 'dishes'}
                          </b>
                        </div>

                        <small>
                          Used for manpower assignment
                        </small>
                      </div>

                      {groupDishes.length ? (
                        <div className="manpower-meal-menu-categories">
                          {Array.from(
                            new Set(
                              groupDishes.map(
                                (dish) =>
                                  dish.category ||
                                  'Other',
                              ),
                            ),
                          ).map(
                            (category) => {
                              const categoryDishes =
                                groupDishes.filter(
                                  (dish) =>
                                    (
                                      dish.category ||
                                      'Other'
                                    ) ===
                                    category,
                                );

                              return (
                                <div
                                  key={category}
                                  className="manpower-menu-category"
                                >
                                  <span className="manpower-menu-category-name">
                                    {category}
                                  </span>

                                  <div className="manpower-menu-dish-list">
                                    {categoryDishes.map(
                                      (dish) => {
                                        const dishRows =
                                          group.rows.filter(
                                            (row) =>
                                              Array.isArray(
                                                row.assignedDishIds,
                                              ) &&
                                              row.assignedDishIds.includes(
                                                dish.id,
                                              ) &&
                                              Number(
                                                row.quantity,
                                              ) > 0,
                                          );

                                        const dishPeople =
                                          dishRows.reduce(
                                            (sum, row) =>
                                              sum +
                                              Math.max(
                                                0,
                                                Number(
                                                  row.quantity,
                                                ) || 0,
                                              ),
                                            0,
                                          );

                                        return (
                                          <details
                                            key={dish.id}
                                            className="manpower-dish-manpower-card"
                                          >
                                            <summary className="manpower-menu-dish-chip">
                                              <span>
                                                {dish.name}
                                              </span>

                                              <small>
                                                {dishPeople > 0
                                                  ? `${dishPeople} staff`
                                                  : 'Select'}
                                              </small>
                                            </summary>

                                            <div className="manpower-dish-manpower-list">
                                              {dishRows.length ? (
                                                dishRows.map(
                                                  (row) =>
                                                    (
                                                      row.autoDishAssignment ||
                                                      row.autoStationHelper
                                                    ) ? (
                                                      <div
                                                        key={row.id}
                                                        className="manpower-dish-manpower-row"
                                                      >
                                                        <div>
                                                          <b>
                                                            {row.role}
                                                          </b>

                                                          <small>
                                                            {row.quantity}
                                                            {' '}
                                                            person
                                                            {Number(
                                                              row.quantity,
                                                            ) === 1
                                                              ? ''
                                                              : 's'}

                                                            {' · Automatic'}
                                                          </small>
                                                        </div>

                                                        <strong>
                                                          {money(
                                                            rowTotal(
                                                              row,
                                                            ),
                                                          )}
                                                        </strong>
                                                      </div>
                                                    ) : (
                                                      <div
                                                        key={row.id}
                                                        className="manpower-dish-inline-editor"
                                                      >
                                                        <div className="manpower-dish-field">
                                                          <small>
                                                            Role
                                                          </small>

                                                          <input
                                                            className="input"
                                                            value={
                                                              row.role
                                                            }
                                                            onChange={(
                                                              event,
                                                            ) =>
                                                              updateRow(
                                                                row.id,
                                                                {
                                                                  role:
                                                                    event
                                                                      .target
                                                                      .value,
                                                                },
                                                              )
                                                            }
                                                          />
                                                        </div>

                                                        <div className="manpower-dish-field">
                                                          <small>
                                                            People
                                                          </small>

                                                          <QuantityControl
                                                            row={
                                                              row
                                                            }
                                                            onChange={(
                                                              quantity,
                                                            ) =>
                                                              updateRow(
                                                                row.id,
                                                                {
                                                                  quantity,
                                                                },
                                                              )
                                                            }
                                                          />
                                                        </div>

                                                        <div className="manpower-dish-field">
                                                          <small>
                                                            Rate / person
                                                          </small>

                                                          <label className="manpower-rate-input">
                                                            <span>
                                                              ₹
                                                            </span>

                                                            <input
                                                              type="number"
                                                              min="0"
                                                              step="1"
                                                              value={
                                                                row.rate ||
                                                                ''
                                                              }
                                                              onChange={(
                                                                event,
                                                              ) =>
                                                                updateRow(
                                                                  row.id,
                                                                  {
                                                                    rate:
                                                                      Math.max(
                                                                        0,
                                                                        Number(
                                                                          event
                                                                            .target
                                                                            .value,
                                                                        ) ||
                                                                          0,
                                                                      ),
                                                                  },
                                                                )
                                                              }
                                                              placeholder="Rate"
                                                            />
                                                          </label>
                                                        </div>

                                                        <div className="manpower-dish-inline-total">
                                                          <small>
                                                            Total
                                                          </small>

                                                          <strong>
                                                            {money(
                                                              rowTotal(
                                                                row,
                                                              ),
                                                            )}
                                                          </strong>
                                                        </div>

                                                        <button
                                                          type="button"
                                                          className="manpower-remove-button"
                                                          onClick={() =>
                                                            removeRole(
                                                              row,
                                                            )
                                                          }
                                                        >
                                                          Remove
                                                        </button>
                                                      </div>
                                                    ),
                                                )
                                              ) : (
                                                <small className="muted">
                                                  No manpower assigned to this dish yet.
                                                </small>
                                              )}

                                              <button
                                                type="button"
                                                className="secondary-button manpower-dish-add-button"
                                                onClick={() =>
                                                  addDishManpower(
                                                    group,
                                                    dish,
                                                  )
                                                }
                                              >
                                                + Add Manpower
                                              </button>
                                            </div>
                                          </details>
                                        );
                                      },
                                    )}
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      ) : (
                        <span className="muted">
                          No dishes in this meal.
                        </span>
                      )}
                    </div>
                  ) : null}

                  <div className={`manpower-function-guidance ${groupMissingRates ? 'needs-attention' : ''}`}>
                    {groupMissingRates
                      ? `Add a rate for ${groupMissingRates} active ${groupMissingRates === 1 ? 'role' : 'roles'} to complete this function.`
                      : activeRows.length
                        ? 'This function is costed. You can still adjust people or rates below.'
                        : 'Start with a role below. Use + to add people, then enter the rate per person.'}
                  </div>

                  {visibleRows.length ? (
                    <>
                      <div className="table-wrap manpower-table-wrap">
                        <table className="manpower-table">
                          <thead>
                            <tr>
                              <th>Staff role</th>
                              <th>Dish responsibility</th>
                              <th>People</th>
                              <th>Rate / person</th>
                              <th>Rate basis</th>
                              <th>Role total</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.map((row) => (
                              <tr key={row.id} className={Number(row.quantity) > 0 ? 'is-active' : ''}>
                                <td>
                                  {(
                                    row.autoDishAssignment ||
                                    row.autoStationHelper
                                  ) ? (
                                    <div className="manpower-auto-role">
                                      <span className="manpower-auto-role-icon">
                                        👨‍🍳
                                      </span>

                                      <div>
                                        <b>
                                          {row.role}
                                        </b>

                                        <small>
                                          {row.autoStationHelper
                                            ? 'Auto station helper'
                                            : 'Auto specialist'}
                                        </small>
                                      </div>
                                    </div>
                                  ) : (
                                    <input
                                      className="input manpower-role-input"
                                      value={row.role}
                                      onChange={(event) =>
                                        updateRow(
                                          row.id,
                                          {
                                            role:
                                              event.target.value,
                                          },
                                        )
                                      }
                                      aria-label="Manpower role"
                                    />
                                  )}
                                </td>

                                <td>
                                  <DishAssignmentControl
                                    row={row}
                                    dishes={groupDishes}
                                    onChange={(assignedDishIds) =>
                                      updateRow(
                                        row.id,
                                        {
                                          assignedDishIds,
                                        },
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <QuantityControl row={row} onChange={(quantity) => updateRow(row.id, { quantity })} />
                                </td>
                                <td>
                                  <div className="manpower-rate-field">
                                    <label className={`manpower-rate-input ${Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? 'is-missing' : ''}`}>
                                      <span aria-hidden="true">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        inputMode="decimal"
                                        value={row.rate || ''}
                                        onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })}
                                        placeholder="Add rate"
                                        aria-label={`Rate for ${row.role}`}
                                      />
                                    </label>
                                    {Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? <small>Rate required</small> : null}
                                  </div>
                                </td>
                                <td>
                                  <RateModeControl
                                    row={row}
                                    onChange={(patch) =>
                                      updateRow(
                                        row.id,
                                        patch,
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <BilledManpowerTotal
                                    row={row}
                                    rows={work.manpower}
                                  />
                                </td>
                                <td>
                                  {(
                                    row.autoDishAssignment ||
                                    row.autoStationHelper
                                  ) ? (
                                    <span className="manpower-auto-status">
                                      Automatic
                                    </span>
                                  ) : (
                                    <button
                                      className="manpower-remove-button"
                                      type="button"
                                      onClick={() =>
                                        removeRole(row)
                                      }
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="manpower-role-cards">
                        {visibleRows.map((row) => (
                          <article className={`manpower-role-card ${Number(row.quantity) > 0 ? 'is-active' : ''}`} key={row.id}>
                            <div className="manpower-role-card-heading">
                              {(
                                row.autoDishAssignment ||
                                row.autoStationHelper
                              ) ? (
                                <div className="manpower-auto-role">
                                  <span className="manpower-auto-role-icon">
                                    👨‍🍳
                                  </span>

                                  <div>
                                    <b>{row.role}</b>
                                    <small>
                                      {row.autoStationHelper
                                        ? 'Auto station helper'
                                        : 'Auto specialist'}
                                    </small>
                                  </div>
                                </div>
                              ) : (
                                <input
                                  className="input manpower-role-input"
                                  value={row.role}
                                  onChange={(event) =>
                                    updateRow(
                                      row.id,
                                      {
                                        role:
                                          event.target.value,
                                      },
                                    )
                                  }
                                  aria-label="Manpower role"
                                />
                              )}

                              {(
                                row.autoDishAssignment ||
                                row.autoStationHelper
                              ) ? (
                                <span className="manpower-auto-status">
                                  AUTO
                                </span>
                              ) : (
                                <button
                                  className="manpower-remove-button"
                                  type="button"
                                  onClick={() =>
                                    removeRole(row)
                                  }
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {canAssignDishes(row.role) ? (
                              <div className="field manpower-mobile-dish-field">
                                <label>
                                  Assigned dishes
                                </label>

                                <DishAssignmentControl
                                  row={row}
                                  dishes={groupDishes}
                                  onChange={(assignedDishIds) =>
                                    updateRow(
                                      row.id,
                                      {
                                        assignedDishIds,
                                      },
                                    )
                                  }
                                />
                              </div>
                            ) : null}

                            <div className="manpower-role-card-fields">
                              <div className="field">
                                <label htmlFor={`quantity-${row.id}`}>People</label>
                                <QuantityControl row={row} onChange={(quantity) => updateRow(row.id, { quantity })} />
                              </div>
                              <div className="field">
                                <label htmlFor={`rate-${row.id}`}>Rate / person</label>
                                <label className={`manpower-rate-input ${Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? 'is-missing' : ''}`} htmlFor={`rate-${row.id}`}>
                                  <span aria-hidden="true">₹</span>
                                  <input id={`rate-${row.id}`} type="number" min="0" step="1" inputMode="decimal" value={row.rate || ''} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} placeholder="Add rate" />
                                </label>
                                {Number(row.quantity) > 0 && !(Number(row.rate) > 0) ? <small className="manpower-rate-error">Rate required</small> : null}
                              </div>

                              <div className="field">
                                <label>
                                  Rate basis
                                </label>

                                <RateModeControl
                                  row={row}
                                  onChange={(patch) =>
                                    updateRow(
                                      row.id,
                                      patch,
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="manpower-role-card-total">
                              <span>
                                Billable total
                              </span>

                              <BilledManpowerTotal
                                row={row}
                                rows={work.manpower}
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="manpower-empty-roster">
                      <b>No active staff roles</b>
                      <span>Show the role templates to start planning this function.</span>
                      <button className="ghost-button" type="button" onClick={() => setShowUnusedRoles(true)}>Show role templates</button>
                    </div>
                  )}

                  <div className="manpower-function-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => addRole(group)}
                    >
                      Add custom role
                    </button>
                    {groupPeople > 0 ? <button className="ghost-button" type="button" onClick={() => clearFunction(group)}>Clear function quantities</button> : null}
                  </div>
                </details>
              );
            })}
          </div>

          <div className="manpower-reset-row">
            <span>Need a clean slate? This restores the standard role templates.</span>
            <button
              className="ghost-button"
              type="button"
              onClick={resetRows}
            >
              Reset All Function Staff
            </button>
          </div>
        </div>

        <div className="action-row page-actions manpower-page-actions">
          <div className={`manpower-save-state ${missingRateCount ? 'needs-attention' : ''}`}>
            <i aria-hidden="true" />
            <span>{missingRateCount ? `${missingRateCount} missing ${missingRateCount === 1 ? 'rate' : 'rates'} before you continue` : 'All changes saved automatically'}</span>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={continueToExtraCost}
          >
            {missingRateCount ? `Review ${missingRateCount} missing ${missingRateCount === 1 ? 'rate' : 'rates'}` : 'Continue to Extra Cost'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/event')}
          >
            Back to Event
          </button>
        </div>
      </section>
    </AppShell>
  );
}
