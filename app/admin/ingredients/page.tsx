'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import dynamic from 'next/dynamic';

import AppShell from '../../components/AppShell';

import type {
  BulkIngredientImportItem,
} from './BulkIngredientImporter';

const BulkIngredientImporter = dynamic(
  () => import('./BulkIngredientImporter'),
  {
    ssr: false,
    loading: () => (
      <div className="admin-lazy-loading">
        Opening Bulk Importer…
      </div>
    ),
  },
);
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  inferIngredientCategory,
  normalizeIngredientId,
  type IngredientCategory,
  type IngredientRate,
  type IngredientUnit,
} from '../../../lib/ingredientCatalog';

type IngredientRow = IngredientRate & { rowKey: string; originalId: string };
type RecipeUsage = { id: string; name: string; quantity: number; unit: string };
type UsageMap = Record<string, RecipeUsage[]>;
type IngredientStatus = 'ALL' | 'ATTENTION' | 'LINKED' | 'UNLINKED';
type IngredientSort = 'NAME_ASC' | 'NAME_DESC' | 'RATE_HIGH' | 'RATE_LOW' | 'MOST_USED';


const PAGE_SIZE = 30;

function rowKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ingredient_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function formatIngredientQuantity(quantity: number, unit: string) {
  if (!(quantity > 0)) return 'Quantity not set';
  return `${quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ''}`;
}

export default function AdminIngredientsPage() {
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [categories, setCategories] = useState<string[]>([...INGREDIENT_CATEGORIES]);
  const [usage, setUsage] = useState<UsageMap>({});
  const [ready, setReady] = useState(false);
  const [catalogReady, setCatalogReady] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IngredientStatus>('ALL');
  const [sort, setSort] = useState<IngredientSort>('NAME_ASC');
  const [page, setPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkUnit, setBulkUnit] = useState('');
  const [bulkRateChange, setBulkRateChange] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const deferredQuery =
    useDeferredValue(query);

  const deferredCategoryQuery =
    useDeferredValue(categoryQuery);

  /*
   * Fast duplicate index.
   * Previous code rescanned every ingredient
   * for every row.
   */
  const duplicateIdCounts =
    useMemo(() => {
      const counts =
        new Map<string, number>();

      rows.forEach((row) => {
        const id =
          normalizeIngredientId(
            row.name,
            row.unit,
          );

        counts.set(
          id,
          (counts.get(id) || 0) + 1,
        );
      });

      return counts;
    }, [rows]);

  const duplicateRowKeys =
    useMemo(() => {
      const duplicateKeys =
        new Set<string>();

      rows.forEach((row) => {
        const id =
          normalizeIngredientId(
            row.name,
            row.unit,
          );

        if (
          (duplicateIdCounts.get(id) || 0) >
          1
        ) {
          duplicateKeys.add(
            row.rowKey,
          );
        }
      });

      return duplicateKeys;
    }, [
      rows,
      duplicateIdCounts,
    ]);

  async function loadIngredients() {
    setReady(false);
    setMessage('');
    try {
      const response = await fetch('/api/admin/ingredients', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load ingredients.');
      const loaded = Array.isArray(data.rates) ? data.rates as IngredientRate[] : [];
      setRows(loaded.map((rate) => ({ ...rate, rowKey: rowKey(), originalId: rate.id })));
      setCategories(Array.isArray(data.categories) && data.categories.length ? data.categories : [...INGREDIENT_CATEGORIES]);
      setUsage(data.usage && typeof data.usage === 'object' ? data.usage : {});
      setCatalogReady(data.ready !== false);
      setDirty(false);
      setSelectedRowKeys(new Set());
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Could not load ingredients.');
    } finally {
      setReady(true);
    }
  }

  useEffect(() => { void loadIngredients(); }, []);

  const filteredRows = useMemo(() => {
    const search =
      deferredQuery
        .trim()
        .toLowerCase();
    return rows
      .filter((row) => {
        const usedBy = usage[row.originalId]?.length || 0;
        const needsAttention = !(Number(row.rate) > 0) || !row.name.trim() || duplicateRowKeys.has(row.rowKey);
        const matchesStatus = statusFilter === 'ALL' ||
          (statusFilter === 'ATTENTION' && needsAttention) ||
          (statusFilter === 'LINKED' && usedBy > 0) ||
          (statusFilter === 'UNLINKED' && usedBy === 0);
        return matchesStatus &&
          (categoryFilter === 'ALL' || row.category === categoryFilter) &&
          (!search || row.name.toLowerCase().includes(search) || row.category.toLowerCase().includes(search) || row.unit.includes(search));
      })
      .sort((a, b) => {
        if (sort === 'RATE_HIGH') return Number(b.rate) - Number(a.rate);
        if (sort === 'RATE_LOW') return Number(a.rate) - Number(b.rate);
        if (sort === 'MOST_USED') return (usage[b.originalId]?.length || 0) - (usage[a.originalId]?.length || 0) || a.name.localeCompare(b.name);
        const nameOrder = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        return sort === 'NAME_DESC' ? -nameOrder : nameOrder;
      });
  }, [
    rows,
    deferredQuery,
    categoryFilter,
    statusFilter,
    sort,
    usage,
    duplicateRowKeys,
  ]);
  const categoryCount = categories.length;
  const visibleCategories = useMemo(() => {
    const search =
      deferredCategoryQuery
        .trim()
        .toLowerCase();
    return categories.filter((category) => !search || category.toLowerCase().includes(search));
  }, [
    categories,
    deferredCategoryQuery,
  ]);
  const recipeLinkedCount = useMemo(() => rows.filter((row) => (usage[row.originalId]?.length || 0) > 0).length, [rows, usage]);

  const usedIngredientRows = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (usage[row.originalId]?.length || 0) > 0,
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            undefined,
            { sensitivity: 'base' },
          ),
        ),
    [rows, usage],
  );

  const totalRecipeLinks = useMemo(
    () =>
      usedIngredientRows.reduce(
        (total, row) =>
          total +
          (usage[row.originalId]?.length || 0),
        0,
      ),
    [usedIngredientRows, usage],
  );
  const duplicateCount =
    duplicateRowKeys.size;
  const missingRateCount = useMemo(() => rows.filter((row) => !(Number(row.rate) > 0)).length, [rows]);
  const attentionCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          !(Number(row.rate) > 0) ||
          !row.name.trim() ||
          duplicateRowKeys.has(row.rowKey),
      ).length,
    [rows, duplicateRowKeys],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleStart = filteredRows.length ? ((page - 1) * PAGE_SIZE) + 1 : 0;
  const visibleEnd = Math.min(page * PAGE_SIZE, filteredRows.length);
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowKeys.has(row.rowKey)),
    [rows, selectedRowKeys],
  );
  const selectedLinkedCount = selectedRows.filter((row) => (usage[row.originalId]?.length || 0) > 0).length;
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedRowKeys.has(row.rowKey));

  useEffect(() => { setPage(1); }, [query, categoryFilter, statusFilter, sort]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => {
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnAboutUnsavedChanges);
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
  }, [dirty]);

  function updateRow(key: string, patch: Partial<IngredientRow>) {
    setMessage('');
    setDirty(true);
    setRows((current) => current.map((row) => row.rowKey === key ? { ...row, ...patch } : row));
  }

  function toggleRowSelection(key: string) {
    setSelectedRowKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedRowKeys((current) => {
      const next = new Set(current);
      visibleRows.forEach((row) => {
        if (allVisibleSelected) next.delete(row.rowKey);
        else next.add(row.rowKey);
      });
      return next;
    });
  }

  function applyBulkCategory() {
    if (!bulkCategory || !selectedRows.length) return;
    setRows((current) => current.map((row) => selectedRowKeys.has(row.rowKey) ? { ...row, category: bulkCategory } : row));
    setDirty(true);
    setMessageType('success');
    setMessage(`${selectedRows.length} ingredient${selectedRows.length === 1 ? '' : 's'} moved to ${bulkCategory}.`);
  }

  function applyBulkUnit() {
    if (!bulkUnit || !selectedRows.length) return;
    setRows((current) => current.map((row) => selectedRowKeys.has(row.rowKey) ? { ...row, unit: bulkUnit as IngredientUnit } : row));
    setDirty(true);
    setMessageType('success');
    setMessage(`${selectedRows.length} purchase unit${selectedRows.length === 1 ? '' : 's'} changed to ${bulkUnit}.`);
  }

  function applyBulkRateChange() {
    const percentage = Number(bulkRateChange);
    if (!selectedRows.length || !Number.isFinite(percentage) || percentage === 0 || percentage <= -100) {
      setMessageType('error');
      setMessage('Enter a rate change greater than -100%, for example 5 or -10.');
      return;
    }
    const multiplier = 1 + (percentage / 100);
    setRows((current) => current.map((row) => selectedRowKeys.has(row.rowKey)
      ? { ...row, rate: Math.round(Math.max(0, Number(row.rate) * multiplier) * 100) / 100 }
      : row));
    setDirty(true);
    setMessageType('success');
    setMessage(`${selectedRows.length} rate${selectedRows.length === 1 ? '' : 's'} ${percentage > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentage)}%.`);
    setBulkRateChange('');
  }

  function removeSelectedIngredients() {
    if (!selectedRows.length) return;
    if (selectedLinkedCount) {
      setMessageType('error');
      setMessage(`${selectedLinkedCount} selected ingredient${selectedLinkedCount === 1 ? ' is' : 's are'} linked to recipes. Deselect them before deleting.`);
      return;
    }
    if (!window.confirm(`Delete ${selectedRows.length} selected ingredient${selectedRows.length === 1 ? '' : 's'}?`)) return;
    setRows((current) => current.filter((row) => !selectedRowKeys.has(row.rowKey)));
    setSelectedRowKeys(new Set());
    setDirty(true);
    setMessageType('success');
    setMessage(`${selectedRows.length} ingredient${selectedRows.length === 1 ? '' : 's'} removed. Save changes to publish.`);
  }

  function discardChanges() {
    if (!dirty || !window.confirm('Discard all unsaved ingredient changes?')) return;
    void loadIngredients();
  }

  function importBulkIngredients(
    items: BulkIngredientImportItem[],
  ) {
    if (!items.length) return;

    const existingIds =
      new Set(
        rows.map((row) =>
          normalizeIngredientId(
            row.name,
            row.unit,
          ),
        ),
      );

    const addedCount =
      items.filter(
        (item) =>
          !existingIds.has(
            normalizeIngredientId(
              item.name,
              item.unit,
            ),
          ),
      ).length;

    const updatedCount =
      items.length -
      addedCount;

    setRows((current) => {
      const next = [...current];

      items.forEach((item) => {
        const id =
          normalizeIngredientId(
            item.name,
            item.unit,
          );

        const index =
          next.findIndex(
            (row) =>
              normalizeIngredientId(
                row.name,
                row.unit,
              ) === id,
          );

        if (index >= 0) {
          next[index] = {
            ...next[index],
            name: item.name,
            rate: item.rate,
            unit: item.unit,
            category:
              item.category ||
              next[index].category,
          };

          return;
        }

        next.push({
          rowKey: rowKey(),
          originalId: '',
          id,
          name: item.name,
          rate: item.rate,
          unit: item.unit,
          category:
            item.category ||
            inferIngredientCategory(
              item.name,
            ),
        });
      });

      return next;
    });

    const importedCategories =
      items
        .map((item) =>
          item.category.trim(),
        )
        .filter(Boolean);

    setCategories((current) =>
      Array.from(
        new Map(
          [
            ...current,
            ...importedCategories,
          ].map((category) => [
            category.toLowerCase(),
            category,
          ]),
        ).values(),
      ),
    );

    setDirty(true);
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setQuery('');
    setPage(1);

    setMessageType('success');
    setMessage(
      `${addedCount} ingredient${
        addedCount === 1 ? '' : 's'
      } added · ${updatedCount} existing ingredient${
        updatedCount === 1 ? '' : 's'
      } updated. Save all changes to publish.`,
    );
  }

  function addIngredient() {
    const key = rowKey();
    setRows((current) => [{
      rowKey: key,
      originalId: '',
      id: '',
      name: '',
      category: categories[0] || 'Other',
      rate: 0,
      unit: 'kg',
    }, ...current]);
    setQuery('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
    setDirty(true);
    setMessage('');
    window.setTimeout(() => document.getElementById(`ingredient-name-${key}`)?.focus(), 60);
  }

  function removeIngredient(row: IngredientRow) {
    const usedBy = usage[row.originalId]?.length || 0;
    if (usedBy > 0) {
      setMessageType('error');
      setMessage(`${row.name} is used by ${usedBy} recipe${usedBy === 1 ? '' : 's'} and cannot be deleted.`);
      return;
    }
    if (row.name && !window.confirm(`Delete ${row.name} from Ingredient Master?`)) return;
    setRows((current) => current.filter((item) => item.rowKey !== row.rowKey));
    setSelectedRowKeys((current) => {
      const next = new Set(current);
      next.delete(row.rowKey);
      return next;
    });
    setDirty(true);
    setMessage('');
  }

  function addCategory() {
    const enteredName = window.prompt('New ingredient category name');
    if (enteredName === null) return;
    const category = enteredName.trim().replace(/\s+/g, ' ');
    if (!category || category.length > 60) {
      setMessageType('error');
      setMessage('Category names must contain 1–60 characters.');
      return;
    }
    const existing = categories.find((item) => item.toLowerCase() === category.toLowerCase());
    if (existing) {
      setCategoryFilter(existing);
      setMessageType('error');
      setMessage(`${existing} already exists.`);
      return;
    }
    setCategories((current) => [...current, category]);
    setCategoryFilter(category);
    setDirty(true);
    setMessageType('success');
    setMessage(`${category} added. Save all changes to publish it.`);
  }

  function renameCategory(category: string) {
    if (category === 'Other') {
      setMessageType('error');
      setMessage('Other is the protected fallback category and cannot be renamed.');
      return;
    }
    const enteredName = window.prompt(`Rename ${category}`, category);
    if (enteredName === null) return;
    const nextName = enteredName.trim().replace(/\s+/g, ' ');
    if (!nextName || nextName.length > 60) {
      setMessageType('error');
      setMessage('Category names must contain 1–60 characters.');
      return;
    }
    const existing = categories.find(
      (item) => item.toLowerCase() === nextName.toLowerCase() && item !== category,
    );
    if (existing) {
      setMessageType('error');
      setMessage(`${existing} already exists.`);
      return;
    }
    setCategories((current) => current.map((item) => item === category ? nextName : item));
    setRows((current) => current.map((row) => row.category === category ? { ...row, category: nextName } : row));
    if (categoryFilter === category) setCategoryFilter(nextName);
    setDirty(true);
    setMessageType('success');
    setMessage(`${category} renamed to ${nextName}. Save all changes to publish it.`);
  }

  function deleteCategory(category: string) {
    if (category === 'Other') {
      setMessageType('error');
      setMessage('Other is the protected fallback category and cannot be deleted.');
      return;
    }
    const assignedCount = rows.filter((row) => row.category === category).length;
    const warning = assignedCount
      ? `Delete ${category}? Its ${assignedCount} ingredient${assignedCount === 1 ? '' : 's'} will be moved to Other.`
      : `Delete the ${category} category?`;
    if (!window.confirm(warning)) return;
    setCategories((current) => current.filter((item) => item !== category));
    if (assignedCount) {
      setRows((current) => current.map((row) => row.category === category ? { ...row, category: 'Other' } : row));
    }
    if (categoryFilter === category) setCategoryFilter('ALL');
    setDirty(true);
    setMessageType('success');
    setMessage(`${category} deleted${assignedCount ? ` and ${assignedCount} ingredient${assignedCount === 1 ? '' : 's'} moved to Other` : ''}. Save all changes to publish.`);
  }

  function downloadUsedIngredientsCsv() {
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csvRows = [
      [
        'Ingredient',
        'Category',
        'Market Rate',
        'Unit',
        'Recipe Count',
        'Used In Recipes',
      ],
      ...usedIngredientRows.map((row) => {
        const recipeUsage =
          usage[row.originalId] || [];

        return [
          row.name,
          row.category,
          Number(row.rate) || 0,
          row.unit,
          recipeUsage.length,
          recipeUsage
            .map((recipe) => recipe.name)
            .join(', '),
        ];
      }),
    ];

    const csv = csvRows
      .map((row) =>
        row.map(escapeCsv).join(','),
      )
      .join('\n');

    const blob = new Blob(
      ['\ufeff', csv],
      {
        type:
          'text/csv;charset=utf-8;',
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;
    link.download =
      'used-ingredients.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function saveAll() {
    if (rows.some((row) => !row.name.trim())) {
      setMessageType('error');
      setMessage('Every ingredient needs a name.');
      return;
    }
    if (rows.some((row) => !(Number(row.rate) > 0))) {
      setMessageType('error');
      setMessage('Every ingredient needs a market rate greater than ₹0.');
      setStatusFilter('ATTENTION');
      setCategoryFilter('ALL');
      setQuery('');
      setSort('RATE_LOW');
      setPage(1);
      return;
    }
    if (duplicateCount) {
      setMessageType('error');
      setMessage('Remove duplicate ingredient name and unit combinations before saving.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const rates = rows.map((row) => ({
        originalId: row.originalId,
        id: normalizeIngredientId(row.name, row.unit),
        name: row.name.trim(),
        category: row.category,
        rate: Math.max(0, Number(row.rate) || 0),
        unit: row.unit,
      }));
      const response = await fetch('/api/admin/ingredients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates, categories }),
      });
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Could not save ingredients.',
        );
      }

      const syncResponse =
        await fetch(
          '/api/admin/recipes',
          {
            method: 'POST',
          },
        );

      const syncData =
        await syncResponse.json();

      if (!syncResponse.ok) {
        throw new Error(
          syncData.error ||
          'Ingredients saved, but Dish Master sync failed.',
        );
      }

      try {
        localStorage.removeItem(
          'admin_recipe_catalog_v1',
        );

        if (
          syncData.updatedAt
        ) {
          localStorage.setItem(
            'admin_recipe_dish_sync_v1',
            String(
              syncData.updatedAt,
            ),
          );
        }
      } catch {
        // Browser cache is optional.
      }

      await loadIngredients();

      const syncedDishes =
        Math.max(
          0,
          Number(
            syncData.syncedDishes,
          ) || 0,
        );

      setMessageType(
        'success',
      );

      setMessage(
        `Ingredient Master saved · Recipes recalculated · ${syncedDishes} dish${
          syncedDishes === 1
            ? ''
            : 'es'
        } synced to Dish Master.`,
      );
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Could not save ingredients.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Ingredients" subtitle="Master ingredient names, purchase units and global fallback rates">
      <section className="content-grid ingredient-master ingredient-master-v2">
        <section className={`ingredient-master-hero ${attentionCount ? 'needs-attention' : ''}`}>
          <div className="ingredient-master-hero-copy">
            <span className="section-kicker">Master Data · Ingredients</span>
            <h2>Keep every recipe cost anchored to clean ingredient data</h2>
            <p>
              Maintain the global fallback rate, purchase unit and category for each ingredient.
              Business and city rates can override these values later without changing this master.
            </p>

            <div className="ingredient-rate-priority-note">
              <span>Costing priority</span>
              <b>Business Rate</b>
              <i>→</i>
              <b>City Rate</b>
              <i>→</i>
              <b>Global Master</b>
            </div>
          </div>

          <div className="ingredient-master-hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={addIngredient}
              disabled={!catalogReady}
            >
              <span aria-hidden="true">＋</span>
              Add ingredient
            </button>

            <a
              className="secondary-button"
              href="/app/ingredients"
            >
              Business + City Rates
            </a>

            <a
              className="ghost-button"
              href="/admin/ingredients/health"
            >
              Rate Health
            </a>
          </div>
        </section>

        <section className="ingredient-master-stats" aria-label="Ingredient master summary">
          <button
            type="button"
            className={statusFilter === 'ALL' ? 'active' : ''}
            onClick={() => setStatusFilter('ALL')}
          >
            <small>Total ingredients</small>
            <strong>{rows.length}</strong>
            <span>{categoryCount} categories</span>
          </button>

          <button
            type="button"
            className={statusFilter === 'LINKED' ? 'active' : ''}
            onClick={() => setStatusFilter(statusFilter === 'LINKED' ? 'ALL' : 'LINKED')}
          >
            <small>Recipe linked</small>
            <strong>{recipeLinkedCount}</strong>
            <span>{totalRecipeLinks} recipe connections</span>
          </button>

          <button
            type="button"
            className={statusFilter === 'ATTENTION' ? 'active attention' : attentionCount ? 'attention' : ''}
            onClick={() => setStatusFilter(statusFilter === 'ATTENTION' ? 'ALL' : 'ATTENTION')}
          >
            <small>Needs attention</small>
            <strong>{attentionCount}</strong>
            <span>{missingRateCount} missing rate{missingRateCount === 1 ? '' : 's'} · {duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'}</span>
          </button>

          <div className={dirty ? 'dirty' : ''}>
            <small>Save status</small>
            <strong>{dirty ? 'Unsaved' : 'Saved'}</strong>
            <span>{dirty ? 'Changes waiting to publish' : 'Master is up to date'}</span>
          </div>
        </section>

        {message ? (
          <div className={`admin-message ${messageType} ingredient-master-message`} role="status">
            {message}
          </div>
        ) : null}

        {!catalogReady ? (
          <div className="admin-message error ingredient-master-message">
            Open Recipe Studio once to initialise the PostgreSQL recipe catalog.
          </div>
        ) : null}

        <section className="glass-card ingredient-command-bar">
          <div className="ingredient-command-top">
            <label className="ingredient-master-search" htmlFor="ingredient-search">
              <span aria-hidden="true">⌕</span>
              <input
                id="ingredient-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ingredient, category or unit…"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear ingredient search">×</button>
              ) : null}
            </label>

            <label className="field ingredient-command-field">
              <span>Category</span>
              <select
                className="select"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="ALL">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label className="field ingredient-command-field">
              <span>Sort</span>
              <select
                className="select"
                value={sort}
                onChange={(event) => setSort(event.target.value as IngredientSort)}
              >
                <option value="NAME_ASC">Name A–Z</option>
                <option value="NAME_DESC">Name Z–A</option>
                <option value="MOST_USED">Most used</option>
                <option value="RATE_HIGH">Highest rate</option>
                <option value="RATE_LOW">Lowest rate</option>
              </select>
            </label>

            <div className="ingredient-command-save">
              <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
              <button
                className="primary-button"
                type="button"
                onClick={saveAll}
                disabled={!dirty || saving || !catalogReady}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className="ingredient-command-bottom">
            <div className="ingredient-status-filters ingredient-status-filters-v2" aria-label="Filter ingredients by status">
              {([
                ['ALL', 'All', rows.length],
                ['ATTENTION', 'Needs attention', attentionCount],
                ['LINKED', 'Recipe linked', recipeLinkedCount],
                ['UNLINKED', 'Not linked', rows.length - recipeLinkedCount],
              ] as const).map(([value, label, count]) => (
                <button
                  type="button"
                  key={value}
                  className={statusFilter === value ? 'active' : ''}
                  aria-pressed={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>

            <div className="ingredient-command-meta">
              <span>
                Showing <b>{filteredRows.length}</b> of <b>{rows.length}</b>
              </span>
              {(query || categoryFilter !== 'ALL' || statusFilter !== 'ALL') ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setCategoryFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="glass-card ingredient-editor-card">
          <div className="ingredient-editor-heading">
            <div>
              <span className="section-kicker">Ingredient editor</span>
              <h2>Global ingredient master</h2>
              <p>
                Edit purchase unit and global fallback rate. Linked ingredients open directly into the Recipe Studio.
              </p>
            </div>

            <div className="ingredient-editor-heading-actions">
              <span>{visibleStart}–{visibleEnd} of {filteredRows.length}</span>
              <button className="secondary-button" type="button" onClick={addIngredient} disabled={!catalogReady}>
                ＋ Add row
              </button>
            </div>
          </div>

          {selectedRows.length ? (
            <div className="ingredient-bulk-toolbar ingredient-bulk-toolbar-v2" role="region" aria-label="Bulk ingredient actions">
              <div className="ingredient-bulk-summary">
                <strong>{selectedRows.length} selected</strong>
                <span>{selectedLinkedCount ? `${selectedLinkedCount} linked` : 'Ready for bulk edit'}</span>
                <button type="button" onClick={() => setSelectedRowKeys(new Set())}>Clear</button>
              </div>

              <div className="ingredient-bulk-control">
                <label htmlFor="bulk-ingredient-category">Category</label>
                <select
                  id="bulk-ingredient-category"
                  className="select"
                  value={bulkCategory}
                  onChange={(event) => setBulkCategory(event.target.value)}
                >
                  <option value="">Choose…</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <button type="button" className="ghost-button" disabled={!bulkCategory} onClick={applyBulkCategory}>Apply</button>
              </div>

              <div className="ingredient-bulk-control">
                <label htmlFor="bulk-ingredient-unit">Purchase unit</label>
                <select
                  id="bulk-ingredient-unit"
                  className="select"
                  value={bulkUnit}
                  onChange={(event) => setBulkUnit(event.target.value)}
                >
                  <option value="">Choose…</option>
                  {INGREDIENT_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                </select>
                <button type="button" className="ghost-button" disabled={!bulkUnit} onClick={applyBulkUnit}>Apply</button>
              </div>

              <div className="ingredient-bulk-control ingredient-bulk-rate">
                <label htmlFor="bulk-ingredient-rate">Rate change</label>
                <div>
                  <input
                    id="bulk-ingredient-rate"
                    className="input"
                    type="number"
                    step="0.1"
                    min="-99.9"
                    value={bulkRateChange}
                    onChange={(event) => setBulkRateChange(event.target.value)}
                    placeholder="e.g. 5"
                  />
                  <span>%</span>
                </div>
                <button type="button" className="ghost-button" disabled={!bulkRateChange} onClick={applyBulkRateChange}>Apply</button>
              </div>

              <button
                className="ingredient-bulk-delete"
                type="button"
                disabled={selectedLinkedCount > 0}
                title={selectedLinkedCount ? 'Linked ingredients cannot be deleted' : 'Delete selected ingredients'}
                onClick={removeSelectedIngredients}
              >
                Delete selected
              </button>
            </div>
          ) : null}

          {!ready ? (
            <div className="admin-empty ingredient-editor-empty">
              <span className="admin-loader" />
              <strong>Loading ingredients</strong>
            </div>
          ) : null}

          {ready && messageType === 'error' && !rows.length ? (
            <div className="ingredient-load-error">
              <strong>Ingredient catalog unavailable</strong>
              <span>{message}</span>
              <button className="ghost-button" type="button" onClick={() => void loadIngredients()}>Try again</button>
            </div>
          ) : null}

          {ready && !visibleRows.length && !(messageType === 'error' && !rows.length) ? (
            <div className="admin-empty ingredient-editor-empty">
              <strong>No ingredients found</strong>
              <span>Try another search or add a new ingredient.</span>
              <button className="secondary-button" type="button" onClick={addIngredient}>Add ingredient</button>
            </div>
          ) : null}

          {ready && visibleRows.length ? (
            <div className="ingredient-table-wrap ingredient-table-wrap-v2">
              <table className="ingredient-table ingredient-table-v2">
                <thead>
                  <tr>
                    <th className="ingredient-sticky-name">
                      <label className="ingredient-select-all">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleVisibleSelection}
                        />
                        <span>Ingredient</span>
                      </label>
                    </th>
                    <th>Category</th>
                    <th>Purchase unit</th>
                    <th>Global rate</th>
                    <th>Recipe usage</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((row) => {
                    const usedByRecipes = usage[row.originalId] || [];
                    const usedBy = usedByRecipes.length;
                    const duplicate = duplicateRowKeys.has(row.rowKey);
                    const missingRate = !(Number(row.rate) > 0);
                    const rowNeedsAttention = duplicate || missingRate || !row.name.trim();

                    return (
                      <tr
                        key={row.rowKey}
                        className={`${rowNeedsAttention ? 'has-error ' : ''}${usedBy ? 'is-recipe-linked ' : ''}${selectedRowKeys.has(row.rowKey) ? 'is-selected' : ''}`.trim()}
                        title={usedBy ? `Open ${usedByRecipes[0].name} in Recipe Studio` : undefined}
                        onClick={(event) => {
                          if (!usedBy) return;
                          if ((event.target as HTMLElement).closest('button, input, select, textarea, summary, a, label')) return;
                          window.location.href = `/admin/dishes?recipe=${encodeURIComponent(usedByRecipes[0].name)}#recipes`;
                        }}
                      >
                        <td data-label="Ingredient" className="ingredient-sticky-name">
                          <div className="ingredient-name-field ingredient-name-field-v2">
                            <input
                              className="ingredient-row-check"
                              type="checkbox"
                              checked={selectedRowKeys.has(row.rowKey)}
                              onChange={() => toggleRowSelection(row.rowKey)}
                              aria-label={`Select ${row.name || 'new ingredient'}`}
                            />

                            <span className="ingredient-initial" aria-hidden="true">
                              {row.name.trim().charAt(0).toUpperCase() || '+'}
                            </span>

                            <div className="ingredient-name-input-wrap">
                              <input
                                id={`ingredient-name-${row.rowKey}`}
                                className="input"
                                value={row.name}
                                onChange={(event) => {
                                  const name = event.target.value;
                                  updateRow(row.rowKey, {
                                    name,
                                    category: row.originalId ? row.category : inferIngredientCategory(name),
                                  });
                                }}
                                placeholder="Ingredient name"
                              />

                              <small>
                                {row.originalId ? 'Master ingredient' : 'New ingredient'}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td data-label="Category">
                          <select
                            className="select ingredient-category-select"
                            value={row.category}
                            onChange={(event) => updateRow(row.rowKey, { category: event.target.value as IngredientCategory })}
                          >
                            {categories.map((category) => <option key={category}>{category}</option>)}
                          </select>
                        </td>

                        <td data-label="Purchase unit">
                          <select
                            className="select ingredient-unit-select"
                            value={row.unit}
                            onChange={(event) => updateRow(row.rowKey, { unit: event.target.value as IngredientUnit })}
                          >
                            {INGREDIENT_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                          </select>
                        </td>

                        <td data-label="Global rate">
                          <div className={`ingredient-rate-input ingredient-rate-input-v2 ${Number(row.rate) > 0 ? '' : 'is-missing'}`}>
                            <span className="ingredient-currency">₹</span>
                            <input
                              className="input"
                              aria-label={`Global rate for ${row.name || 'new ingredient'}`}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={row.rate || ''}
                              placeholder="0.00"
                              onChange={(event) =>
                                updateRow(row.rowKey, {
                                  rate: Math.max(0, Number(event.target.value) || 0),
                                })
                              }
                            />
                            <small>/{row.unit}</small>
                          </div>
                        </td>

                        <td data-label="Recipe usage">
                          {usedBy ? (
                            <div className="ingredient-recipe-links ingredient-recipe-links-v2" aria-label={`${row.name} is used in ${usedBy} recipe${usedBy === 1 ? '' : 's'}`}>
                              <a
                                href={`/admin/dishes?recipe=${encodeURIComponent(usedByRecipes[0].name)}#recipes`}
                                title={`Open ${usedByRecipes[0].name} in Recipe Studio`}
                              >
                                <strong>{usedBy} recipe{usedBy === 1 ? '' : 's'}</strong>
                                <span>{usedByRecipes[0].name}</span>
                              </a>

                              {usedBy > 1 ? (
                                <small>+{usedBy - 1} more</small>
                              ) : (
                                <small>{formatIngredientQuantity(usedByRecipes[0].quantity, usedByRecipes[0].unit)}</small>
                              )}
                            </div>
                          ) : (
                            <span className="ingredient-usage ingredient-usage-v2">Not linked</span>
                          )}
                        </td>

                        <td data-label="Status">
                          <div className="ingredient-row-status">
                            {duplicate ? <span className="danger">Duplicate</span> : null}
                            {!duplicate && missingRate ? <span className="warning">Rate missing</span> : null}
                            {!rowNeedsAttention && usedBy ? <span className="ready">Ready</span> : null}
                            {!rowNeedsAttention && !usedBy ? <span>Unlinked</span> : null}
                          </div>
                        </td>

                        <td data-label="Actions">
                          <button
                            className="ingredient-delete ingredient-delete-v2"
                            type="button"
                            aria-label={`Delete ${row.name || 'ingredient'}`}
                            title={usedBy ? 'Used ingredients cannot be deleted' : 'Delete ingredient'}
                            disabled={usedBy > 0}
                            onClick={() => removeIngredient(row)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="ingredient-editor-footer">
            <span>
              {filteredRows.length
                ? `Showing ${visibleStart}–${visibleEnd} of ${filteredRows.length}`
                : 'No matching ingredients'}
            </span>

            {pageCount > 1 ? (
              <div className="dish-pagination ingredient-pagination-v2">
                <button
                  className="ghost-button"
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </button>
                <span>Page {page} of {pageCount}</span>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={page === pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="ingredient-secondary-tools">
          <div className="ingredient-secondary-tools-heading">
            <div>
              <span className="section-kicker">Master data tools</span>
              <h2>Import, categories and recipe usage</h2>
              <p>Open these only when you need maintenance or reporting work.</p>
            </div>
          </div>

          <BulkIngredientImporter
            categories={categories}
            onImport={importBulkIngredients}
          />

          <details className="glass-card dish-category-manager ingredient-tool-card">
            <summary>
              <div>
                <span className="section-kicker">Category manager</span>
                <h2>Edit ingredient categories</h2>
                <p>Add, rename, or delete categories used in Ingredient Master.</p>
              </div>
              <span className="dish-category-summary-count">{categories.length} categories</span>
            </summary>

            <div className="dish-category-manager-body">
              <div className="dish-category-toolbar">
                <div className="dish-search-input">
                  <span aria-hidden="true">⌕</span>
                  <input
                    value={categoryQuery}
                    onChange={(event) => setCategoryQuery(event.target.value)}
                    placeholder="Find a category…"
                    aria-label="Find an ingredient category"
                  />
                  {categoryQuery ? (
                    <button type="button" onClick={() => setCategoryQuery('')} aria-label="Clear category search">×</button>
                  ) : null}
                </div>

                <button className="primary-button" type="button" onClick={addCategory} disabled={!catalogReady}>
                  <span aria-hidden="true">＋</span>
                  Add category
                </button>
              </div>

              {visibleCategories.length ? (
                <div className="dish-category-grid">
                  {visibleCategories.map((category) => {
                    const assignedCount = rows.filter((row) => row.category === category).length;
                    const protectedCategory = category === 'Other';

                    return (
                      <div className={`dish-category-item ${protectedCategory ? 'is-protected' : ''}`} key={category}>
                        <div className="dish-category-item-heading">
                          <div>
                            <strong>{category}</strong>
                            <small>
                              {assignedCount} ingredient{assignedCount === 1 ? '' : 's'}
                              {protectedCategory ? ' · Fallback' : ''}
                            </small>
                          </div>

                          <div className="dish-category-item-actions">
                            <button type="button" onClick={() => renameCategory(category)} disabled={protectedCategory}>Edit</button>
                            <button className="delete" type="button" onClick={() => deleteCategory(category)} disabled={protectedCategory}>Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="admin-empty dish-category-empty">
                  <strong>No categories found</strong>
                  <span>Try another search.</span>
                </div>
              )}
            </div>
          </details>

          <details className="glass-card used-ingredient-card ingredient-tool-card">
            <summary>
              <div>
                <span className="section-kicker">Recipe usage</span>
                <h2>Used ingredients</h2>
                <p className="muted">See which ingredients are connected to recipes.</p>
              </div>

              <span className="dish-category-summary-count">
                {usedIngredientRows.length} ingredients
              </span>
            </summary>

            <div className="used-ingredient-body">
              <div className="used-ingredient-summary">
                <span><b>{usedIngredientRows.length}</b><small>Used ingredients</small></span>
                <span><b>{totalRecipeLinks}</b><small>Recipe links</small></span>
                <span>
                  <b>{usedIngredientRows.filter((row) => Number(row.rate) > 0).length}</b>
                  <small>Rates ready</small>
                </span>
                <span>
                  <b>{usedIngredientRows.filter((row) => !(Number(row.rate) > 0)).length}</b>
                  <small>Missing rates</small>
                </span>
              </div>

              <div className="used-ingredient-toolbar">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!usedIngredientRows.length}
                  onClick={downloadUsedIngredientsCsv}
                >
                  Download CSV
                </button>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setStatusFilter('LINKED');
                    setQuery('');
                    setCategoryFilter('ALL');
                    setSort('MOST_USED');
                    setPage(1);

                    document.getElementById('ingredient-search')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }}
                >
                  Open linked in editor
                </button>
              </div>

              {usedIngredientRows.length ? (
                <div className="table-wrap used-ingredient-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Category</th>
                        <th>Global rate</th>
                        <th>Unit</th>
                        <th>Recipes</th>
                        <th>Used in</th>
                      </tr>
                    </thead>

                    <tbody>
                      {usedIngredientRows.map((row) => {
                        const recipeUsage = usage[row.originalId] || [];

                        return (
                          <tr key={row.rowKey}>
                            <td><strong>{row.name}</strong></td>
                            <td>{row.category}</td>
                            <td>
                              {Number(row.rate) > 0 ? (
                                <strong>
                                  ₹{Number(row.rate).toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                                </strong>
                              ) : (
                                <span className="used-ingredient-missing-rate">Missing</span>
                              )}
                            </td>
                            <td>{row.unit}</td>
                            <td><span className="badge">{recipeUsage.length}</span></td>
                            <td>
                              <div className="used-ingredient-recipes">
                                {recipeUsage.slice(0, 5).map((recipe) => (
                                  <span key={recipe.id}>{recipe.name}</span>
                                ))}
                                {recipeUsage.length > 5 ? (
                                  <small>+{recipeUsage.length - 5} more</small>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty">
                  <strong>No used ingredients found</strong>
                  <span>Link ingredients to recipes first.</span>
                </div>
              )}
            </div>
          </details>
        </section>

        {dirty ? (
          <div className="ingredient-save-dock-v2 no-print" role="status">
            <div>
              <span className="ingredient-save-dot" aria-hidden="true" />
              <div>
                <strong>Unsaved ingredient changes</strong>
                <small>Save to update recipe costing and global fallback rates.</small>
              </div>
            </div>

            <div>
              <button className="ghost-button" type="button" onClick={discardChanges} disabled={saving}>Discard</button>
              <button className="primary-button" type="button" onClick={saveAll} disabled={saving || !catalogReady}>
                {saving ? 'Saving…' : 'Save all changes'}
              </button>
            </div>
          </div>
        ) : null}

        <style>{`
          .ingredient-master-v2 {
            --im-border: rgba(148,163,184,.12);
            --im-muted: #718096;
          }

          .ingredient-master-hero {
            display:flex;
            align-items:flex-end;
            justify-content:space-between;
            gap:22px;
            padding:20px 22px;
            border:1px solid rgba(74,156,255,.14);
            border-radius:16px;
            background:
              radial-gradient(circle at 86% 0%, rgba(74,156,255,.13), transparent 18rem),
              linear-gradient(135deg, rgba(18,27,39,.96), rgba(9,13,19,.98));
            box-shadow:0 14px 38px rgba(0,0,0,.2);
          }

          .ingredient-master-hero.needs-attention {
            border-color:rgba(244,182,74,.16);
          }

          .ingredient-master-hero-copy {
            max-width:760px;
          }

          .ingredient-master-hero h2 {
            margin:4px 0 7px;
            color:#f1f5f9;
            font-size:22px;
            letter-spacing:-.025em;
          }

          .ingredient-master-hero p {
            margin:0;
            color:#7f8fa4;
            font-size:10px;
            line-height:1.6;
          }

          .ingredient-rate-priority-note {
            display:flex;
            align-items:center;
            gap:7px;
            flex-wrap:wrap;
            margin-top:12px;
          }

          .ingredient-rate-priority-note span {
            color:#617188;
            font-size:8px;
            font-weight:800;
            text-transform:uppercase;
            letter-spacing:.055em;
          }

          .ingredient-rate-priority-note b {
            padding:4px 7px;
            border:1px solid rgba(148,163,184,.11);
            border-radius:7px;
            color:#aebdd0;
            background:rgba(255,255,255,.024);
            font-size:8px;
          }

          .ingredient-rate-priority-note i {
            color:#425166;
            font-style:normal;
            font-size:8px;
          }

          .ingredient-master-hero-actions {
            display:flex;
            gap:7px;
            flex-wrap:wrap;
            justify-content:flex-end;
          }

          .ingredient-master-hero-actions a {
            text-decoration:none;
          }

          .ingredient-master-stats {
            display:grid;
            grid-template-columns:repeat(4,minmax(0,1fr));
            gap:9px;
          }

          .ingredient-master-stats > button,
          .ingredient-master-stats > div {
            min-width:0;
            padding:12px 13px;
            border:1px solid var(--im-border);
            border-radius:12px;
            color:#8190a3;
            background:rgba(255,255,255,.018);
            text-align:left;
          }

          .ingredient-master-stats > button {
            font:inherit;
            cursor:pointer;
            transition:border-color .15s ease, background .15s ease, transform .15s ease;
          }

          .ingredient-master-stats > button:hover,
          .ingredient-master-stats > button.active {
            border-color:rgba(74,156,255,.3);
            background:rgba(74,156,255,.055);
            transform:translateY(-1px);
          }

          .ingredient-master-stats > button.attention {
            border-color:rgba(244,182,74,.19);
          }

          .ingredient-master-stats > div.dirty {
            border-color:rgba(244,182,74,.23);
            background:rgba(244,182,74,.035);
          }

          .ingredient-master-stats small,
          .ingredient-master-stats strong,
          .ingredient-master-stats span {
            display:block;
          }

          .ingredient-master-stats small {
            color:#718096;
            font-size:7px;
            font-weight:900;
            letter-spacing:.055em;
            text-transform:uppercase;
          }

          .ingredient-master-stats strong {
            margin:3px 0 1px;
            color:#edf3fa;
            font-size:20px;
            letter-spacing:-.03em;
          }

          .ingredient-master-stats span {
            color:#5f6f83;
            font-size:8px;
          }

          .ingredient-master-message {
            margin:0!important;
          }

          .ingredient-command-bar {
            position:sticky;
            top:64px;
            z-index:15;
            padding:12px 14px;
            border-color:rgba(74,156,255,.10);
            background:rgba(10,14,20,.94);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
          }

          .ingredient-command-top {
            display:grid;
            grid-template-columns:minmax(260px,1fr) 200px 180px auto;
            gap:8px;
            align-items:end;
          }

          .ingredient-master-search {
            display:grid;
            grid-template-columns:28px minmax(0,1fr) 28px;
            align-items:center;
            min-height:38px;
            border:1px solid rgba(148,163,184,.13);
            border-radius:9px;
            background:rgba(255,255,255,.025);
          }

          .ingredient-master-search > span {
            color:#607187;
            text-align:center;
            font-size:17px;
          }

          .ingredient-master-search input {
            min-width:0;
            border:0;
            outline:0;
            color:#e7eef7;
            background:transparent;
            font:inherit;
            font-size:10px;
          }

          .ingredient-master-search input::placeholder {
            color:#58697e;
          }

          .ingredient-master-search button {
            border:0;
            color:#718399;
            background:transparent;
            cursor:pointer;
          }

          .ingredient-command-field > span {
            font-size:7px!important;
          }

          .ingredient-command-save {
            display:flex;
            align-items:center;
            gap:8px;
            justify-content:flex-end;
          }

          .ingredient-command-save > span {
            color:#67788d;
            font-size:8px;
            white-space:nowrap;
          }

          .ingredient-command-bottom {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin-top:10px;
            padding-top:10px;
            border-top:1px solid rgba(148,163,184,.07);
          }

          .ingredient-status-filters-v2 {
            margin:0!important;
          }

          .ingredient-command-meta {
            display:flex;
            align-items:center;
            gap:10px;
            color:#607187;
            font-size:8px;
          }

          .ingredient-command-meta b {
            color:#a2b0c0;
          }

          .ingredient-command-meta button {
            padding:0;
            border:0;
            color:#7ba8dd;
            background:transparent;
            font:inherit;
            font-size:8px;
            cursor:pointer;
          }

          .ingredient-editor-card {
            padding:0!important;
            overflow:hidden;
          }

          .ingredient-editor-heading {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            padding:15px 16px 12px;
            border-bottom:1px solid rgba(148,163,184,.08);
          }

          .ingredient-editor-heading h2 {
            margin:3px 0 3px;
            color:#edf3fa;
            font-size:16px;
          }

          .ingredient-editor-heading p {
            margin:0;
            color:#6f7f93;
            font-size:8px;
          }

          .ingredient-editor-heading-actions {
            display:flex;
            align-items:center;
            gap:8px;
          }

          .ingredient-editor-heading-actions > span {
            color:#65768a;
            font-size:8px;
          }

          .ingredient-bulk-toolbar-v2 {
            margin:0!important;
            border-radius:0!important;
            border-width:0 0 1px!important;
            border-color:rgba(74,156,255,.11)!important;
            background:rgba(74,156,255,.025)!important;
          }

          .ingredient-bulk-summary span {
            display:block;
            color:#607187;
            font-size:7px;
          }

          .ingredient-table-wrap-v2 {
            max-height:calc(100vh - 250px);
            min-height:300px;
            overflow:auto;
          }

          .ingredient-table-v2 {
            min-width:1080px;
            border-collapse:separate;
            border-spacing:0;
          }

          .ingredient-table-v2 thead th {
            position:sticky;
            top:0;
            z-index:5;
            padding:9px 10px;
            border-bottom:1px solid rgba(148,163,184,.11);
            color:#6f8096;
            background:#0d1219;
            font-size:7px;
            font-weight:900;
            letter-spacing:.055em;
            text-transform:uppercase;
          }

          .ingredient-table-v2 thead th.ingredient-sticky-name {
            left:0;
            z-index:7;
          }

          .ingredient-table-v2 tbody td {
            padding:9px 10px;
            border-bottom:1px solid rgba(148,163,184,.06);
            vertical-align:middle;
          }

          .ingredient-table-v2 tbody tr {
            transition:background .14s ease;
          }

          .ingredient-table-v2 tbody tr:hover {
            background:rgba(74,156,255,.025);
          }

          .ingredient-table-v2 tbody tr.is-selected {
            background:rgba(74,156,255,.045);
          }

          .ingredient-table-v2 tbody tr.has-error {
            background:rgba(244,182,74,.022);
          }

          .ingredient-table-v2 td.ingredient-sticky-name {
            position:sticky;
            left:0;
            z-index:3;
            min-width:260px;
            background:#0d1219;
            box-shadow:10px 0 20px rgba(0,0,0,.10);
          }

          .ingredient-table-v2 tr:hover td.ingredient-sticky-name {
            background:#101720;
          }

          .ingredient-table-v2 tr.is-selected td.ingredient-sticky-name {
            background:#101a26;
          }

          .ingredient-name-field-v2 {
            grid-template-columns:18px 28px minmax(150px,1fr)!important;
          }

          .ingredient-name-input-wrap {
            min-width:0;
          }

          .ingredient-name-input-wrap .input {
            min-height:34px;
          }

          .ingredient-name-input-wrap small {
            display:block;
            margin-top:3px;
            color:#56667a;
            font-size:7px;
          }

          .ingredient-unit-select {
            min-width:100px;
          }

          .ingredient-rate-input-v2 {
            min-width:140px;
          }

          .ingredient-rate-input-v2 .input {
            min-width:72px;
          }

          .ingredient-recipe-links-v2 {
            min-width:150px;
          }

          .ingredient-recipe-links-v2 a {
            display:grid!important;
            gap:2px;
            text-decoration:none;
          }

          .ingredient-recipe-links-v2 a strong {
            color:#9abce4;
            font-size:8px;
          }

          .ingredient-recipe-links-v2 a span {
            max-width:180px;
            overflow:hidden;
            color:#aab8c8;
            font-size:8px;
            text-overflow:ellipsis;
            white-space:nowrap;
          }

          .ingredient-recipe-links-v2 > small {
            color:#5e6f83;
            font-size:7px;
          }

          .ingredient-usage-v2 {
            font-size:8px;
          }

          .ingredient-row-status {
            display:flex;
            flex-wrap:wrap;
            gap:4px;
            min-width:90px;
          }

          .ingredient-row-status span {
            padding:3px 6px;
            border:1px solid rgba(148,163,184,.10);
            border-radius:999px;
            color:#75869a;
            background:rgba(255,255,255,.02);
            font-size:7px;
            font-weight:800;
            white-space:nowrap;
          }

          .ingredient-row-status .ready {
            border-color:rgba(98,217,149,.16);
            color:#8dc9a2;
            background:rgba(98,217,149,.035);
          }

          .ingredient-row-status .warning {
            border-color:rgba(244,182,74,.18);
            color:#d1ae70;
            background:rgba(244,182,74,.04);
          }

          .ingredient-row-status .danger {
            border-color:rgba(248,113,113,.18);
            color:#d38c8c;
            background:rgba(248,113,113,.035);
          }

          .ingredient-delete-v2 {
            opacity:.42;
          }

          .ingredient-table-v2 tr:hover .ingredient-delete-v2 {
            opacity:1;
          }

          .ingredient-editor-footer {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            padding:10px 14px;
            border-top:1px solid rgba(148,163,184,.07);
            color:#617287;
            font-size:8px;
          }

          .ingredient-pagination-v2 {
            margin:0!important;
          }

          .ingredient-editor-empty {
            min-height:260px;
          }

          .ingredient-secondary-tools {
            display:grid;
            gap:10px;
          }

          .ingredient-secondary-tools-heading {
            padding:2px 2px 0;
          }

          .ingredient-secondary-tools-heading h2 {
            margin:3px 0;
            color:#dce5f0;
            font-size:14px;
          }

          .ingredient-secondary-tools-heading p {
            margin:0;
            color:#627287;
            font-size:8px;
          }

          .ingredient-tool-card summary {
            cursor:pointer;
          }

          .ingredient-save-dock-v2 {
            position:sticky;
            bottom:14px;
            z-index:18;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            width:min(720px,calc(100% - 24px));
            margin:0 auto;
            padding:10px 11px 10px 13px;
            border:1px solid rgba(244,182,74,.18);
            border-radius:13px;
            background:rgba(16,15,11,.95);
            box-shadow:0 16px 40px rgba(0,0,0,.34);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
          }

          .ingredient-save-dock-v2 > div {
            display:flex;
            align-items:center;
            gap:9px;
          }

          .ingredient-save-dot {
            width:7px;
            height:7px;
            border-radius:50%;
            background:#d2a556;
            box-shadow:0 0 0 4px rgba(210,165,86,.08);
          }

          .ingredient-save-dock-v2 strong,
          .ingredient-save-dock-v2 small {
            display:block;
          }

          .ingredient-save-dock-v2 strong {
            color:#e7dcc6;
            font-size:9px;
          }

          .ingredient-save-dock-v2 small {
            margin-top:2px;
            color:#786f5f;
            font-size:7px;
          }

          @media(max-width:1100px) {
            .ingredient-master-hero {
              align-items:flex-start;
              flex-direction:column;
            }

            .ingredient-master-hero-actions {
              justify-content:flex-start;
            }

            .ingredient-master-stats {
              grid-template-columns:repeat(2,minmax(0,1fr));
            }

            .ingredient-command-top {
              grid-template-columns:minmax(220px,1fr) 180px;
            }

            .ingredient-command-save {
              justify-content:flex-start;
            }
          }

          @media(max-width:760px) {
            .ingredient-master-hero {
              padding:16px;
            }

            .ingredient-master-hero h2 {
              font-size:18px;
            }

            .ingredient-master-hero-actions {
              display:grid;
              grid-template-columns:1fr;
              width:100%;
            }

            .ingredient-master-stats {
              grid-template-columns:1fr 1fr;
            }

            .ingredient-command-bar {
              position:static;
            }

            .ingredient-command-top {
              grid-template-columns:1fr;
            }

            .ingredient-command-bottom {
              align-items:flex-start;
              flex-direction:column;
            }

            .ingredient-status-filters-v2 {
              width:100%;
              overflow:auto;
            }

            .ingredient-status-filters-v2 button {
              flex:0 0 auto;
            }

            .ingredient-editor-heading {
              align-items:flex-start;
              flex-direction:column;
            }

            .ingredient-table-wrap-v2 {
              max-height:none;
            }

            .ingredient-save-dock-v2 {
              bottom:76px;
              align-items:stretch;
              flex-direction:column;
            }

            .ingredient-save-dock-v2 > div:last-child {
              display:grid;
              grid-template-columns:1fr 1fr;
            }
          }
        `}</style>
      </section>
    </AppShell>
  );
}
