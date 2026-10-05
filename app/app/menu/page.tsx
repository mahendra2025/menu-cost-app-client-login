'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  flushDraftToServer,
  flushWorkSave,
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';

import type {
  MenuItem,
  Session,
  WorkState,
} from '../../../lib/types';

import {
  CATEGORIES,
} from '../../../lib/menuCategories';

import {
  sortMenuItemsByCategoryPriority,
} from '../../../lib/menuCategoryPriority';

import {
  downloadMenuCreationPdf,
} from '../../../lib/menuCreationPdf';

type DishOption = {
  name: string;
  category: string;
  subcategory?: string;
  rate: number;
  servingQuantity?: number;
  servingUnit?: string;
  pieceWeightGrams?: number;
  hasRecipe?: boolean;
  aliases?: string[];
  source?: 'global' | 'tenant';
};

type MenuFunction = {
  key: string;
  serviceId: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  items: MenuItem[];
};

type FunctionDraft = {
  id: string;
  dayLabel: string;
  mealLabel: string;
  pax: string;
};

type MenuDayGroup = {
  key: string;
  label: string;
  functions: MenuFunction[];
};

type CustomDishDraft = {
  name: string;
  category: string;
};

type EditableEventKey =
  | 'clientName'
  | 'eventName'
  | 'eventDate'
  | 'venue'
  | 'city'
  | 'functionType'
  | 'pax';

function normalize(
  value: unknown,
) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

type MenuStation = {
  key: string;
  label: string;
  categories: string[];
};

const MENU_STATIONS: MenuStation[] = [
  { key: 'welcome-drinks', label: 'Welcome Drinks Station', categories: ['Welcome Drink', 'Mocktail'] },
  { key: 'starters', label: 'Starters Station', categories: ['Starter', 'Snacks'] },
  { key: 'soup', label: 'Soup Station', categories: ['Soup'] },
  { key: 'sweets', label: 'Sweets Station', categories: ['Sweet'] },
  { key: 'farsan', label: 'Farsan Station', categories: ['Farsan'] },
  { key: 'vegetable', label: 'Vegetable Station', categories: ['Sabji', 'Paneer', 'Main Course'] },
  { key: 'indian-bread', label: 'Indian Bread Station', categories: ['Bread', 'Tandoor'] },
  { key: 'dal-rice', label: 'Dal & Rice Station', categories: ['Dal / Kadhi', 'Rice'] },
  { key: 'salad', label: 'Salad Station', categories: ['Salad', 'Raita'] },
  { key: 'papad', label: 'Papad Station', categories: ['Papad'] },
  { key: 'achar', label: 'Achar Station', categories: ['Pickle', 'Condiments'] },
  { key: 'chaat', label: 'Chaat Station', categories: ['Chaat', 'Street Food'] },
  { key: 'chinese', label: 'Chinese Station', categories: ['Chinese'] },
  { key: 'south-indian', label: 'South Indian Station', categories: ['South Indian'] },
  { key: 'punjabi', label: 'Punjabi Station', categories: ['Punjabi'] },
  { key: 'north-indian', label: 'North Indian Station', categories: ['North Indian'] },
  { key: 'japanese', label: 'Japanese Station', categories: ['Japanese'] },
  { key: 'mexican', label: 'Mexican Station', categories: ['Mexican'] },
  { key: 'thai', label: 'Thai Station', categories: ['Thai'] },
  { key: 'asian', label: 'Asian Station', categories: ['Asian'] },
  { key: 'mongolian', label: 'Mongolian Station', categories: ['Mongolian'] },
  { key: 'dessert', label: 'Dessert Station', categories: ['Dessert', 'Bakery'] },
  { key: 'waffles', label: 'Waffles Station', categories: ['Waffles'] },
  { key: 'party', label: 'Party Station', categories: ['Party'] },
  { key: 'ice-cream', label: 'Ice Cream Station', categories: ['Ice Cream'] },
  { key: 'fruit', label: 'Fruit Station', categories: ['Fruit'] },
  { key: 'beverage', label: 'Beverage Station', categories: ['Beverage'] },
  { key: 'mukhwas', label: 'Mukhwas Station', categories: ['Mukhwas'] },
  { key: 'paan', label: 'Paan Station', categories: ['Paan'] },
];

function stationForCategory(category: string): MenuStation {
  const normalizedCategory = normalize(category);

  const configured = MENU_STATIONS.find((station) =>
    station.categories.some(
      (value) => normalize(value) === normalizedCategory,
    ),
  );

  if (configured) {
    return configured;
  }

  const cleanCategory = String(category || 'Other').trim() || 'Other';

  return {
    key: `other::${normalizedCategory || 'other'}`,
    label: `${cleanCategory} Station`,
    categories: [cleanCategory],
  };
}

function isCustomMenuItem(
  item: MenuItem,
) {
  const reason =
    String(
      item.detectionReason ||
      '',
    ).toLocaleLowerCase(
      'en-IN',
    );

  return Boolean(
    item.detectionSource ===
      'manual' &&
    (
      item.coverageStatus ===
        'NEW_DISH_PENDING' ||
      reason.includes(
        'menu creation',
      ) ||
      reason.includes(
        'custom dish',
      )
    )
  );
}

function functionKey(
  item: MenuItem,
) {
  if (
    item.serviceId?.trim()
  ) {
    return item.serviceId.trim();
  }

  return [
    normalize(
      item.dayLabel,
    ),
    normalize(
      item.mealLabel ||
        'Event Menu',
    ),
  ].join('::');
}

function buildFunctions(
  work: WorkState,
) {
  const map =
    new Map<
      string,
      MenuFunction
    >();

  work.menu
    .filter(
      (item) =>
        item.coverageStatus !==
        'REJECTED',
    )
    .forEach(
      (item) => {
        const key =
          functionKey(item);

        const serviceId =
          item.serviceId?.trim() ||
          key;

        const existing =
          map.get(key);

        if (existing) {
          existing.items.push(
            item,
          );

          existing.pax =
            Math.max(
              existing.pax,
              Number(
                item.servicePax,
              ) || 0,
            );

          return;
        }

        map.set(key, {
          key,
          serviceId,
          dayLabel:
            item.dayLabel?.trim() ||
            work.event.eventDate ||
            '',
          mealLabel:
            item.mealLabel?.trim() ||
            work.event.functionType ||
            'Event Menu',
          pax:
            Math.max(
              0,
              Number(
                item.servicePax,
              ) ||
                Number(
                  work.event.pax,
                ) ||
                0,
            ),
          items: [
            item,
          ],
        });
      },
    );

  return Array.from(
    map.values(),
  ).map(
    (fn) => ({
      ...fn,
      items:
        sortMenuItemsByCategoryPriority(
          fn.items,
        ),
    }),
  );
}

export default function MenuCreationPage() {
  const [
    session,
    setSession,
  ] =
    useState<
      Session | null
    >(null);

  const [
    work,
    setWork,
  ] =
    useState<
      WorkState | null
    >(null);

  const [
    dishCatalog,
    setDishCatalog,
  ] =
    useState<
      DishOption[]
    >([]);

  const [
    loadingCatalog,
    setLoadingCatalog,
  ] =
    useState(true);

  const [
    activeFunctionId,
    setActiveFunctionId,
  ] =
    useState('');

  const [
    emptyFunctions,
    setEmptyFunctions,
  ] =
    useState<
      FunctionDraft[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    category,
    setCategory,
  ] =
    useState('ALL');

  const [
    showFunctionForm,
    setShowFunctionForm,
  ] =
    useState(false);

  const [
    functionDraft,
    setFunctionDraft,
  ] =
    useState<FunctionDraft>({
      id: '',
      dayLabel: '',
      mealLabel: '',
      pax: '',
    });

  const [
    showCustomDish,
    setShowCustomDish,
  ] =
    useState(false);

  const [
    customDish,
    setCustomDish,
  ] =
    useState<
      CustomDishDraft
    >({
      name: '',
      category: 'Other',
    });

  const [
    editingCustomDishId,
    setEditingCustomDishId,
  ] = useState('');

  const [
    customCategories,
    setCustomCategories,
  ] = useState<string[]>([]);

  const [
    showCustomCategoryForm,
    setShowCustomCategoryForm,
  ] = useState(false);

  const [
    newCustomCategoryName,
    setNewCustomCategoryName,
  ] = useState('');

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {
    const current =
      getSession();

    if (!current) {
      window.location.assign(
        '/login',
      );
      return;
    }

    const currentWork =
      loadWork(
        current.tenantId,
      );

    setSession(current);
    setWork(
      currentWork,
    );

    const existing =
      buildFunctions(
        currentWork,
      );

    if (
      existing.length
    ) {
      setActiveFunctionId(
        existing[0]
          .serviceId,
      );
    } else {
      const id =
        uid('service');

      const initial:
        FunctionDraft = {
          id,
          dayLabel:
            currentWork.event
              .eventDate ||
            '',
          mealLabel:
            currentWork.event
              .functionType ||
            'Event Menu',
          pax:
            String(
              Math.max(
                0,
                Number(
                  currentWork.event
                    .pax,
                ) || 0,
              ) ||
              '',
            ),
        };

      setEmptyFunctions([
        initial,
      ]);

      setActiveFunctionId(
        id,
      );
    }

    void fetch(
      '/api/dishes',
      {
        cache:
          'no-store',
      },
    )
      .then(
        async (
          response,
        ) => {
          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                'Could not load Dish Master.',
            );
          }

          const items =
            Array.isArray(
              data.items,
            )
              ? data.items
              : [];

          const cleaned:
            DishOption[] =
            items.flatMap(
              (
                value:
                  unknown,
              ) => {
                if (
                  !value ||
                  typeof value !==
                    'object' ||
                  Array.isArray(
                    value,
                  )
                ) {
                  return [];
                }

                const row =
                  value as
                    Record<
                      string,
                      unknown
                    >;

                const name =
                  String(
                    row.name ||
                      '',
                  ).trim();

                if (!name) {
                  return [];
                }

                return [
                  {
                    name,
                    category:
                      String(
                        row.category ||
                          'Other',
                      ).trim() ||
                      'Other',
                    subcategory:
                      String(
                        row.subcategory ||
                          '',
                      ).trim(),
                    rate:
                      Math.max(
                        0,
                        Number(
                          row.rate,
                        ) || 0,
                      ),
                    servingQuantity:
                      Math.max(
                        0.01,
                        Number(
                          row.servingQuantity,
                        ) || 1,
                      ),
                    servingUnit:
                      String(
                        row.servingUnit ||
                          'serving',
                      ).trim() ||
                      'serving',
                    pieceWeightGrams:
                      Math.max(
                        0,
                        Number(
                          row.pieceWeightGrams,
                        ) || 0,
                      ) ||
                      undefined,
                    hasRecipe:
                      row.hasRecipe ===
                      true,
                    source:
                      String(
                        row.source ||
                          'global',
                      ) ===
                      'tenant'
                        ? 'tenant'
                        : 'global',
                  },
                ];
              },
            );

          setDishCatalog(
            cleaned,
          );
        },
      )
      .catch(
        (
          loadError,
        ) => {
          setError(
            loadError instanceof
            Error
              ? loadError.message
              : 'Could not load Dish Master.',
          );
        },
      )
      .finally(
        () => {
          setLoadingCatalog(
            false,
          );
        },
      );
  }, []);

  const functions =
    useMemo(
      () => {
        if (!work) {
          return [];
        }

        const saved =
          buildFunctions(
            work,
          );

        const savedIds =
          new Set(
            saved.map(
              (fn) =>
                fn.serviceId,
            ),
          );

        const empties =
          emptyFunctions
            .filter(
              (fn) =>
                !savedIds.has(
                  fn.id,
                ),
            )
            .map(
              (
                fn,
              ):
                MenuFunction => ({
                key: fn.id,
                serviceId:
                  fn.id,
                dayLabel:
                  fn.dayLabel,
                mealLabel:
                  fn.mealLabel ||
                  'Event Menu',
                pax:
                  Math.max(
                    0,
                    Number(
                      fn.pax,
                    ) || 0,
                  ),
                items: [],
              }),
            );

        return [
          ...saved,
          ...empties,
        ];
      },
      [
        work,
        emptyFunctions,
      ],
    );

  const dayGroups =
    useMemo(
      () => {
        const groups =
          new Map<
            string,
            MenuDayGroup
          >();

        functions.forEach(
          (fn) => {
            const rawLabel =
              fn.dayLabel?.trim() ||
              work?.event
                .eventDate ||
              'Event Day';

            const key =
              normalize(
                rawLabel,
              ) ||
              'event-day';

            const existing =
              groups.get(key);

            if (existing) {
              existing.functions.push(
                fn,
              );
              return;
            }

            groups.set(key, {
              key,
              label:
                rawLabel,
              functions: [
                fn,
              ],
            });
          },
        );

        return Array.from(
          groups.values(),
        );
      },
      [
        functions,
        work?.event
          .eventDate,
      ],
    );

  const totalDays =
    dayGroups.length;

  useEffect(() => {
    if (
      functions.length &&
      !functions.some(
        (fn) =>
          fn.serviceId ===
          activeFunctionId,
      )
    ) {
      setActiveFunctionId(
        functions[0]
          .serviceId,
      );
    }
  }, [
    functions,
    activeFunctionId,
  ]);

  const activeFunction =
    functions.find(
      (fn) =>
        fn.serviceId ===
        activeFunctionId,
    ) ||
    functions[0] ||
    null;

  const customCategoryOptions =
    useMemo(
      () =>
        Array.from(
          new Map(
            [
              ...CATEGORIES,
              ...dishCatalog.map(
                (dish) =>
                  dish.category,
              ),
              ...(work?.menu || []).map(
                (dish) =>
                  dish.category,
              ),
              ...customCategories,
            ]
              .map(
                (value) =>
                  String(
                    value ||
                    '',
                  )
                    .replace(
                      /\s+/g,
                      ' ',
                    )
                    .trim(),
              )
              .filter(Boolean)
              .map(
                (value) => [
                  normalize(
                    value,
                  ),
                  value,
                ],
              ),
          ).values(),
        ).sort(
          (left, right) =>
            left.localeCompare(
              right,
            ),
        ),
      [
        dishCatalog,
        work?.menu,
        customCategories,
      ],
    );

  const activeCustomDishes =
    useMemo(
      () =>
        (
          activeFunction
            ?.items ||
          []
        ).filter(
          isCustomMenuItem,
        ),
      [
        activeFunction,
      ],
    );

  const selectedNameKeys =
    useMemo(
      () =>
        new Set(
          (
            activeFunction
              ?.items ||
            []
          ).map(
            (item) =>
              normalize(
                item.name,
              ),
          ),
        ),
      [
        activeFunction,
      ],
    );

  const stations =
    useMemo(
      () => {
        const configuredKeys =
          new Set(
            MENU_STATIONS.map(
              (station) =>
                station.key,
            ),
          );

        const fallback =
          Array.from(
            new Map(
              [
                ...dishCatalog.map(
                  (dish) =>
                    dish.category,
                ),
                ...(work?.menu || []).map(
                  (dish) =>
                    dish.category,
                ),
              ]
                .map((dishCategory) =>
                  stationForCategory(
                    dishCategory,
                  ),
                )
                .filter(
                  (station) =>
                    !configuredKeys.has(
                      station.key,
                    ),
                )
                .map(
                  (station) => [
                    station.key,
                    station,
                  ] as const,
                ),
            ).values(),
          ).sort(
            (
              left,
              right,
            ) =>
              left.label.localeCompare(
                right.label,
              ),
          );

        return [
          ...MENU_STATIONS,
          ...fallback,
        ];
      },
      [
        dishCatalog,
        work?.menu,
      ],
    );

  const stationMetrics =
    useMemo(
      () => {
        const metrics =
          new Map<
            string,
            {
              available: number;
              selected: number;
            }
          >();

        for (const station of stations) {
          const available =
            dishCatalog.filter(
              (dish) =>
                stationForCategory(
                  dish.category,
                ).key ===
                station.key,
            ).length;

          const selected =
            (
              activeFunction
                ?.items ||
              []
            ).filter(
              (item) =>
                stationForCategory(
                  item.category,
                ).key ===
                station.key,
            ).length;

          metrics.set(
            station.key,
            {
              available,
              selected,
            },
          );
        }

        return metrics;
      },
      [
        stations,
        dishCatalog,
        activeFunction,
      ],
    );

  const activeStationIndex =
    category === 'ALL'
      ? -1
      : stations.findIndex(
          (station) =>
            station.key ===
            category,
        );

  const activeStation =
    activeStationIndex >= 0
      ? stations[
          activeStationIndex
        ]
      : null;

  function moveStation(
    direction: -1 | 1,
  ) {
    if (!stations.length) {
      return;
    }

    const start =
      activeStationIndex >= 0
        ? activeStationIndex
        : direction > 0
          ? -1
          : 0;

    const nextIndex =
      (
        start +
        direction +
        stations.length
      ) %
      stations.length;

    setCategory(
      stations[nextIndex]
        .key,
    );

    setSearch('');
  }

  const visibleDishes =
    useMemo(
      () => {
        const query =
          normalize(
            search,
          );

        return dishCatalog
          .filter(
            (dish) => {
              const matchesCategory =
                category ===
                  'ALL' ||
                stationForCategory(
                  dish.category,
                ).key ===
                  category;

              const matchesSearch =
                !query ||
                normalize(
                  dish.name,
                ).includes(
                  query,
                ) ||
                normalize(
                  dish.category,
                ).includes(
                  query,
                ) ||
                normalize(
                  dish.subcategory,
                ).includes(
                  query,
                );

              return (
                matchesCategory &&
                matchesSearch
              );
            },
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.category.localeCompare(
                right.category,
              ) ||
              left.name.localeCompare(
                right.name,
              ),
          );
      },
      [
        dishCatalog,
        search,
        category,
      ],
    );

  const displayedDishes =
    visibleDishes.slice(
      0,
      120,
    );

  async function updateDishRate(
    itemId: string,
    rawRate: number,
  ) {
    if (!work) {
      return;
    }

    const rate =
      Math.max(
        0,
        Number(rawRate) || 0,
      );

    const nextWork: WorkState = {
      ...work,
      menu:
        work.menu.map(
          (item) =>
            item.id === itemId
              ? {
                  ...item,
                  costPerPlate:
                    rate,
                  costSource:
                    'manual',
                  coverageStatus:
                    rate > 0
                      ? 'COSTED'
                      : 'UNRESOLVED',
                  costQualityStatus:
                    rate > 0
                      ? 'READY'
                      : 'BLOCKED',
                  costConfidence:
                    rate > 0
                      ? 100
                      : 0,
                  rateCoveragePercent:
                    rate > 0
                      ? 100
                      : 0,
                  coverageReason:
                    rate > 0
                      ? 'Manual event rate entered in Event & Menu.'
                      : 'Manual event rate required.',
                  costApprovalStatus:
                    rate > 0
                      ? 'APPROVED'
                      : 'PENDING',
                  costApprovalReason:
                    rate > 0
                      ? 'Manual event rate.'
                      : 'Manual rate required.',
                }
              : item,
        ),
    };

    await persist(
      nextWork,
    );

    setMessage(
      rate > 0
        ? `Dish rate updated to ₹${rate.toLocaleString('en-IN')} / plate.`
        : 'Dish rate cleared.',
    );

    setError('');
  }

  async function persist(
    nextWork: WorkState,
  ) {
    if (!session) {
      return;
    }

    setWork(
      nextWork,
    );

    saveWork(
      session.tenantId,
      nextWork,
    );

    flushWorkSave(
      session.tenantId,
    );

    await flushDraftToServer(
      session.tenantId,
      nextWork,
    );
  }

  function updateEventField(
    key: EditableEventKey,
    value: string | number,
  ) {
    if (!work || !session) {
      return;
    }

    const nextWork: WorkState = {
      ...work,
      event: {
        ...work.event,
        [key]: value,
      },
      updatedAt:
        new Date()
          .toISOString(),
    };

    setWork(nextWork);
    saveWork(
      session.tenantId,
      nextWork,
    );
    flushWorkSave(
      session.tenantId,
    );
  }

  async function commitEventDetails() {
    if (!work) return;
    await persist(work);
    setMessage(
      'Event details saved.',
    );
  }

  function activeMetadata() {
    if (!activeFunction) {
      return null;
    }

    return {
      serviceId:
        activeFunction
          .serviceId,
      dayLabel:
        activeFunction
          .dayLabel,
      mealLabel:
        activeFunction
          .mealLabel,
      pax:
        Math.max(
          0,
          Number(
            activeFunction
              .pax,
          ) || 0,
        ),
    };
  }

  async function toggleDish(
    dish: DishOption,
  ) {
    if (
      !work ||
      !activeFunction
    ) {
      return;
    }

    const metadata =
      activeMetadata();

    if (!metadata) {
      return;
    }

    const key =
      normalize(
        dish.name,
      );

    const exists =
      activeFunction.items.find(
        (item) =>
          normalize(
            item.name,
          ) === key,
      );

    let menu:
      MenuItem[];

    if (exists) {
      menu =
        work.menu.filter(
          (item) =>
            item.id !==
            exists.id,
        );

      setMessage(
        `${dish.name} removed from ${activeFunction.mealLabel}.`,
      );
    } else {
      const item:
        MenuItem = {
          id:
            uid(
              'menu',
            ),
          name:
            dish.name,
          category:
            dish.category,
          costPerPlate:
            dish.rate,
          portionQuantity:
            dish.servingQuantity ||
            1,
          portionBaseQuantity:
            dish.servingQuantity ||
            1,
          portionUnit:
            dish.servingUnit ||
            'serving',
          pieceWeightGrams:
            dish.pieceWeightGrams,
          serviceId:
            metadata.serviceId,
          dayLabel:
            metadata.dayLabel,
          mealLabel:
            metadata.mealLabel,
          servicePax:
            metadata.pax,
          portionPercent:
            100,
          portionMode:
            'AUTO',
          detectionSource:
            'catalog',
          detectionConfidence:
            100,
          detectionReason:
            'Selected manually from Dish Master in Menu Creation.',
          costSource:
            dish.hasRecipe
              ? 'catalog_recipe'
              : 'catalog',
          coverageStatus:
            dish.rate > 0
              ? 'COSTED'
              : 'UNRESOLVED',
          costQualityStatus:
            dish.rate > 0
              ? 'READY'
              : 'BLOCKED',
          costConfidence:
            dish.rate > 0
              ? 100
              : 0,
          rateCoveragePercent:
            dish.rate > 0
              ? 100
              : 0,
          coverageReason:
            dish.hasRecipe
              ? 'Linked to Global Recipe Master.'
              : 'Selected from Dish Master.',
          groceryResponsibility:
            'CATERER',
        };

      menu = [
        ...work.menu,
        item,
      ];

      setEmptyFunctions(
        (current) =>
          current.filter(
            (fn) =>
              fn.id !==
              metadata.serviceId,
          ),
      );

      setMessage(
        `${dish.name} added to ${activeFunction.mealLabel}.`,
      );
    }

    setError('');

    await persist({
      ...work,
      menu,
      updatedAt:
        new Date()
          .toISOString(),
    });
  }

  function openCustomDishCreator() {
    const preferredCategory =
      activeStation
        ?.categories?.[0] ||
      'Other';

    setEditingCustomDishId(
      '',
    );
    setCustomDish({
      name: '',
      category:
        customCategoryOptions.includes(
          preferredCategory,
        )
          ? preferredCategory
          : 'Other',
    });
    setShowCustomCategoryForm(
      false,
    );
    setNewCustomCategoryName(
      '',
    );
    setShowCustomDish(
      true,
    );
    setError('');
  }

  function openCustomDishEditor(
    item: MenuItem,
  ) {
    setEditingCustomDishId(
      item.id,
    );
    setCustomDish({
      name:
        item.name,
      category:
        item.category ||
        'Other',
    });
    setShowCustomCategoryForm(
      false,
    );
    setNewCustomCategoryName(
      '',
    );
    setShowCustomDish(
      true,
    );
    setError('');
  }

  function closeCustomDishModal() {
    setShowCustomDish(
      false,
    );
    setEditingCustomDishId(
      '',
    );
    setShowCustomCategoryForm(
      false,
    );
    setNewCustomCategoryName(
      '',
    );
  }

  function addCustomCategory() {
    const value =
      newCustomCategoryName
        .replace(
          /\s+/g,
          ' ',
        )
        .trim()
        .slice(
          0,
          60,
        );

    if (!value) {
      setError(
        'Enter a category name.',
      );
      return;
    }

    const existing =
      customCategoryOptions.find(
        (item) =>
          normalize(
            item,
          ) ===
          normalize(
            value,
          ),
      );

    const finalValue =
      existing ||
      value;

    if (!existing) {
      setCustomCategories(
        (current) =>
          Array.from(
            new Map(
              [
                ...current,
                finalValue,
              ].map(
                (item) => [
                  normalize(
                    item,
                  ),
                  item,
                ],
              ),
            ).values(),
          ),
      );
    }

    setCustomDish(
      (current) => ({
        ...current,
        category:
          finalValue,
      }),
    );
    setNewCustomCategoryName(
      '',
    );
    setShowCustomCategoryForm(
      false,
    );
    setError('');
  }

  async function editCustomDish() {
    if (
      !work ||
      !activeFunction ||
      !editingCustomDishId
    ) {
      return;
    }

    const currentItem =
      work.menu.find(
        (item) =>
          item.id ===
          editingCustomDishId,
      );

    if (!currentItem) {
      setError(
        'Custom dish could not be found.',
      );
      return;
    }

    const name =
      customDish.name
        .replace(
          /\s+/g,
          ' ',
        )
        .trim();

    const categoryName =
      customDish.category
        .replace(
          /\s+/g,
          ' ',
        )
        .trim() ||
      'Other';

    if (!name) {
      setError(
        'Enter a dish name.',
      );
      return;
    }

    const duplicate =
      activeFunction.items.some(
        (item) =>
          item.id !==
            currentItem.id &&
          normalize(
            item.name,
          ) ===
            normalize(
              name,
            ),
      );

    if (duplicate) {
      setError(
        'Another dish with this name already exists in this function.',
      );
      return;
    }

    const knownDish =
      dishCatalog.find(
        (dish) =>
          normalize(
            dish.name,
          ) ===
          normalize(
            name,
          ),
      );

    if (knownDish) {
      setError(
        'This name already exists in Dish Master. Remove the custom dish and select the Dish Master item instead.',
      );
      return;
    }

    try {
      const response =
        await fetch(
          '/api/dish-suggestions',
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                sourceFileName:
                  `Menu Creation Edit · ${work.event.eventName || work.event.clientName || activeFunction.mealLabel || 'Event'}`,
                candidates: [
                  {
                    name,
                    categoryHint:
                      categoryName,
                  },
                ],
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not update the custom dish review queue.',
        );
      }

      await persist({
        ...work,
        menu:
          work.menu.map(
            (item) =>
              item.id ===
                currentItem.id
                ? {
                    ...item,
                    name,
                    category:
                      categoryName,
                    detectionSource:
                      'manual',
                    detectionConfidence:
                      100,
                    detectionReason:
                      'Custom dish edited in Event & Menu and sent to Admin Unknown Dish Queue.',
                    coverageStatus:
                      item.coverageStatus ||
                      'NEW_DISH_PENDING',
                  }
                : item,
          ),
        updatedAt:
          new Date()
            .toISOString(),
      });

      setCustomCategories(
        (current) =>
          current.some(
            (item) =>
              normalize(
                item,
              ) ===
              normalize(
                categoryName,
              ),
          )
            ? current
            : [
                ...current,
                categoryName,
              ],
      );

      closeCustomDishModal();
      setMessage(
        `${name} updated in ${activeFunction.mealLabel}.`,
      );
      setError('');
    } catch (
      editError
    ) {
      setError(
        editError instanceof
        Error
          ? editError.message
          : 'Could not update the custom dish.',
      );
    }
  }

  async function addCustomDish() {
    if (
      !work ||
      !activeFunction
    ) {
      return;
    }

    const name =
      customDish.name
        .trim()
        .replace(
          /\s+/g,
          ' ',
        );

    if (!name) {
      setError(
        'Enter a dish name.',
      );
      return;
    }

    if (
      selectedNameKeys.has(
        normalize(name),
      )
    ) {
      setError(
        'This dish is already in the selected function.',
      );
      return;
    }

    const knownDish =
      dishCatalog.find(
        (dish) => {
          const key =
            normalize(name);

          return (
            normalize(
              dish.name,
            ) === key ||
            (
              dish.aliases ||
              []
            ).some(
              (alias) =>
                normalize(
                  alias,
                ) === key,
            )
          );
        },
      );

    if (knownDish) {
      await toggleDish(
        knownDish,
      );

      setCustomDish({
        name: '',
        category: 'Other',
      });

      closeCustomDishModal();

      setMessage(
        `${knownDish.name} already exists in Dish Master and was added from the master instead.`,
      );

      return;
    }

    const metadata =
      activeMetadata();

    if (!metadata) {
      return;
    }

    setError('');
    setMessage(
      'Sending new dish to Admin Unknown Dish Queue…',
    );

    try {
      const queueResponse =
        await fetch(
          '/api/dish-suggestions',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                sourceFileName:
                  `Menu Creation · ${work.event.eventName || work.event.clientName || activeFunction.mealLabel || 'Event'}`,
                candidates: [
                  {
                    name,
                    categoryHint:
                      categoryName,
                  },
                ],
              }),
          },
        );

      const queueData =
        await queueResponse
          .json()
          .catch(
            () => ({}),
          );

      if (!queueResponse.ok) {
        throw new Error(
          queueData.error ||
            'Could not send new dish to Admin Unknown Dish Queue.',
        );
      }

      const queued =
        Math.max(
          0,
          Number(
            queueData.queued,
          ) || 0,
        );

      if (!queued) {
        throw new Error(
          'This dish now exists in Dish Master. Refresh Menu Creation and select it from the master.',
        );
      }

      const item:
        MenuItem = {
          id:
            uid('menu'),
          name,
          category:
            categoryName,
          costPerPlate: 0,
          portionQuantity: 1,
          portionBaseQuantity: 1,
          portionUnit:
            'serving',
          serviceId:
            metadata.serviceId,
          dayLabel:
            metadata.dayLabel,
          mealLabel:
            metadata.mealLabel,
          servicePax:
            metadata.pax,
          portionPercent: 100,
          portionMode:
            'AUTO',
          detectionSource:
            'manual',
          detectionConfidence:
            100,
          detectionReason:
            'New dish added in Menu Creation and sent to Admin Unknown Dish Queue.',
          costSource:
            'manual',
          coverageStatus:
            'NEW_DISH_PENDING',
          costQualityStatus:
            'BLOCKED',
          costConfidence: 0,
          rateCoveragePercent: 0,
          coverageReason:
            'Waiting for Super Admin review, Dish Master rate and recipe.',
          groceryResponsibility:
            'CATERER',
        };

      setEmptyFunctions(
        (current) =>
          current.filter(
            (fn) =>
              fn.id !==
              metadata.serviceId,
          ),
      );

      await persist({
        ...work,
        menu: [
          ...work.menu,
          item,
        ],
        updatedAt:
          new Date()
            .toISOString(),
      });

      setCustomCategories(
        (current) =>
          current.some(
            (item) =>
              normalize(
                item,
              ) ===
              normalize(
                categoryName,
              ),
          )
            ? current
            : [
                ...current,
                categoryName,
              ],
      );

      setCustomDish({
        name: '',
        category: 'Other',
      });

      closeCustomDishModal();

      setError('');

      setMessage(
        `${name} added to the menu and sent to Admin Unknown Dish Queue for review.`,
      );
    } catch (
      queueError
    ) {
      setMessage('');

      setError(
        queueError instanceof
        Error
          ? queueError.message
          : 'Could not queue the new dish.',
      );
    }
  }

  function openNewFunction(
    requestedDay?:
      unknown,
  ) {
    const dayLabel =
      typeof requestedDay ===
        'string'
        ? requestedDay
        : '';

    setFunctionDraft({
      id:
        uid('service'),
      dayLabel:
        dayLabel ||
        activeFunction
          ?.dayLabel ||
        work?.event
          .eventDate ||
        '',
      mealLabel: '',
      pax:
        String(
          Math.max(
            0,
            Number(
              activeFunction
                ?.pax,
            ) ||
              Number(
                work?.event
                  .pax,
              ) ||
              0,
          ) ||
          '',
        ),
    });

    setShowFunctionForm(
      true,
    );

    setError('');
  }

  function addFunction() {
    const name =
      functionDraft
        .mealLabel
        .trim()
        .replace(
          /\s+/g,
          ' ',
        );

    const pax =
      Math.max(
        0,
        Number(
          functionDraft.pax,
        ) || 0,
      );

    if (!name) {
      setError(
        'Enter a function name such as Breakfast, Lunch or Reception.',
      );
      return;
    }

    if (!(pax > 0)) {
      setError(
        'Enter guest count for this function.',
      );
      return;
    }

    const next = {
      ...functionDraft,
      id:
        functionDraft.id ||
        uid(
          'service',
        ),
      mealLabel:
        name,
      pax:
        String(pax),
    };

    setEmptyFunctions(
      (current) => [
        ...current,
        next,
      ],
    );

    setActiveFunctionId(
      next.id,
    );

    setShowFunctionForm(
      false,
    );

    setMessage(
      `${name} added to ${next.dayLabel || 'Event Day'}. Select dishes for this function.`,
    );

    setError('');
  }

  async function updateActiveFunction(
    patch: {
      dayLabel?: string;
      mealLabel?: string;
      pax?: number;
    },
  ) {
    if (
      !work ||
      !activeFunction
    ) {
      return;
    }

    const nextDay =
      patch.dayLabel ??
      activeFunction.dayLabel;

    const nextMeal =
      patch.mealLabel ??
      activeFunction.mealLabel;

    const nextPax =
      patch.pax ??
      activeFunction.pax;

    if (
      !activeFunction
        .items.length
    ) {
      setEmptyFunctions(
        (current) =>
          current.map(
            (fn) =>
              fn.id ===
              activeFunction
                .serviceId
                ? {
                    ...fn,
                    dayLabel:
                      nextDay,
                    mealLabel:
                      nextMeal,
                    pax:
                      String(
                        nextPax,
                      ),
                  }
                : fn,
          ),
      );

      return;
    }

    const menu =
      work.menu.map(
        (item) =>
          item.serviceId ===
            activeFunction
              .serviceId
            ? {
                ...item,
                dayLabel:
                  nextDay,
                mealLabel:
                  nextMeal,
                servicePax:
                  nextPax,
              }
            : item,
      );

    await persist({
      ...work,
      menu,
      updatedAt:
        new Date()
          .toISOString(),
    });
  }

  async function removeFunction(
    fn: MenuFunction,
  ) {
    if (!work) {
      return;
    }

    if (
      fn.items.length &&
      !window.confirm(
        `Remove ${fn.mealLabel} and all ${fn.items.length} selected dishes?`,
      )
    ) {
      return;
    }

    if (
      fn.items.length
    ) {
      await persist({
        ...work,
        menu:
          work.menu.filter(
            (item) =>
              item.serviceId !==
              fn.serviceId,
          ),
        updatedAt:
          new Date()
            .toISOString(),
      });
    }

    setEmptyFunctions(
      (current) =>
        current.filter(
          (draft) =>
            draft.id !==
            fn.serviceId,
        ),
    );

    const next =
      functions.find(
        (item) =>
          item.serviceId !==
          fn.serviceId,
      );

    setActiveFunctionId(
      next?.serviceId ||
      '',
    );

    setMessage(
      `${fn.mealLabel} removed.`,
    );
  }

  if (!work) {
    return (
      <AppShell
        title="Event & Menu"
        subtitle="Event details, functions and menu"
      >
        <div className="glass-card menu-create-loading">
          Loading event menu…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Event & Menu"
      subtitle="One workspace for event details, functions, dishes and import"
      hidePageTitle
    >
      <section className="content-grid menu-create-page">
        <section className="menu-create-topbar">
          <div className="menu-create-topbar-copy">
            <span className="menu-create-eyebrow">
              Event & Menu
            </span>
            <h1>
              {work.event.eventName ||
                work.event.clientName ||
                'Current Event'}
            </h1>
            <p>
              {work.event.clientName || 'Client not added'}
              {work.event.eventDate ? ` · ${work.event.eventDate}` : ''}
              {work.event.venue ? ` · ${work.event.venue}` : ''}
            </p>

            <div className="menu-create-topbar-metrics">
              <span><b>{totalDays}</b><small>Days</small></span>
              <span><b>{functions.length}</b><small>Functions</small></span>
              <span><b>{work.menu.filter((item) => item.coverageStatus !== 'REJECTED').length}</b><small>Dishes</small></span>
              <span><b>{functions.reduce((total, fn) => total + Math.max(0, Number(fn.pax) || 0), 0).toLocaleString('en-IN')}</b><small>Function covers</small></span>
            </div>
          </div>

          <div className="menu-create-topbar-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                window.location.assign(
                  '/app/event?new=1',
                )
              }
            >
              + New Event
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                window.location.assign(
                  '/app/event?resume=1#menuInput',
                )
              }
            >
              Import Menu
            </button>

            <button
              className="primary-button"
              type="button"
              onClick={() =>
                openNewFunction(
                  '',
                )
              }
            >
              + Function
            </button>

            <button
              className="secondary-button"
              type="button"
              disabled={
                !work.menu.some(
                  (item) =>
                    item.coverageStatus !==
                    'REJECTED',
                )
              }
              onClick={() =>
                window.location.assign(
                  '/app/cost',
                )
              }
            >
              Dish Cost →
            </button>

            <button
              className="menu-create-download-compact"
              type="button"
              disabled={
                !work.menu.some(
                  (item) =>
                    item.coverageStatus !==
                    'REJECTED',
                )
              }
              onClick={() => {
                void (async () => {
                  try {
                    const fileName =
                      downloadMenuCreationPdf(
                        work,
                      );

                    const response =
                      await fetch(
                        '/api/client/menu-history',
                        {
                          method:
                            'POST',
                          headers: {
                            'Content-Type':
                              'application/json',
                          },
                          body:
                            JSON.stringify(
                              {
                                work,
                                fileName,
                              },
                            ),
                        },
                      );

                    const data =
                      await response
                        .json()
                        .catch(
                          () => ({}),
                        );

                    if (!response.ok) {
                      throw new Error(
                        data.error ||
                          'Menu downloaded, but could not save it to History.',
                      );
                    }

                    setMessage(
                      'Premium menu downloaded and saved to History.',
                    );
                    setError('');
                  } catch (
                    pdfError
                  ) {
                    setError(
                      pdfError instanceof
                      Error
                        ? pdfError.message
                        : 'Could not download menu PDF.',
                    );
                  }
                })();
              }}
            >
              Download Menu
            </button>
          </div>
        </section>

        <section className="glass-card menu-create-event-card">
          <div className="menu-create-event-head">
            <div>
              <span>Event setup</span>
              <h2>Client & event details</h2>
              <p>Keep the event brief here. Changes save automatically when you leave a field.</p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                window.location.assign(
                  '/app/event?new=1',
                )
              }
            >
              + New Event
            </button>
          </div>

          <div className="menu-create-event-grid">
            <label>
              <span>Client Name</span>
              <input
                value={work.event.clientName}
                placeholder="Client name"
                onChange={(event) =>
                  updateEventField(
                    'clientName',
                    event.target.value,
                  )
                }
                onBlur={() =>
                  void commitEventDetails()
                }
              />
            </label>

            <label>
              <span>Event Name</span>
              <input
                value={work.event.eventName}
                placeholder="Wedding / Reception / Corporate Event"
                onChange={(event) =>
                  updateEventField(
                    'eventName',
                    event.target.value,
                  )
                }
                onBlur={() =>
                  void commitEventDetails()
                }
              />
            </label>

            <label>
              <span>Event Date</span>
              <input
                type="date"
                value={work.event.eventDate}
                onChange={(event) =>
                  updateEventField(
                    'eventDate',
                    event.target.value,
                  )
                }
                onBlur={() =>
                  void commitEventDetails()
                }
              />
            </label>

            <label>
              <span>Venue</span>
              <input
                value={work.event.venue}
                placeholder="Venue"
                onChange={(event) =>
                  updateEventField(
                    'venue',
                    event.target.value,
                  )
                }
                onBlur={() =>
                  void commitEventDetails()
                }
              />
            </label>

            <label>
              <span>City</span>
              <input
                value={work.event.city}
                placeholder="City"
                onChange={(event) =>
                  updateEventField(
                    'city',
                    event.target.value,
                  )
                }
                onBlur={() =>
                  void commitEventDetails()
                }
              />
            </label>

            <label>
              <span>Main Function Type</span>
              <input
                value={work.event.functionType}
                placeholder="Wedding / Lunch / Dinner"
                onChange={(event) =>
                  updateEventField(
                    'functionType',
                    event.target.value,
                  )
                }
                onBlur={() =>
                  void commitEventDetails()
                }
              />
            </label>

            <label>
              <span>Default Guests</span>
              <input
                type="number"
                min="0"
                value={work.event.pax || ''}
                placeholder="400"
                onChange={(event) =>
                  updateEventField(
                    'pax',
                    Math.max(
                      0,
                      Math.round(
                        Number(
                          event.target.value,
                        ) || 0,
                      ),
                    ),
                  )
                }
                onBlur={() =>
                  void commitEventDetails()
                }
              />
            </label>

            <button
              className="menu-create-import-card"
              type="button"
              onClick={() =>
                window.location.assign(
                  '/app/event?resume=1#menuInput',
                )
              }
            >
              <span>Quick import</span>
              <b>PDF / Photo / Paste Menu</b>
              <small>Detect dishes, review them, then return here automatically.</small>
            </button>
          </div>
        </section>

        {message ? (
          <div className="menu-create-message">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="menu-create-message error">
            {error}
          </div>
        ) : null}

        <section className="menu-create-day-board">
          {dayGroups.map(
            (
              day,
              dayIndex,
            ) => (
              <section
                className="menu-create-day-group"
                key={
                  day.key
                }
              >
                <header>
                  <div>
                    <span>
                      Day {dayIndex + 1}
                    </span>
                    <h2>
                      {day.label}
                    </h2>
                    <small>
                      {day.functions.length} function{day.functions.length === 1 ? '' : 's'}
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openNewFunction(
                        day.label,
                      )
                    }
                  >
                    + Add Meal / Function
                  </button>
                </header>

                <div className="menu-create-function-strip">
                  {day.functions.map(
                    (
                      fn,
                      index,
                    ) => (
                      <button
                        key={
                          fn.serviceId
                        }
                        type="button"
                        className={
                          fn.serviceId ===
                          activeFunction
                            ?.serviceId
                            ? 'active'
                            : ''
                        }
                        onClick={() => {
                          setActiveFunctionId(
                            fn.serviceId,
                          );
                          setMessage(
                            '',
                          );
                          setError('');
                        }}
                      >
                        <span>
                          Function {index + 1}
                        </span>

                        <b>
                          {fn.mealLabel ||
                            'Event Menu'}
                        </b>

                        <small>
                          {fn.pax.toLocaleString('en-IN')} guests · {fn.items.length} dishes
                        </small>
                      </button>
                    ),
                  )}
                </div>
              </section>
            ),
          )}

          <button
            type="button"
            className="menu-create-add-day"
            onClick={() =>
              openNewFunction(
                '',
              )
            }
          >
            <span>＋</span>
            <b>Add another day</b>
            <small>
              Create a new date/day and its first meal or function
            </small>
          </button>
        </section>

        {activeFunction ? (
          <section className="glass-card menu-create-function-editor">
            <div className="menu-create-function-editor-head">
              <div>
                <span>
                  Selected function
                </span>
                <h2>
                  {activeFunction.mealLabel}
                </h2>
              </div>

              <button
                className="menu-create-danger"
                type="button"
                onClick={() =>
                  void removeFunction(
                    activeFunction,
                  )
                }
              >
                Remove Function
              </button>
            </div>

            <div className="menu-create-function-fields">
              <label>
                <span>Date / Day</span>
                <input
                  value={
                    activeFunction
                      .dayLabel
                  }
                  placeholder="e.g. 14.02.2027 or Day 1"
                  onChange={(
                    event,
                  ) =>
                    void updateActiveFunction(
                      {
                        dayLabel:
                          event
                            .target
                            .value,
                      },
                    )
                  }
                />
              </label>

              <label>
                <span>Function</span>
                <input
                  value={
                    activeFunction
                      .mealLabel
                  }
                  placeholder="Breakfast / Lunch / Reception"
                  onChange={(
                    event,
                  ) =>
                    void updateActiveFunction(
                      {
                        mealLabel:
                          event
                            .target
                            .value,
                      },
                    )
                  }
                />
              </label>

              <label>
                <span>Guests</span>
                <input
                  type="number"
                  min="1"
                  value={
                    activeFunction
                      .pax ||
                    ''
                  }
                  onChange={(
                    event,
                  ) =>
                    void updateActiveFunction(
                      {
                        pax:
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
                />
              </label>
            </div>
          </section>
        ) : null}

        <section className="menu-create-layout">
          <div className="menu-create-catalog">
            <section className="glass-card menu-create-toolbar">
              <div>
                <span className="menu-create-eyebrow">
                  Dish Master
                </span>
                <h2>
                  Add dishes
                </h2>
              </div>

              <button
                className="secondary-button"
                type="button"
                disabled={
                  !activeFunction
                }
                onClick={
                  openCustomDishCreator
                }
              >
                + Custom Dish
              </button>

              <label className="menu-create-search">
                <span aria-hidden="true">
                  ⌕
                </span>
                <input
                  value={search}
                  placeholder="Search dish…"
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <div className="menu-create-category-tabs">
                <button
                  type="button"
                  className={
                    category ===
                    'ALL'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCategory(
                      'ALL',
                    )
                  }
                >
                  <span>All Stations</span>
                  <small>
                    {activeFunction?.items.length || 0}/{dishCatalog.length}
                  </small>
                </button>

                {stations.map(
                  (station) => (
                    <button
                      key={
                        station.key
                      }
                      type="button"
                      className={
                        category ===
                        station.key
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setCategory(
                          station.key,
                        )
                      }
                    >
                      <span>
                        {station.label}
                      </span>
                      <small>
                        {stationMetrics.get(
                          station.key,
                        )?.selected || 0}/{
                          stationMetrics.get(
                            station.key,
                          )?.available || 0
                        }
                      </small>
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className="glass-card menu-create-custom-dishes">
              <div className="menu-create-custom-head">
                <div>
                  <span>
                    Custom dishes
                  </span>
                  <h3>
                    Event-only dishes & categories
                  </h3>
                  <small>
                    Add a dish outside Dish Master, create a new category, or edit it later.
                  </small>
                </div>

                <button
                  type="button"
                  disabled={
                    !activeFunction
                  }
                  onClick={
                    openCustomDishCreator
                  }
                >
                  + New Custom Dish
                </button>
              </div>

              {activeCustomDishes.length ? (
                <div className="menu-create-custom-list">
                  {activeCustomDishes.map(
                    (item) => (
                      <article
                        key={
                          item.id
                        }
                      >
                        <span>
                          <b>
                            {
                              item.name
                            }
                          </b>
                          <small>
                            {
                              item.category ||
                              'Other'
                            } · {
                              Number(
                                item.costPerPlate,
                              ) > 0
                                ? `₹${Number(item.costPerPlate).toLocaleString('en-IN')} / plate`
                                : 'Rate pending'
                            }
                          </small>
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            openCustomDishEditor(
                              item,
                            )
                          }
                        >
                          Edit
                        </button>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <div className="menu-create-custom-empty">
                  No custom dishes in this function.
                </div>
              )}
            </section>

            {activeStation ? (
              <section className="glass-card menu-create-station-nav">
                <button
                  type="button"
                  onClick={() =>
                    moveStation(-1)
                  }
                >
                  ← Previous
                </button>

                <div>
                  <span>
                    Building station
                  </span>
                  <h3>
                    {activeStation.label}
                  </h3>
                  <small>
                    {stationMetrics.get(
                      activeStation.key,
                    )?.selected || 0} selected · {
                      stationMetrics.get(
                        activeStation.key,
                      )?.available || 0
                    } available
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    moveStation(1)
                  }
                >
                  Next →
                </button>
              </section>
            ) : null}

            {loadingCatalog ? (
              <div className="glass-card menu-create-empty">
                Loading Dish Master…
              </div>
            ) : !visibleDishes.length ? (
              <div className="glass-card menu-create-empty">
                No dishes found in this station/search.
              </div>
            ) : (
              <>
                {visibleDishes.length > 120 ? (
                  <div className="menu-create-result-note">
                    Showing first 120 of {visibleDishes.length} dishes · search or choose a station to narrow the list.
                  </div>
                ) : null}
                <section className="menu-create-dish-grid">
                {displayedDishes.map(
                  (
                    dish,
                  ) => {
                    const selected =
                      selectedNameKeys.has(
                        normalize(
                          dish.name,
                        ),
                      );

                    const selectedItem =
                      activeFunction
                        ?.items.find(
                          (item) =>
                            normalize(
                              item.name,
                            ) ===
                            normalize(
                              dish.name,
                            ),
                        );

                    const shownRate =
                      selectedItem
                        ? Math.max(
                            0,
                            Number(
                              selectedItem.costPerPlate,
                            ) || 0,
                          )
                        : Math.max(
                            0,
                            Number(
                              dish.rate,
                            ) || 0,
                          );

                    return (
                      <article
                        key={
                          `${dish.category}::${dish.name}`
                        }
                        className={
                          `menu-create-dish-card ${selected ? 'selected' : ''}`
                        }
                      >
                        <button
                          type="button"
                          className="menu-create-dish-select"
                          disabled={
                            !activeFunction
                          }
                          onClick={() =>
                            void toggleDish(
                              dish,
                            )
                          }
                        >
                          <span className="menu-create-dish-icon">
                            {dish.name
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </span>

                          <span className="menu-create-dish-copy">
                            <b>
                              {dish.name}
                            </b>

                            <small>
                              {stationForCategory(
                                dish.category,
                              ).label}
                            </small>

                            <em>
                              {shownRate > 0
                                ? `₹${shownRate.toLocaleString('en-IN')} / plate`
                                : dish.hasRecipe
                                  ? 'Recipe ready · rate not set'
                                  : 'Rate not set'}
                            </em>
                          </span>

                          <i>
                            {selected
                              ? '✓'
                              : '+'}
                          </i>
                        </button>

                        {selected &&
                        selectedItem ? (
                          <label className="menu-create-dish-rate">
                            <span>
                              Event rate / plate
                            </span>

                            <div>
                              <span aria-hidden="true">
                                ₹
                              </span>

                              <input
                                key={
                                  `${selectedItem.id}:${selectedItem.costPerPlate}`
                                }
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                defaultValue={
                                  selectedItem.costPerPlate ||
                                  ''
                                }
                                placeholder="50"
                                onFocus={(event) =>
                                  event.currentTarget.select()
                                }
                                onBlur={(event) =>
                                  void updateDishRate(
                                    selectedItem.id,
                                    Number(
                                      event.target.value,
                                    ),
                                  )
                                }
                                aria-label={`Rate per plate for ${dish.name}`}
                              />
                            </div>
                          </label>
                        ) : null}
                      </article>
                    );
                  },
                )}
              </section>
              </>
            )}
          </div>
        </section>

        {showFunctionForm ? (
          <div
            className="menu-create-modal-backdrop"
            role="presentation"
            onClick={() =>
              setShowFunctionForm(
                false,
              )
            }
          >
            <section
              className="menu-create-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Add menu function"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="menu-create-modal-head">
                <div>
                  <span>
                    Multi-day event
                  </span>
                  <h2>
                    Add meal / function
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowFunctionForm(
                      false,
                    )
                  }
                >
                  ×
                </button>
              </div>

              <label>
                <span>
                  Date / Day
                </span>
                <input
                  value={
                    functionDraft
                      .dayLabel
                  }
                  placeholder="14.02.2027, 15.02.2027 or Day 2"
                  onChange={(
                    event,
                  ) =>
                    setFunctionDraft(
                      (
                        current,
                      ) => ({
                        ...current,
                        dayLabel:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Function name
                </span>
                <input
                  autoFocus
                  value={
                    functionDraft
                      .mealLabel
                  }
                  placeholder="Breakfast / Haldi / Lunch / Hi-Tea / Dinner / Reception"
                  list="menu-function-presets"
                  onChange={(
                    event,
                  ) =>
                    setFunctionDraft(
                      (
                        current,
                      ) => ({
                        ...current,
                        mealLabel:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
                <datalist id="menu-function-presets">
                  <option value="Breakfast" />
                  <option value="Haldi" />
                  <option value="Lunch" />
                  <option value="Pool Party" />
                  <option value="Mamera" />
                  <option value="Hi-Tea" />
                  <option value="DJ Night" />
                  <option value="Dinner" />
                  <option value="Barat Swagat" />
                  <option value="Reception" />
                  <option value="Late Night" />
                </datalist>
              </label>

              <label>
                <span>
                  Guests
                </span>
                <input
                  type="number"
                  min="1"
                  value={
                    functionDraft
                      .pax
                  }
                  placeholder="400"
                  onChange={(
                    event,
                  ) =>
                    setFunctionDraft(
                      (
                        current,
                      ) => ({
                        ...current,
                        pax:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <button
                className="primary-button"
                type="button"
                onClick={
                  addFunction
                }
              >
                Create Function
              </button>
            </section>
          </div>
        ) : null}

        {showCustomDish ? (
          <div
            className="menu-create-modal-backdrop"
            role="presentation"
            onClick={
              closeCustomDishModal
            }
          >
            <section
              className="menu-create-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Add custom dish"
              onClick={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="menu-create-modal-head">
                <div>
                  <span>
                    {editingCustomDishId
                      ? 'Edit custom dish'
                      : 'New custom dish'}
                  </span>
                  <h2>
                    {editingCustomDishId
                      ? 'Update dish & category'
                      : 'Add & send for admin review'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCustomDishModal
                  }
                >
                  ×
                </button>
              </div>

              <label>
                <span>
                  Dish name
                </span>
                <input
                  autoFocus
                  value={
                    customDish
                      .name
                  }
                  placeholder="Enter dish name"
                  onChange={(
                    event,
                  ) =>
                    setCustomDish(
                      (
                        current,
                      ) => ({
                        ...current,
                        name:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Category
                </span>
                <div className="menu-create-custom-category-row">
                  <select
                    value={
                      customDish
                        .category
                    }
                    onChange={(
                      event,
                    ) =>
                      setCustomDish(
                        (
                          current,
                        ) => ({
                          ...current,
                          category:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  >
                    {customCategoryOptions.map(
                      (item) => (
                        <option
                          key={
                            item
                          }
                          value={
                            item
                          }
                        >
                          {
                            item
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setShowCustomCategoryForm(
                        (current) =>
                          !current,
                      )
                    }
                  >
                    + New Category
                  </button>
                </div>

                {showCustomCategoryForm ? (
                  <div className="menu-create-new-category">
                    <input
                      value={
                        newCustomCategoryName
                      }
                      placeholder="New category e.g. Live Pasta"
                      maxLength={60}
                      onChange={(event) =>
                        setNewCustomCategoryName(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          'Enter'
                        ) {
                          event.preventDefault();
                          addCustomCategory();
                        }
                      }}
                    />

                    <button
                      className="secondary-button"
                      type="button"
                      disabled={
                        !newCustomCategoryName.trim()
                      }
                      onClick={
                        addCustomCategory
                      }
                    >
                      Add Category
                    </button>
                  </div>
                ) : null}
              </label>

              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  editingCustomDishId
                    ? void editCustomDish()
                    : void addCustomDish()
                }
              >
                {editingCustomDishId
                  ? 'Save Changes'
                  : 'Add to Menu + Queue'}
              </button>
            </section>
          </div>
        ) : null}

        <style>{`
          .menu-create-page{gap:12px}
          .menu-create-hero{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px;border:1px solid rgba(74,156,255,.15);border-radius:18px;background:linear-gradient(135deg,rgba(18,28,42,.98),rgba(10,14,20,.98));box-shadow:0 16px 38px rgba(0,0,0,.2)}
          .menu-create-workflow-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .menu-create-workflow-strip>div{display:grid;grid-template-columns:30px 1fr;gap:2px 8px;align-items:center;padding:11px 12px;border:1px solid rgba(148,163,184,.12);border-radius:12px;background:#0f161f}
          .menu-create-workflow-strip>div>span{grid-row:1/3;display:grid;width:30px;height:30px;place-items:center;border-radius:9px;color:#9bacbf;background:#1a2430;font-size:8px;font-weight:900}
          .menu-create-workflow-strip b{color:#e4ebf3;font-size:9px}.menu-create-workflow-strip small{color:#697a8f;font-size:7px}
          .menu-create-workflow-strip .done{border-color:rgba(85,217,143,.18);background:rgba(85,217,143,.035)}
          .menu-create-workflow-strip .done>span{color:#9de0b9;background:rgba(85,217,143,.10)}
          .menu-create-event-card{padding:14px 15px}
          .menu-create-event-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid rgba(148,163,184,.10)}
          .menu-create-event-head>div>span{display:block;color:#75adf1;font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .menu-create-event-head h2{margin:3px 0;color:#eaf1f8;font-size:16px}.menu-create-event-head p{margin:0;color:#708095;font-size:8px}
          .menu-create-event-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
          .menu-create-event-grid label{display:grid;gap:4px}.menu-create-event-grid label>span{color:#718196;font-size:7px;font-weight:900;text-transform:uppercase}
          .menu-create-event-grid input{width:100%;min-height:40px;padding:0 10px;border:1px solid #303b47;border-radius:9px;outline:0;color:#e8eff7;background:#111820;font:inherit;font-size:9px}
          .menu-create-event-grid input:focus{border-color:rgba(74,156,255,.52);box-shadow:0 0 0 3px rgba(74,156,255,.07)}
          .menu-create-import-card{display:grid;gap:2px;align-content:center;min-height:62px;padding:10px 12px;border:1px dashed rgba(74,156,255,.30);border-radius:10px;color:#dce9f8;background:rgba(74,156,255,.04);text-align:left;font:inherit;cursor:pointer}
          .menu-create-import-card span{color:#79b7ff;font-size:7px;font-weight:900;text-transform:uppercase}.menu-create-import-card b{font-size:9px}.menu-create-import-card small{color:#6f8094;font-size:7px;line-height:1.35}
          .menu-create-eyebrow{display:block;color:#75adf1;font-size:8px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
          .menu-create-hero h1{margin:5px 0;color:#f4f8fc;font-size:27px;letter-spacing:-.035em}
          .menu-create-hero p{margin:0;color:#7d8da1;font-size:10px}
          .menu-create-hero-actions{display:flex;gap:8px;flex-wrap:wrap}
          .menu-create-message{padding:10px 12px;border:1px solid rgba(85,217,143,.18);border-radius:10px;color:#8bdbad;background:rgba(85,217,143,.05);font-size:9px}
          .menu-create-message.error{border-color:rgba(255,98,89,.2);color:#ef9a95;background:rgba(255,98,89,.05)}
          .menu-create-day-board{display:grid;gap:10px}
          .menu-create-day-group{padding:12px;border:1px solid rgba(148,163,184,.11);border-radius:15px;background:#0e151e}
          .menu-create-day-group>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}
          .menu-create-day-group>header span{display:block;color:#75adf1;font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
          .menu-create-day-group>header h2{margin:2px 0;color:#e7eef6;font-size:14px}
          .menu-create-day-group>header small{color:#6c7d90;font-size:7px}
          .menu-create-day-group>header button{min-height:32px;padding:0 10px;border:1px solid rgba(74,156,255,.18);border-radius:8px;color:#9dc8f8;background:rgba(74,156,255,.05);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .menu-create-add-day{display:grid;gap:3px;place-items:center;min-height:76px;border:1px dashed rgba(74,156,255,.25);border-radius:14px;color:#86b8ef;background:rgba(74,156,255,.03);font:inherit;cursor:pointer}
          .menu-create-add-day span{font-size:15px}.menu-create-add-day b{font-size:10px}.menu-create-add-day small{color:#687a8f;font-size:7px}
          .menu-create-function-strip{display:flex;gap:8px;overflow:auto;padding-bottom:2px}
          .menu-create-function-strip>button{flex:0 0 210px;display:grid;gap:3px;padding:12px 13px;border:1px solid rgba(148,163,184,.12);border-radius:13px;color:#7c8da1;background:#101720;text-align:left;font:inherit;cursor:pointer}
          .menu-create-function-strip>button.active{border-color:rgba(74,156,255,.35);background:rgba(74,156,255,.07);box-shadow:inset 0 0 0 1px rgba(74,156,255,.08)}
          .menu-create-function-strip>button.add{border-style:dashed}
          .menu-create-function-strip span{color:#6d7d91;font-size:7px;font-weight:900;text-transform:uppercase}
          .menu-create-function-strip b{color:#e3ebf4;font-size:11px}
          .menu-create-function-strip small{color:#67778b;font-size:7px}
          .menu-create-function-editor{padding:14px 15px}
          .menu-create-function-editor-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
          .menu-create-function-editor-head span{color:#718196;font-size:7px;font-weight:900;text-transform:uppercase}
          .menu-create-function-editor-head h2{margin:2px 0 0;color:#eaf1f8;font-size:16px}
          .menu-create-danger{padding:7px 9px;border:1px solid rgba(255,98,89,.16);border-radius:8px;color:#df8d88;background:rgba(255,98,89,.04);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .menu-create-function-fields{display:grid;grid-template-columns:1fr 1fr 160px;gap:8px;margin-top:12px}
          .menu-create-function-fields label,.menu-create-modal label{display:grid;gap:4px}
          .menu-create-function-fields label>span,.menu-create-modal label>span{color:#718196;font-size:7px;font-weight:900;text-transform:uppercase}
          .menu-create-function-fields input,.menu-create-modal input,.menu-create-modal select{width:100%;min-height:40px;padding:0 10px;border:1px solid #33404d;border-radius:9px;outline:0;color:#e8eff7;background:#121a23;font:inherit;font-size:9px}
          .menu-create-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}
          .menu-create-catalog{display:grid;gap:10px}
          .menu-create-toolbar{position:sticky;top:64px;z-index:8;display:grid;grid-template-columns:1fr auto;gap:10px;padding:13px 14px;background:rgba(10,14,20,.95);backdrop-filter:blur(16px)}
          .menu-create-toolbar h2{margin:2px 0;color:#eaf1f8;font-size:16px}
          .menu-create-search{grid-column:1/-1;display:flex;align-items:center;gap:7px;min-height:40px;padding:0 10px;border:1px solid #303b47;border-radius:10px;background:#111820}
          .menu-create-search span{color:#708196}
          .menu-create-search input{width:100%;border:0;outline:0;color:#e8eff7;background:transparent;font:inherit}
          .menu-create-category-tabs{grid-column:1/-1;display:flex;gap:5px;overflow:auto;padding-bottom:2px}
          .menu-create-category-tabs button{flex:0 0 auto;min-height:31px;padding:0 9px;border:1px solid #303b47;border-radius:8px;color:#7b8ca1;background:#121a23;font:inherit;font-size:7px;font-weight:850;cursor:pointer}
          .menu-create-category-tabs button.active{border-color:rgba(74,156,255,.32);color:#a8d0ff;background:rgba(74,156,255,.08)}
          .menu-create-category-tabs button span,.menu-create-category-tabs button small{display:block}
          .menu-create-category-tabs button small{margin-top:2px;color:#5f7085;font-size:6px;font-weight:800}
          .menu-create-category-tabs button.active small{color:#7faee2}
          .menu-create-custom-dishes{display:grid;gap:9px;padding:11px 13px}
          .menu-create-custom-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
          .menu-create-custom-head span,.menu-create-custom-head small{display:block}
          .menu-create-custom-head span{color:#75adf1;font-size:7px;font-weight:900;text-transform:uppercase}
          .menu-create-custom-head h3{margin:2px 0;color:#e7eef6;font-size:13px}
          .menu-create-custom-head small{color:#65768a;font-size:7px}
          .menu-create-custom-head>button{min-height:34px;padding:0 10px;border:1px solid rgba(74,156,255,.22);border-radius:9px;color:#a8d0ff;background:rgba(74,156,255,.06);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .menu-create-custom-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px}
          .menu-create-custom-list article{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;border:1px solid rgba(148,163,184,.10);border-radius:9px;background:#101720}
          .menu-create-custom-list article span b,.menu-create-custom-list article span small{display:block}
          .menu-create-custom-list article span b{color:#dfe8f1;font-size:8px}
          .menu-create-custom-list article span small{margin-top:2px;color:#68798c;font-size:6px}
          .menu-create-custom-list article>button{min-height:28px;padding:0 8px;border:1px solid rgba(74,156,255,.18);border-radius:7px;color:#8ebcf1;background:rgba(74,156,255,.04);font:inherit;font-size:7px;font-weight:850;cursor:pointer}
          .menu-create-custom-empty{padding:9px;border:1px dashed rgba(148,163,184,.10);border-radius:8px;color:#65768a;font-size:7px;text-align:center}
          .menu-create-custom-category-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
          .menu-create-custom-category-row .secondary-button{min-height:40px;white-space:nowrap}
          .menu-create-new-category{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;padding:9px;border:1px dashed rgba(74,156,255,.18);border-radius:9px;background:rgba(74,156,255,.025)}
          .menu-create-new-category .secondary-button{min-height:40px}
          .menu-create-station-nav{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:11px 13px}
          .menu-create-station-nav>button{min-height:34px;padding:0 10px;border:1px solid #303b47;border-radius:9px;color:#8da0b5;background:#121a23;font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .menu-create-station-nav>div{text-align:center}
          .menu-create-station-nav span,.menu-create-station-nav small{display:block}
          .menu-create-station-nav span{color:#6f8094;font-size:6px;font-weight:900;text-transform:uppercase}
          .menu-create-station-nav h3{margin:2px 0;color:#e7eef6;font-size:13px}
          .menu-create-station-nav small{color:#65768a;font-size:7px}
          .menu-create-dish-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
          .menu-create-dish-card{overflow:hidden;border:1px solid rgba(148,163,184,.11);border-radius:12px;background:#101720}
          .menu-create-dish-card:hover{border-color:rgba(74,156,255,.22)}
          .menu-create-dish-card.selected{border-color:rgba(85,217,143,.28);background:rgba(85,217,143,.035)}
          .menu-create-dish-select{display:grid;grid-template-columns:36px minmax(0,1fr) 26px;gap:9px;align-items:center;width:100%;min-height:70px;padding:10px;border:0;color:inherit;background:transparent;text-align:left;font:inherit;cursor:pointer}
          .menu-create-dish-select:disabled{opacity:.5;cursor:not-allowed}
          .menu-create-dish-icon{display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(148,163,184,.12);border-radius:10px;color:#a9c5e4;background:rgba(255,255,255,.025);font-size:12px;font-weight:900}
          .menu-create-dish-copy b,.menu-create-dish-copy small,.menu-create-dish-copy em{display:block}
          .menu-create-dish-copy b{color:#dfe8f1;font-size:9px}
          .menu-create-dish-copy small{margin-top:2px;color:#6f8093;font-size:7px}
          .menu-create-dish-copy em{margin-top:3px;color:#5f8fc7;font-size:6px;font-style:normal;font-weight:850;text-transform:uppercase}
          .menu-create-dish-select>i{display:grid;place-items:center;width:25px;height:25px;border:1px solid #33404d;border-radius:8px;color:#8ca0b5;font-style:normal;font-weight:900}
          .menu-create-dish-card.selected .menu-create-dish-select>i{border-color:rgba(85,217,143,.24);color:#7edfa7;background:rgba(85,217,143,.05)}
          .menu-create-dish-rate{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-top:1px solid rgba(85,217,143,.12);background:rgba(6,12,17,.28)}
          .menu-create-dish-rate>span{color:#7890a6;font-size:6px;font-weight:900;text-transform:uppercase}
          .menu-create-dish-rate>div{display:flex;align-items:center;gap:4px;min-width:92px;padding:0 7px;border:1px solid rgba(85,217,143,.20);border-radius:8px;background:#0d151d}
          .menu-create-dish-rate>div>span{color:#8edcaf;font-size:9px;font-weight:900}
          .menu-create-dish-rate input{width:72px;min-height:30px;border:0;outline:0;color:#e9f4ee;background:transparent;font:inherit;font-size:9px;font-weight:850}
          .menu-create-empty{padding:36px;color:#748499;text-align:center}
          .menu-create-selected{position:sticky;top:64px;padding:0;overflow:hidden}
          .menu-create-selected-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 15px;border-bottom:1px solid rgba(148,163,184,.09)}
          .menu-create-selected-head span{color:#718196;font-size:7px;font-weight:900;text-transform:uppercase}
          .menu-create-selected-head h2{margin:2px 0 0;color:#e7eef6;font-size:15px}
          .menu-create-selected-head>b{display:grid;place-items:center;min-width:34px;height:34px;border:1px solid rgba(74,156,255,.2);border-radius:10px;color:#9fc8f5;background:rgba(74,156,255,.05);font-size:11px}
          .menu-create-selected-empty{display:grid;gap:4px;padding:32px 15px;color:#6e7e91;text-align:center}
          .menu-create-selected-empty strong{color:#b8c4d1;font-size:10px}
          .menu-create-selected-empty span{font-size:8px}
          .menu-create-selected-groups{max-height:62vh;overflow:auto;padding:10px}
          .menu-create-selected-groups section{margin-bottom:10px}
          .menu-create-selected-groups section>div{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px 5px}
          .menu-create-selected-groups section>div b{color:#7f91a5;font-size:7px;text-transform:uppercase}
          .menu-create-selected-groups section>div span{color:#617286;font-size:7px}
          .menu-create-selected-groups article{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;border:1px solid rgba(148,163,184,.08);border-radius:9px;background:rgba(255,255,255,.018);margin-bottom:5px}
          .menu-create-selected-groups article span b,.menu-create-selected-groups article span small{display:block}
          .menu-create-selected-groups article span b{color:#dce5ee;font-size:8px}
          .menu-create-selected-groups article span small{margin-top:2px;color:#68798c;font-size:6px}
          .menu-create-selected-groups article button{width:25px;height:25px;border:1px solid rgba(255,98,89,.13);border-radius:7px;color:#d98782;background:rgba(255,98,89,.03);cursor:pointer}
          .menu-create-selected-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:11px;border-top:1px solid rgba(148,163,184,.09)}
          .menu-create-modal-backdrop{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:18px;background:rgba(3,6,10,.76);backdrop-filter:blur(8px)}
          .menu-create-modal{display:grid;gap:11px;width:min(460px,100%);padding:17px;border:1px solid rgba(148,163,184,.16);border-radius:16px;background:#101720;box-shadow:0 24px 70px rgba(0,0,0,.45)}
          .menu-create-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
          .menu-create-modal-head span{color:#75adf1;font-size:7px;font-weight:900;text-transform:uppercase}
          .menu-create-modal-head h2{margin:3px 0;color:#edf3f9;font-size:17px}
          .menu-create-modal-head button{width:32px;height:32px;border:1px solid #303b47;border-radius:9px;color:#93a3b5;background:#121a23;font-size:18px;cursor:pointer}
          .menu-create-loading{padding:40px;text-align:center}
          @media(max-width:1050px){.menu-create-layout{grid-template-columns:1fr}.menu-create-selected{position:static}.menu-create-selected-groups{max-height:none}}
          @media(max-width:700px){.menu-create-custom-head{align-items:stretch;flex-direction:column}.menu-create-custom-head>button{width:100%}.menu-create-custom-list{grid-template-columns:1fr}.menu-create-custom-category-row,.menu-create-new-category{grid-template-columns:1fr}.menu-create-custom-category-row .secondary-button,.menu-create-new-category .secondary-button{width:100%}.menu-create-day-group>header{align-items:flex-start;flex-direction:column}.menu-create-day-group>header button{width:100%}.menu-create-station-nav{grid-template-columns:1fr 1fr}.menu-create-station-nav>div{grid-column:1/-1;grid-row:1;text-align:left}.menu-create-hero{align-items:stretch;flex-direction:column}.menu-create-hero-actions{display:grid;grid-template-columns:1fr 1fr}.menu-create-function-fields{grid-template-columns:1fr}.menu-create-dish-grid{grid-template-columns:1fr}.menu-create-selected-actions{grid-template-columns:1fr}.menu-create-toolbar{position:static}.menu-create-selected{position:static}.menu-create-function-strip>button{flex-basis:185px}}

          .menu-create-page{width:100%;max-width:none;gap:10px}
          .menu-create-topbar{position:sticky;top:0;z-index:12;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:13px 15px;border:1px solid rgba(74,156,255,.16);border-radius:14px;background:rgba(11,17,24,.96);backdrop-filter:blur(18px);box-shadow:0 10px 28px rgba(0,0,0,.18)}
          .menu-create-topbar-copy h1{margin:3px 0 2px;color:#f3f7fb;font-size:20px;letter-spacing:-.035em}.menu-create-topbar-copy p{margin:0;color:#728398;font-size:8px}
          .menu-create-topbar-metrics{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.menu-create-topbar-metrics>span{display:grid;grid-template-columns:auto auto;gap:4px;align-items:baseline;padding:5px 7px;border:1px solid rgba(148,163,184,.09);border-radius:8px;background:rgba(255,255,255,.018)}
          .menu-create-topbar-metrics b{color:#dfe8f2;font-size:9px}.menu-create-topbar-metrics small{color:#67788d;font-size:6px;text-transform:uppercase}
          .menu-create-topbar-actions{display:grid;grid-template-columns:repeat(2,minmax(110px,1fr));gap:6px;min-width:270px}.menu-create-topbar-actions button{min-height:36px;padding:0 10px;font-size:8px}
          .menu-create-download-compact{grid-column:1/-1;min-height:30px;border:0;color:#7790aa;background:transparent;font:inherit;font-size:7px;font-weight:850;cursor:pointer}.menu-create-download-compact:disabled{opacity:.35;cursor:not-allowed}
          .menu-create-event-card{padding:11px 12px}.menu-create-event-head{padding-bottom:9px}.menu-create-event-head h2{font-size:14px}.menu-create-event-head p{display:none}
          .menu-create-event-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}.menu-create-event-grid input{min-height:36px}.menu-create-import-card{min-height:52px}
          .menu-create-day-board{gap:7px}.menu-create-day-group{padding:9px;border-radius:12px}.menu-create-day-group>header{margin-bottom:7px}.menu-create-function-strip>button{flex-basis:180px;padding:9px 10px;border-radius:10px}
          .menu-create-function-editor{padding:10px 12px}.menu-create-function-editor-head h2{font-size:14px}.menu-create-function-fields{margin-top:8px}.menu-create-function-fields input{min-height:36px}
          .menu-create-toolbar{top:72px;padding:10px 11px;gap:7px}.menu-create-toolbar h2{font-size:14px}.menu-create-search{min-height:36px}.menu-create-category-tabs button{min-height:29px}
          .menu-create-station-nav{padding:8px 10px}.menu-create-dish-grid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px}.menu-create-dish-card{border-radius:10px}.menu-create-dish-select{min-height:62px;padding:8px}.menu-create-dish-icon{width:32px;height:32px;border-radius:9px}
          .menu-create-result-note{padding:7px 9px;border:1px dashed rgba(148,163,184,.10);border-radius:9px;color:#687b90;background:rgba(255,255,255,.012);font-size:7px}
          @media(max-width:980px){.menu-create-topbar{grid-template-columns:1fr}.menu-create-topbar-actions{grid-template-columns:repeat(4,minmax(0,1fr));min-width:0}.menu-create-download-compact{grid-column:auto}.menu-create-event-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
          @media(max-width:700px){.menu-create-topbar{position:static;padding:12px}.menu-create-topbar-actions{grid-template-columns:1fr 1fr}.menu-create-topbar-actions>*{width:100%}.menu-create-download-compact{grid-column:1/-1}.menu-create-event-head{align-items:stretch;flex-direction:column}.menu-create-event-grid{grid-template-columns:1fr}.menu-create-hero-actions{display:grid;grid-template-columns:1fr 1fr}.menu-create-hero-actions>*{width:100%}}
        `}</style>
      </section>
    </AppShell>
  );
}
