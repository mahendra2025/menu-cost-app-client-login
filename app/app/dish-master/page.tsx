'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '../../components/AppShell';
import {
  getSession,
} from '../../../lib/store';

type DishItem = {
  name: string;
  category: string;
  subcategory?: string;
  rate: number;
  source?: 'global' | 'tenant';
  servingQuantity?: number;
  servingUnit?: string;
};

type DishDraft = {
  previousName: string;
  name: string;
  category: string;
  rate: string;
  servingQuantity: string;
  servingUnit: string;
};

function cleanText(
  value: string,
  maxLength = 120,
) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function emptyDish(
  category = 'Other',
): DishDraft {
  return {
    previousName: '',
    name: '',
    category,
    rate: '',
    servingQuantity: '1',
    servingUnit: 'serving',
  };
}

function money(
  value: number,
) {
  return `₹${Math.max(
    0,
    Number(value) || 0,
  ).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function MyDishMasterPage() {
  const router =
    useRouter();

  const [
    ready,
    setReady,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    savingDish,
    setSavingDish,
  ] = useState(false);

  const [
    savingCategory,
    setSavingCategory,
  ] = useState(false);

  const [
    dishes,
    setDishes,
  ] = useState<DishItem[]>([]);

  const [
    allCategories,
    setAllCategories,
  ] = useState<string[]>([]);

  const [
    myCategories,
    setMyCategories,
  ] = useState<string[]>([]);

  const [
    query,
    setQuery,
  ] = useState('');

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState('ALL');

  const [
    dishDraft,
    setDishDraft,
  ] = useState<DishDraft>(
    emptyDish(),
  );

  const [
    editingCategory,
    setEditingCategory,
  ] = useState<string | null>(
    null,
  );

  const [
    categoryName,
    setCategoryName,
  ] = useState('');

  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  async function loadMaster(
    silent = false,
  ) {
    if (!silent) {
      setLoading(true);
    }

    setError('');

    try {
      const response =
        await fetch(
          '/api/dishes',
          {
            cache:
              'no-store',
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not load Dish Master.',
        );
      }

      const loadedDishes:
        DishItem[] =
        Array.isArray(
          data.items,
        )
          ? data.items
              .filter(
                (
                  value: unknown,
                ) =>
                  value &&
                  typeof value ===
                    'object' &&
                  !Array.isArray(
                    value,
                  ),
              )
              .map(
                (
                  value: unknown,
                ) => {
                  const row =
                    value as Record<
                      string,
                      unknown
                    >;

                  return {
                    name:
                      String(
                        row.name ||
                          '',
                      ).trim(),
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
                    source:
                      String(
                        row.source ||
                          'global',
                      ) ===
                      'tenant'
                        ? 'tenant'
                        : 'global',
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
                  };
                },
              )
              .filter(
                (item: DishItem) =>
                  Boolean(
                    item.name,
                  ),
              )
          : [];

      const categories:
        string[] =
        Array.isArray(
          data.categories,
        )
          ? (
              data.categories as
                unknown[]
            )
              .map(
                (
                  value,
                ) =>
                  cleanText(
                    String(
                      value || '',
                    ),
                    60,
                  ),
              )
              .filter(
                (
                  value,
                ): value is string =>
                  Boolean(
                    value,
                  ),
              )
          : [];

      const personalCategories:
        string[] =
        Array.isArray(
          data.personalCategories,
        )
          ? (
              data.personalCategories as
                unknown[]
            )
              .map(
                (
                  value,
                ) =>
                  cleanText(
                    String(
                      value || '',
                    ),
                    60,
                  ),
              )
              .filter(
                (
                  value,
                ): value is string =>
                  Boolean(
                    value,
                  ),
              )
          : [];

      setDishes(
        loadedDishes,
      );

      setAllCategories(
        Array.from(
          new Set(
            [
              ...categories,
              ...loadedDishes.map(
                (dish) =>
                  dish.category,
              ),
            ].filter(
              Boolean,
            ),
          ),
        ).sort(
          (left, right) =>
            left.localeCompare(
              right,
            ),
        ),
      );

      setMyCategories(
        Array.from(
          new Set(
            personalCategories,
          ),
        ).sort(
          (left, right) =>
            left.localeCompare(
              right,
            ),
        ),
      );
    } catch (
      loadError
    ) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load Dish Master.',
      );
    } finally {
      setLoading(false);
      setReady(true);
    }
  }

  useEffect(() => {
    const session =
      getSession();

    if (!session) {
      router.replace(
        '/login',
      );
      return;
    }

    void loadMaster();
  }, [router]);

  const myDishes =
    useMemo(
      () =>
        dishes
          .filter(
            (dish) =>
              dish.source ===
              'tenant',
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
          ),
      [dishes],
    );

  const filteredDishes =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLocaleLowerCase(
            'en-IN',
          );

      return myDishes.filter(
        (dish) => {
          const matchesCategory =
            categoryFilter ===
              'ALL' ||
            dish.category ===
              categoryFilter;

          const searchable =
            [
              dish.name,
              dish.category,
              dish.subcategory ||
                '',
            ]
              .join(' ')
              .toLocaleLowerCase(
                'en-IN',
              );

          return (
            matchesCategory &&
            (
              !normalizedQuery ||
              searchable.includes(
                normalizedQuery,
              )
            )
          );
        },
      );
    }, [
      myDishes,
      query,
      categoryFilter,
    ]);

  const pricedCount =
    myDishes.filter(
      (dish) =>
        dish.rate > 0,
    ).length;

  const missingRateCount =
    Math.max(
      0,
      myDishes.length -
        pricedCount,
    );

  function openNewDish() {
    setDishDraft(
      emptyDish(
        myCategories[0] ||
          allCategories[0] ||
          'Other',
      ),
    );

    setMessage('');
    setError('');

    window.setTimeout(
      () =>
        document
          .getElementById(
            'myDishEditor',
          )
          ?.scrollIntoView({
            behavior:
              'smooth',
            block:
              'start',
          }),
      20,
    );
  }

  function editDish(
    dish: DishItem,
  ) {
    setDishDraft({
      previousName:
        dish.name,
      name:
        dish.name,
      category:
        dish.category,
      rate:
        dish.rate > 0
          ? String(
              dish.rate,
            )
          : '',
      servingQuantity:
        String(
          dish.servingQuantity ||
            1,
        ),
      servingUnit:
        dish.servingUnit ||
        'serving',
    });

    setMessage('');
    setError('');

    window.setTimeout(
      () =>
        document
          .getElementById(
            'myDishEditor',
          )
          ?.scrollIntoView({
            behavior:
              'smooth',
            block:
              'start',
          }),
      20,
    );
  }

  async function saveDish() {
    const name =
      cleanText(
        dishDraft.name,
      );

    const category =
      cleanText(
        dishDraft.category ||
          'Other',
        60,
      ) ||
      'Other';

    if (!name) {
      setError(
        'Enter a dish name.',
      );
      return;
    }

    setSavingDish(
      true,
    );
    setError('');
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/dishes',
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                name,
                previousName:
                  dishDraft
                    .previousName,
                category,
                rate:
                  Math.max(
                    0,
                    Number(
                      dishDraft.rate,
                    ) || 0,
                  ),
                servingQuantity:
                  Math.max(
                    0.01,
                    Number(
                      dishDraft
                        .servingQuantity,
                    ) || 1,
                  ),
                servingUnit:
                  cleanText(
                    dishDraft
                      .servingUnit,
                    30,
                  ) ||
                  'serving',
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save your dish.',
        );
      }

      await loadMaster(
        true,
      );

      setDishDraft(
        emptyDish(
          category,
        ),
      );

      setMessage(
        `${name} saved in My Dish Master. It is available for future events.`,
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save your dish.',
      );
    } finally {
      setSavingDish(
        false,
      );
    }
  }

  async function addCategory() {
    const name =
      cleanText(
        newCategoryName,
        60,
      );

    if (!name) {
      setError(
        'Enter a category name.',
      );
      return;
    }

    setSavingCategory(
      true,
    );
    setError('');
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/dish-categories',
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                name,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save your category.',
        );
      }

      await loadMaster(
        true,
      );

      setNewCategoryName(
        '',
      );

      setDishDraft(
        (current) => ({
          ...current,
          category:
            String(
              data.category ||
                name,
            ),
        }),
      );

      setMessage(
        `${String(
          data.category ||
            name,
        )} saved permanently in My Categories.`,
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save your category.',
      );
    } finally {
      setSavingCategory(
        false,
      );
    }
  }

  function beginCategoryEdit(
    name: string,
  ) {
    setEditingCategory(
      name,
    );
    setCategoryName(
      name,
    );
    setError('');
    setMessage('');
  }

  async function saveCategoryEdit() {
    if (
      !editingCategory
    ) {
      return;
    }

    const nextName =
      cleanText(
        categoryName,
        60,
      );

    if (!nextName) {
      setError(
        'Category name cannot be empty.',
      );
      return;
    }

    setSavingCategory(
      true,
    );
    setError('');
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/dish-categories',
          {
            method:
              'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                name:
                  nextName,
                previousName:
                  editingCategory,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not update your category.',
        );
      }

      const savedName =
        String(
          data.category ||
            nextName,
        );

      const previousName =
        editingCategory;

      await loadMaster(
        true,
      );

      setDishDraft(
        (current) => ({
          ...current,
          category:
            current.category ===
              previousName
              ? savedName
              : current.category,
        }),
      );

      setCategoryFilter(
        (current) =>
          current ===
            previousName
            ? savedName
            : current,
      );

      setEditingCategory(
        null,
      );
      setCategoryName(
        '',
      );

      setMessage(
        `${previousName} renamed to ${savedName}. Your saved dishes were updated.`,
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not update your category.',
      );
    } finally {
      setSavingCategory(
        false,
      );
    }
  }

  if (!ready) {
    return (
      <AppShell
        title="My Dish Master"
        hidePageTitle
      >
        <div className="loader-card">
          Loading your Dish Master…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="My Dish Master"
      subtitle="Manage your reusable dishes, rates and categories"
      hidePageTitle
    >
      <section className="content-grid my-dish-master-page">
        <section className="my-dish-master-hero">
          <div>
            <span>
              My reusable menu master
            </span>
            <h1>
              Dish Master
            </h1>
            <p>
              Add your own dishes, maintain cost per plate, edit dish details and keep private categories ready for every future event.
            </p>
          </div>

          <div className="my-dish-master-hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={
                openNewDish
              }
            >
              + Add New Dish
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                router.push(
                  '/app/event?resume=1',
                )
              }
            >
              Event & Menu
            </button>
          </div>
        </section>

        <section className="my-dish-master-stats">
          <article>
            <span>
              My dishes
            </span>
            <b>
              {myDishes.length}
            </b>
            <small>
              Reusable in every event
            </small>
          </article>

          <article
            className={
              missingRateCount
                ? 'attention'
                : 'ready'
            }
          >
            <span>
              Rates ready
            </span>
            <b>
              {pricedCount}/{myDishes.length}
            </b>
            <small>
              {missingRateCount}
              {' '}
              missing rate
              {missingRateCount ===
              1
                ? ''
                : 's'}
            </small>
          </article>

          <article>
            <span>
              My categories
            </span>
            <b>
              {myCategories.length}
            </b>
            <small>
              Private to this account
            </small>
          </article>
        </section>

        {message ? (
          <div className="my-dish-master-message">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="my-dish-master-message error">
            {error}
          </div>
        ) : null}

        <section className="my-dish-master-layout">
          <section
            className="glass-card my-dish-editor"
            id="myDishEditor"
          >
            <div className="my-dish-section-head">
              <div>
                <span>
                  Dish
                </span>
                <h2>
                  {dishDraft
                    .previousName
                    ? 'Edit My Dish'
                    : 'Add New Dish'}
                </h2>
                <p>
                  This saves only to this caterer account, not the Super Admin global master.
                </p>
              </div>

              {dishDraft
                .previousName ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={
                    openNewDish
                  }
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

            <div className="my-dish-form">
              <label>
                <span>
                  Dish name
                </span>
                <input
                  className="input"
                  value={
                    dishDraft.name
                  }
                  placeholder="e.g. Paneer Angara"
                  maxLength={120}
                  onChange={(
                    event,
                  ) =>
                    setDishDraft(
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
                <select
                  className="select"
                  value={
                    dishDraft
                      .category
                  }
                  onChange={(
                    event,
                  ) =>
                    setDishDraft(
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
                  {Array.from(
                    new Set([
                      ...allCategories,
                      dishDraft
                        .category ||
                        'Other',
                    ]),
                  )
                    .filter(
                      Boolean,
                    )
                    .map(
                      (
                        category,
                      ) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {category}
                        </option>
                      ),
                    )}
                </select>
              </label>

              <label>
                <span>
                  Cost / plate
                </span>
                <div className="my-dish-money-input">
                  <i>
                    ₹
                  </i>
                  <input
                    value={
                      dishDraft.rate
                    }
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    onChange={(
                      event,
                    ) =>
                      setDishDraft(
                        (
                          current,
                        ) => ({
                          ...current,
                          rate:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>
              </label>

              <label>
                <span>
                  Serving quantity
                </span>
                <input
                  className="input"
                  value={
                    dishDraft
                      .servingQuantity
                  }
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  onChange={(
                    event,
                  ) =>
                    setDishDraft(
                      (
                        current,
                      ) => ({
                        ...current,
                        servingQuantity:
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
                  Serving unit
                </span>
                <select
                  className="select"
                  value={
                    dishDraft
                      .servingUnit
                  }
                  onChange={(
                    event,
                  ) =>
                    setDishDraft(
                      (
                        current,
                      ) => ({
                        ...current,
                        servingUnit:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="serving">
                    serving
                  </option>
                  <option value="piece">
                    piece
                  </option>
                  <option value="gram">
                    gram
                  </option>
                  <option value="kg">
                    kg
                  </option>
                  <option value="ml">
                    ml
                  </option>
                  <option value="ltr">
                    ltr
                  </option>
                </select>
              </label>
            </div>

            <button
              className="primary-button my-dish-save"
              type="button"
              disabled={
                savingDish ||
                !dishDraft
                  .name
                  .trim()
              }
              onClick={() =>
                void saveDish()
              }
            >
              {savingDish
                ? 'Saving…'
                : dishDraft
                    .previousName
                  ? 'Save Dish Changes'
                  : 'Save to My Dish Master'}
            </button>
          </section>

          <section className="glass-card my-category-manager">
            <div className="my-dish-section-head">
              <div>
                <span>
                  Categories
                </span>
                <h2>
                  My Categories
                </h2>
                <p>
                  Add once, reuse in all future events, and rename whenever needed.
                </p>
              </div>
            </div>

            <div className="my-category-add">
              <input
                className="input"
                value={
                  newCategoryName
                }
                placeholder="New category e.g. Live Pasta"
                maxLength={60}
                onChange={(
                  event,
                ) =>
                  setNewCategoryName(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();
                    void addCategory();
                  }
                }}
              />

              <button
                className="secondary-button"
                type="button"
                disabled={
                  savingCategory ||
                  !newCategoryName
                    .trim()
                }
                onClick={() =>
                  void addCategory()
                }
              >
                {savingCategory
                  ? 'Saving…'
                  : '+ Add Category'}
              </button>
            </div>

            <div className="my-category-list">
              {myCategories.length ? (
                myCategories.map(
                  (category) => (
                    <article
                      key={
                        category
                      }
                    >
                      {editingCategory ===
                      category ? (
                        <>
                          <input
                            className="input"
                            value={
                              categoryName
                            }
                            maxLength={60}
                            onChange={(
                              event,
                            ) =>
                              setCategoryName(
                                event
                                  .target
                                  .value,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                'Enter'
                              ) {
                                event.preventDefault();
                                void saveCategoryEdit();
                              }
                            }}
                          />

                          <div>
                            <button
                              className="ghost-button"
                              type="button"
                              disabled={
                                savingCategory
                              }
                              onClick={() => {
                                setEditingCategory(
                                  null,
                                );
                                setCategoryName(
                                  '',
                                );
                              }}
                            >
                              Cancel
                            </button>

                            <button
                              className="primary-button"
                              type="button"
                              disabled={
                                savingCategory ||
                                !categoryName
                                  .trim()
                              }
                              onClick={() =>
                                void saveCategoryEdit()
                              }
                            >
                              Save
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>
                            <b>
                              {category}
                            </b>
                            <small>
                              {
                                myDishes.filter(
                                  (
                                    dish,
                                  ) =>
                                    dish.category ===
                                    category,
                                ).length
                              }
                              {' '}
                              dish
                              {myDishes.filter(
                                (
                                  dish,
                                ) =>
                                  dish.category ===
                                  category,
                              ).length ===
                              1
                                ? ''
                                : 'es'}
                            </small>
                          </span>

                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() =>
                              beginCategoryEdit(
                                category,
                              )
                            }
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </article>
                  ),
                )
              ) : (
                <div className="my-category-empty">
                  <b>
                    No personal categories yet
                  </b>
                  <small>
                    Add a category above. It will remain available even before you add a dish.
                  </small>
                </div>
              )}
            </div>
          </section>
        </section>

        <section className="glass-card my-dish-list-card">
          <div className="my-dish-list-head">
            <div>
              <span>
                Saved dishes
              </span>
              <h2>
                My Dish Master
              </h2>
              <p>
                Only your private dishes are editable here. Super Admin global dishes remain unchanged.
              </p>
            </div>

            <strong>
              {filteredDishes.length}
              {' '}
              shown
            </strong>
          </div>

          <div className="my-dish-toolbar">
            <label className="my-dish-search">
              <span
                aria-hidden="true"
              >
                ⌕
              </span>
              <input
                value={
                  query
                }
                placeholder="Search dish or category…"
                onChange={(
                  event,
                ) =>
                  setQuery(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <select
              className="select"
              value={
                categoryFilter
              }
              onChange={(
                event,
              ) =>
                setCategoryFilter(
                  event.target
                    .value,
                )
              }
            >
              <option value="ALL">
                All categories
              </option>

              {Array.from(
                new Set(
                  myDishes.map(
                    (dish) =>
                      dish.category,
                  ),
                ),
              )
                .sort(
                  (
                    left,
                    right,
                  ) =>
                    left.localeCompare(
                      right,
                    ),
                )
                .map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {category}
                    </option>
                  ),
                )}
            </select>
          </div>

          {loading ? (
            <div className="loader-card">
              Refreshing Dish Master…
            </div>
          ) : filteredDishes.length ? (
            <div className="my-dish-grid">
              {filteredDishes.map(
                (dish) => (
                  <article
                    key={
                      dish.name
                    }
                    className={
                      dish.rate > 0
                        ? ''
                        : 'needs-rate'
                    }
                  >
                    <div className="my-dish-card-head">
                      <div>
                        <b>
                          {dish.name}
                        </b>
                        <small>
                          {dish.category}
                        </small>
                      </div>

                      <span>
                        My dish
                      </span>
                    </div>

                    <div className="my-dish-card-metrics">
                      <div>
                        <small>
                          Cost / plate
                        </small>
                        <strong>
                          {dish.rate > 0
                            ? money(
                                dish.rate,
                              )
                            : 'Rate needed'}
                        </strong>
                      </div>

                      <div>
                        <small>
                          Serving
                        </small>
                        <strong>
                          {dish.servingQuantity ||
                            1}
                          {' '}
                          {dish.servingUnit ||
                            'serving'}
                        </strong>
                      </div>
                    </div>

                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        editDish(
                          dish,
                        )
                      }
                    >
                      Edit Dish & Rate
                    </button>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <h3>
                  {myDishes.length
                    ? 'No matching dishes'
                    : 'Your Dish Master is empty'}
                </h3>
                <p>
                  {myDishes.length
                    ? 'Clear the search or category filter.'
                    : 'Add your first reusable dish and rate above.'}
                </p>
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={
                  openNewDish
                }
              >
                + Add New Dish
              </button>
            </div>
          )}
        </section>
      </section>

      <style>{`
        .my-dish-master-page {
          gap: 14px;
        }

        .my-dish-master-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 22px;
          border: 1px solid #283441;
          border-radius: 18px;
          background:
            radial-gradient(circle at 96% 8%, rgba(74,156,255,.14), transparent 24rem),
            linear-gradient(145deg, #111923, #0d141c);
        }

        .my-dish-master-hero > div:first-child > span,
        .my-dish-section-head > div > span,
        .my-dish-list-head > div > span {
          color: #6faeff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .my-dish-master-hero h1 {
          margin: 5px 0 5px;
          color: #f0f5fb;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .my-dish-master-hero p,
        .my-dish-section-head p,
        .my-dish-list-head p {
          margin: 0;
          max-width: 760px;
          color: #8190a3;
          font-size: 10px;
          line-height: 1.5;
        }

        .my-dish-master-hero-actions {
          display: flex;
          gap: 8px;
          flex: 0 0 auto;
        }

        .my-dish-master-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .my-dish-master-stats article {
          padding: 12px 13px;
          border: 1px solid rgba(148,163,184,.11);
          border-radius: 12px;
          background: rgba(255,255,255,.018);
        }

        .my-dish-master-stats article.ready {
          border-color: rgba(85,217,143,.18);
          background: rgba(85,217,143,.035);
        }

        .my-dish-master-stats article.attention {
          border-color: rgba(244,173,84,.18);
          background: rgba(244,173,84,.035);
        }

        .my-dish-master-stats span,
        .my-dish-master-stats b,
        .my-dish-master-stats small {
          display: block;
        }

        .my-dish-master-stats span {
          color: #748398;
          font-size: 8px;
          font-weight: 800;
        }

        .my-dish-master-stats b {
          margin-top: 3px;
          color: #e7eef7;
          font-size: 20px;
        }

        .my-dish-master-stats small {
          margin-top: 2px;
          color: #68778b;
          font-size: 8px;
        }

        .my-dish-master-message {
          padding: 10px 12px;
          border: 1px solid rgba(85,217,143,.16);
          border-radius: 10px;
          color: #aadcc0;
          background: rgba(85,217,143,.04);
          font-size: 9px;
          font-weight: 750;
        }

        .my-dish-master-message.error {
          border-color: rgba(245,111,111,.18);
          color: #efaaaa;
          background: rgba(245,111,111,.04);
        }

        .my-dish-master-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr);
          gap: 12px;
          align-items: start;
        }

        .my-dish-editor,
        .my-category-manager,
        .my-dish-list-card {
          padding: 16px;
        }

        .my-dish-section-head,
        .my-dish-list-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .my-dish-section-head h2,
        .my-dish-list-head h2 {
          margin: 3px 0 3px;
          color: #e9f0f8;
          font-size: 18px;
        }

        .my-dish-form {
          display: grid;
          grid-template-columns: 1.3fr 1fr .75fr .7fr .7fr;
          gap: 8px;
        }

        .my-dish-form label > span {
          display: block;
          margin-bottom: 5px;
          color: #78889b;
          font-size: 8px;
          font-weight: 800;
        }

        .my-dish-money-input {
          min-height: 38px;
          display: flex;
          align-items: center;
          border: 1px solid #33404d;
          border-radius: 9px;
          background: #111820;
        }

        .my-dish-money-input:focus-within {
          border-color: rgba(74,156,255,.55);
          box-shadow: 0 0 0 3px rgba(74,156,255,.06);
        }

        .my-dish-money-input i {
          padding-left: 10px;
          color: #7890ab;
          font-size: 9px;
          font-style: normal;
          font-weight: 900;
        }

        .my-dish-money-input input {
          min-width: 0;
          width: 100%;
          padding: 0 10px 0 5px;
          border: 0;
          outline: 0;
          color: #e9f0f8;
          background: transparent;
          font: inherit;
          font-size: 10px;
        }

        .my-dish-save {
          margin-top: 11px;
          min-width: 190px;
        }

        .my-category-add {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 7px;
          margin-bottom: 10px;
        }

        .my-category-list {
          display: grid;
          gap: 6px;
          max-height: 315px;
          overflow-y: auto;
        }

        .my-category-list article {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 8px;
          border: 1px solid rgba(148,163,184,.10);
          border-radius: 9px;
          background: rgba(255,255,255,.018);
        }

        .my-category-list article > span {
          min-width: 0;
          flex: 1;
        }

        .my-category-list article > span b,
        .my-category-list article > span small {
          display: block;
        }

        .my-category-list article > span b {
          overflow: hidden;
          color: #dce6f1;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .my-category-list article > span small {
          margin-top: 2px;
          color: #6e7e92;
          font-size: 7px;
        }

        .my-category-list article > .input {
          min-width: 0;
          flex: 1;
        }

        .my-category-list article > div {
          display: flex;
          gap: 6px;
        }

        .my-category-list article button {
          min-height: 31px;
          padding: 0 9px;
          font-size: 8px;
        }

        .my-category-empty {
          padding: 18px;
          border: 1px dashed rgba(148,163,184,.13);
          border-radius: 10px;
          text-align: center;
        }

        .my-category-empty b,
        .my-category-empty small {
          display: block;
        }

        .my-category-empty b {
          color: #cfd9e5;
          font-size: 10px;
        }

        .my-category-empty small {
          margin-top: 3px;
          color: #718095;
          font-size: 8px;
          line-height: 1.45;
        }

        .my-dish-list-head > strong {
          flex: 0 0 auto;
          padding: 6px 9px;
          border-radius: 999px;
          color: #9fc8f7;
          background: rgba(74,156,255,.07);
          font-size: 8px;
        }

        .my-dish-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 8px;
          margin-bottom: 12px;
        }

        .my-dish-search {
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid #33404d;
          border-radius: 9px;
          background: #111820;
        }

        .my-dish-search > span {
          color: #71849a;
          font-size: 14px;
        }

        .my-dish-search input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          color: #e8eef6;
          background: transparent;
          font: inherit;
          font-size: 10px;
        }

        .my-dish-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
          gap: 8px;
        }

        .my-dish-grid article {
          min-width: 0;
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid #293441;
          border-radius: 12px;
          background: #131a22;
        }

        .my-dish-grid article.needs-rate {
          border-color: rgba(244,173,84,.20);
          background:
            linear-gradient(145deg, rgba(244,173,84,.045), transparent),
            #131a22;
        }

        .my-dish-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .my-dish-card-head b,
        .my-dish-card-head small {
          display: block;
        }

        .my-dish-card-head b {
          color: #edf3fa;
          font-size: 11px;
          line-height: 1.35;
        }

        .my-dish-card-head small {
          margin-top: 3px;
          color: #728196;
          font-size: 8px;
        }

        .my-dish-card-head > span {
          flex: 0 0 auto;
          padding: 3px 6px;
          border-radius: 999px;
          color: #9dc7f7;
          background: rgba(74,156,255,.08);
          font-size: 7px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .my-dish-card-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
          padding: 8px 0;
          border-top: 1px solid rgba(148,163,184,.08);
          border-bottom: 1px solid rgba(148,163,184,.08);
        }

        .my-dish-card-metrics small,
        .my-dish-card-metrics strong {
          display: block;
        }

        .my-dish-card-metrics small {
          color: #68788c;
          font-size: 7px;
        }

        .my-dish-card-metrics strong {
          margin-top: 2px;
          color: #cbd7e4;
          font-size: 9px;
        }

        @media (max-width: 980px) {
          .my-dish-master-layout {
            grid-template-columns: 1fr;
          }

          .my-dish-form {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .my-dish-master-hero {
            align-items: stretch;
            flex-direction: column;
            padding: 16px;
          }

          .my-dish-master-hero-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .my-dish-master-stats {
            grid-template-columns: 1fr 1fr;
          }

          .my-dish-master-stats article:first-child {
            grid-column: 1 / -1;
          }

          .my-dish-form,
          .my-dish-toolbar {
            grid-template-columns: 1fr;
          }

          .my-dish-save {
            width: 100%;
          }

          .my-category-add {
            grid-template-columns: 1fr;
          }

          .my-category-add button {
            width: 100%;
          }

          .my-category-list article {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
          }

          .my-category-list article > .input,
          .my-category-list article > div {
            grid-column: 1 / -1;
          }

          .my-category-list article > div {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .my-category-list article > div button {
            width: 100%;
          }

          .my-dish-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}
