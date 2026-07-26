'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import {
  CATEGORIES,
  saveDishCostItems,
  type DishCostItem,
} from '../../../lib/dishCostMaster';
import {
  createRecipeServingCatalog,
  findDishServing,
  type RecipeServing,
} from '../../../lib/recipeServings';
import { getSession, uid } from '../../../lib/store';

type EditableDish = DishCostItem & {
  id: string;
  aliasesText: string;
  hindiAliasesText: string;
  gujaratiAliasesText: string;
  recipeServing?: RecipeServing;
};
type DishRowErrors = {
  name?: string;
  category?: string;
  rate?: string;
  servingQuantity?: string;
  servingUnit?: string;
  aliases?: string;
};

const DISHES_PER_PAGE = 24;
const HINDI_SCRIPT = /[\u0900-\u097F]/u;
const GUJARATI_SCRIPT = /[\u0A80-\u0AFF]/u;
type DishSort = 'NAME_ASC' | 'NAME_DESC' | 'RATE_HIGH' | 'RATE_LOW';

function parseAliases(value: string) {
  return value.split(',').map((alias) => alias.trim()).filter(Boolean);
}

function allRowAliases(item: EditableDish) {
  return [
    ...parseAliases(item.aliasesText),
    ...parseAliases(item.hindiAliasesText),
    ...parseAliases(item.gujaratiAliasesText),
  ];
}

function isPlaceholderServing(item: DishCostItem) {
  return Number(item.servingQuantity ?? 1) === 1 &&
    String(item.servingUnit ?? 'serving').trim().toLowerCase() === 'serving';
}

function toEditableDish(
  item: DishCostItem,
  recipeCatalog = createRecipeServingCatalog(),
): EditableDish {
  const aliases = item.aliases ?? [];
  const recipeServing = findDishServing(
    item.name,
    item.category,
    recipeCatalog,
  );
  const useRecipeServing = Boolean(recipeServing && isPlaceholderServing(item));

  return {
    ...item,
    id: uid('dish_master'),
    servingQuantity: useRecipeServing ? recipeServing?.quantity : item.servingQuantity,
    servingUnit: useRecipeServing ? recipeServing?.unit : item.servingUnit,
    recipeServing,
    aliasesText: aliases.filter((alias) => !HINDI_SCRIPT.test(alias) && !GUJARATI_SCRIPT.test(alias)).join(', '),
    hindiAliasesText: aliases.filter((alias) => HINDI_SCRIPT.test(alias)).join(', '),
    gujaratiAliasesText: aliases.filter((alias) => GUJARATI_SCRIPT.test(alias)).join(', '),
  };
}

function parseDishItems(items: unknown): DishCostItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): DishCostItem | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name || '').trim();
      const category = String(row.category || '').trim();
      const subcategory = String(row.subcategory || '').trim();
      const rate = Math.max(Number(row.rate) || 0, 0);
      const servingQuantity = Math.max(Number(row.servingQuantity) || 1, 0.01);
      const servingUnit = String(row.servingUnit || 'serving').trim() || 'serving';
      const aliases = Array.isArray(row.aliases)
        ? row.aliases.map((alias) => String(alias).trim()).filter(Boolean)
        : [];

      if (!name || !category || category.length > 60 || subcategory.length > 60) return null;
      return { name, category, subcategory, rate, servingQuantity, servingUnit, aliases };
    })
    .filter((item): item is DishCostItem => item !== null);
}

function toDishCostItem(item: EditableDish): DishCostItem {
  return {
    name: item.name.trim(),
    category: item.category,
    subcategory: String(item.subcategory || '').trim(),
    rate: Math.max(Number(item.rate) || 0, 0),
    servingQuantity: Math.max(Number(item.servingQuantity) || 1, 0.01),
    servingUnit: String(item.servingUnit || 'serving').trim() || 'serving',
    aliases: allRowAliases(item),
  };
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function proportionalRate(
  currentRate: number,
  currentQuantity: number,
  nextQuantity: number,
) {
  if (!(currentQuantity > 0) || !(nextQuantity > 0)) return currentRate;
  return Math.round((currentRate * nextQuantity / currentQuantity) * 100) / 100;
}

function validateRows(rows: EditableDish[]) {
  const errors = new Map<string, DishRowErrors>();
  const nameOwners = new Map<string, string[]>();
  const aliasOwners = new Map<string, string[]>();

  rows.forEach((row) => {
    const rowErrors: DishRowErrors = {};
    const name = row.name.trim();
    const aliases = allRowAliases(row);

    if (!name) rowErrors.name = 'Dish name is required.';
    if (!row.category.trim()) rowErrors.category = 'Category is required.';
    if (!(Number(row.rate) > 0)) rowErrors.rate = 'Rate must be greater than 0.';
    if (!(Number(row.servingQuantity) > 0)) rowErrors.servingQuantity = 'Quantity must be greater than 0.';
    if (!String(row.servingUnit || '').trim()) rowErrors.servingUnit = 'Unit is required.';

    const duplicateAliasesInRow = aliases.filter((alias, index) => aliases.findIndex((item) => normalizeToken(item) === normalizeToken(alias)) !== index);
    if (duplicateAliasesInRow.length) rowErrors.aliases = 'Aliases in the same row must be unique.';

    const normalizedName = normalizeToken(name);
    if (normalizedName) {
      nameOwners.set(normalizedName, [...(nameOwners.get(normalizedName) ?? []), row.id]);
    }

    aliases.forEach((alias) => {
      const normalizedAlias = normalizeToken(alias);
      aliasOwners.set(normalizedAlias, [...(aliasOwners.get(normalizedAlias) ?? []), row.id]);
    });

    if (Object.keys(rowErrors).length) errors.set(row.id, rowErrors);
  });

  rows.forEach((row) => {
    const rowErrors = errors.get(row.id) ?? {};
    const normalizedName = normalizeToken(row.name);

    if (normalizedName && (nameOwners.get(normalizedName)?.length ?? 0) > 1) {
      rowErrors.name = 'Dish names must be unique.';
    }

    const aliases = allRowAliases(row);
    const hasConflictingAlias = aliases.some((alias) => (aliasOwners.get(normalizeToken(alias))?.length ?? 0) > 1);
    if (hasConflictingAlias) {
      rowErrors.aliases = 'Aliases must be unique across all dishes.';
    }

    if (Object.keys(rowErrors).length) errors.set(row.id, rowErrors);
  });

  return errors;
}

export default function AdminDishesPage() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<EditableDish[]>([]);
  const [categories, setCategories] = useState<string[]>([...CATEGORIES]);
  const [subcategories, setSubcategories] = useState<Record<string, string[]>>({});
  const [categoryQuery, setCategoryQuery] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ERROR' | 'RECIPE' | 'NO_RECIPE'>('ALL');
  const [sort, setSort] = useState<DishSort>('NAME_ASC');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const rowErrors = useMemo(() => validateRows(rows), [rows]);
  const availableCategories = useMemo(
    () => Array.from(new Set([
      ...categories,
      ...rows.map((row) => row.category.trim()).filter(Boolean),
    ])).sort((left, right) => left.localeCompare(right)),
    [categories, rows],
  );
  const visibleCategories = useMemo(() => {
    const search = categoryQuery.trim().toLowerCase();
    return availableCategories.filter((category) =>
      !search ||
      category.toLowerCase().includes(search) ||
      (subcategories[category] ?? []).some((subcategory) => subcategory.toLowerCase().includes(search))
    );
  }, [availableCategories, categoryQuery, subcategories]);
  const subcategoryCount = useMemo(
    () => Object.values(subcategories).reduce((total, items) => total + items.length, 0),
    [subcategories],
  );

  useEffect(() => {
    const session = getSession();
    if (session?.role !== 'ADMIN') return;

    async function loadRows() {
      try {
        const response = await fetch('/api/admin/dishes', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load dishes');
        const data = await response.json();
        const recipeCatalog = createRecipeServingCatalog();
        const dishItems = parseDishItems(data.items);
        const loadedCategories = Array.isArray(data.categories)
          ? data.categories.map((category: unknown) => String(category).trim()).filter(Boolean)
          : [...CATEGORIES];
        const loadedSubcategories = data.subcategories && typeof data.subcategories === 'object' && !Array.isArray(data.subcategories)
          ? Object.fromEntries(Object.entries(data.subcategories as Record<string, unknown>).map(([category, values]) => [
            category,
            Array.isArray(values) ? values.map((value) => String(value).trim()).filter(Boolean) : [],
          ]))
          : {};
        const cleaned = dishItems.map((item) => toEditableDish(item, recipeCatalog));
        const loadedRecipeServings = cleaned.some((item, index) =>
          item.servingQuantity !== dishItems[index]?.servingQuantity ||
          item.servingUnit !== dishItems[index]?.servingUnit
        );

        setRows(cleaned);
        setCategories(Array.from(new Set([...loadedCategories, ...cleaned.map((item) => item.category), 'Other'])));
        setSubcategories(loadedSubcategories);
        saveDishCostItems(cleaned.map(toDishCostItem));
        if (loadedRecipeServings) {
          setDirty(true);
          setMessageType('success');
          setMessage('Serving quantities loaded from Recipes. Save all changes to publish them to client menus.');
        }
      } catch {
        setMessageType('error');
        setMessage('Could not load the dish catalog. Refresh the page to try again.');
      } finally {
        setReady(true);
      }
    }

    void loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    const matches = rows.filter((row) => {
      const matchesCategory = categoryFilter === 'ALL' || row.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ERROR' && rowErrors.has(row.id)) ||
        (statusFilter === 'RECIPE' && Boolean(row.recipeServing)) ||
        (statusFilter === 'NO_RECIPE' && !row.recipeServing);
      const matchesSearch = !search || row.name.toLowerCase().includes(search) ||
        row.category.toLowerCase().includes(search) ||
        String(row.subcategory || '').toLowerCase().includes(search) ||
        allRowAliases(row).some((alias) => alias.toLowerCase().includes(search));
      return matchesCategory && matchesStatus && matchesSearch;
    });

    return matches.sort((left, right) => {
      if (sort === 'RATE_HIGH') return Number(right.rate) - Number(left.rate);
      if (sort === 'RATE_LOW') return Number(left.rate) - Number(right.rate);
      const nameOrder = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
      return sort === 'NAME_DESC' ? -nameOrder : nameOrder;
    });
  }, [rows, query, categoryFilter, statusFilter, rowErrors, sort]);
  const recipeLinkedCount = useMemo(
    () => rows.filter((row) => Boolean(row.recipeServing)).length,
    [rows],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / DISHES_PER_PAGE));
  const visibleStart = filteredRows.length ? ((page - 1) * DISHES_PER_PAGE) + 1 : 0;
  const visibleEnd = Math.min(page * DISHES_PER_PAGE, filteredRows.length);
  const visibleRows = useMemo(
    () => filteredRows.slice((page - 1) * DISHES_PER_PAGE, page * DISHES_PER_PAGE),
    [filteredRows, page],
  );

  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, statusFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnAboutUnsavedChanges);
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges);
  }, [dirty]);

  function updateRow(id: string, patch: Partial<EditableDish>) {
    setMessage('');
    setDirty(true);
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    const newRowId = uid('dish_master');
    setMessage('');
    setQuery('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
    setDirty(true);
    setRows((current) => [
      {
        id: newRowId,
        name: '',
        category: 'Sabji',
        subcategory: '',
        rate: 1,
        servingQuantity: 1,
        servingUnit: 'serving',
        aliases: [],
        aliasesText: '',
        hindiAliasesText: '',
        gujaratiAliasesText: '',
      },
      ...current,
    ]);

    window.setTimeout(() => {
      document.getElementById(`dish-name-${newRowId}`)?.focus();
    }, 80);
  }

  function addCategory() {
    const enteredName = window.prompt('New category name');
    if (enteredName === null) return;

    const category = enteredName.trim().replace(/\s+/g, ' ');
    if (!category) {
      setMessageType('error');
      setMessage('Enter a category name.');
      return;
    }
    if (category.length > 60) {
      setMessageType('error');
      setMessage('Category names must be 60 characters or fewer.');
      return;
    }

    const existingCategory = availableCategories.find(
      (item) => item.toLowerCase() === category.toLowerCase(),
    );
    if (existingCategory) {
      setCategoryFilter(existingCategory);
      setMessageType('error');
      setMessage(`${existingCategory} already exists.`);
      return;
    }

    setMessageType('success');
    setMessage(`${category} added. Save all changes to publish the category.`);
    setCategories((current) => [...current, category]);
    setSubcategories((current) => ({ ...current, [category]: current[category] ?? [] }));
    setCategoryFilter(category);
    setStatusFilter('ALL');
    setDirty(true);
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
    const existing = availableCategories.find(
      (item) => item.toLowerCase() === nextName.toLowerCase() && item !== category,
    );
    if (existing) {
      setMessageType('error');
      setMessage(`${existing} already exists.`);
      return;
    }

    setCategories((current) => current.map((item) => item === category ? nextName : item));
    setSubcategories((current) => {
      const next = { ...current, [nextName]: current[category] ?? [] };
      delete next[category];
      return next;
    });
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
      ? `Delete ${category}? Its ${assignedCount} dish${assignedCount === 1 ? '' : 'es'} will be moved to Other.`
      : `Delete the ${category} category?`;
    if (!window.confirm(warning)) return;

    setCategories((current) => current.filter((item) => item !== category));
    setSubcategories((current) => {
      const next = { ...current };
      delete next[category];
      return next;
    });
    if (assignedCount) {
      setRows((current) => current.map((row) => row.category === category ? { ...row, category: 'Other', subcategory: '' } : row));
    }
    if (categoryFilter === category) setCategoryFilter('ALL');
    setDirty(true);
    setMessageType('success');
    setMessage(`${category} deleted${assignedCount ? ` and ${assignedCount} dish${assignedCount === 1 ? '' : 'es'} moved to Other` : ''}. Save all changes to publish.`);
  }

  function addSubcategory(category: string) {
    const enteredName = window.prompt(`New subcategory under ${category}`);
    if (enteredName === null) return;
    const subcategory = enteredName.trim().replace(/\s+/g, ' ');
    if (!subcategory || subcategory.length > 60) {
      setMessageType('error');
      setMessage('Subcategory names must contain 1–60 characters.');
      return;
    }
    const existing = (subcategories[category] ?? []).find((item) => item.toLowerCase() === subcategory.toLowerCase());
    if (existing) {
      setMessageType('error');
      setMessage(`${existing} already exists under ${category}.`);
      return;
    }
    setSubcategories((current) => ({ ...current, [category]: [...(current[category] ?? []), subcategory] }));
    setDirty(true);
    setMessageType('success');
    setMessage(`${subcategory} added under ${category}. Save all changes to publish.`);
  }

  function renameSubcategory(category: string, subcategory: string) {
    const enteredName = window.prompt(`Rename ${subcategory}`, subcategory);
    if (enteredName === null) return;
    const nextName = enteredName.trim().replace(/\s+/g, ' ');
    if (!nextName || nextName.length > 60) {
      setMessageType('error');
      setMessage('Subcategory names must contain 1–60 characters.');
      return;
    }
    const existing = (subcategories[category] ?? []).find(
      (item) => item.toLowerCase() === nextName.toLowerCase() && item !== subcategory,
    );
    if (existing) {
      setMessageType('error');
      setMessage(`${existing} already exists under ${category}.`);
      return;
    }
    setSubcategories((current) => ({
      ...current,
      [category]: (current[category] ?? []).map((item) => item === subcategory ? nextName : item),
    }));
    setRows((current) => current.map((row) =>
      row.category === category && row.subcategory === subcategory ? { ...row, subcategory: nextName } : row
    ));
    setDirty(true);
    setMessageType('success');
    setMessage(`${subcategory} renamed to ${nextName}.`);
  }

  function deleteSubcategory(category: string, subcategory: string) {
    const assignedCount = rows.filter((row) => row.category === category && row.subcategory === subcategory).length;
    const warning = assignedCount
      ? `Delete ${subcategory}? It will be cleared from ${assignedCount} dish${assignedCount === 1 ? '' : 'es'}.`
      : `Delete the ${subcategory} subcategory?`;
    if (!window.confirm(warning)) return;
    setSubcategories((current) => ({
      ...current,
      [category]: (current[category] ?? []).filter((item) => item !== subcategory),
    }));
    if (assignedCount) {
      setRows((current) => current.map((row) =>
        row.category === category && row.subcategory === subcategory ? { ...row, subcategory: '' } : row
      ));
    }
    setDirty(true);
    setMessageType('success');
    setMessage(`${subcategory} deleted${assignedCount ? ` and cleared from ${assignedCount} dish${assignedCount === 1 ? '' : 'es'}` : ''}.`);
  }

  function removeRow(id: string) {
    const selectedDish = rows.find((row) => row.id === id);
    if (
      selectedDish &&
      !window.confirm(`Delete ${selectedDish.name || 'this new dish'} from the catalog?`)
    ) return;

    setMessage('');
    setDirty(true);
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function updateServingQuantity(row: EditableDish, nextQuantity: number) {
    updateRow(row.id, {
      servingQuantity: nextQuantity,
      rate: proportionalRate(
        Number(row.rate) || 0,
        Number(row.servingQuantity) || 0,
        nextQuantity,
      ),
    });
  }

  function useRecipeServing(row: EditableDish) {
    if (!row.recipeServing) return;
    updateRow(row.id, {
      servingQuantity: row.recipeServing.quantity,
      servingUnit: row.recipeServing.unit,
      rate: proportionalRate(
        Number(row.rate) || 0,
        Number(row.servingQuantity) || 0,
        row.recipeServing.quantity,
      ),
    });
  }

  async function saveAll() {
    if (rowErrors.size > 0) {
      setMessage('Please fix the highlighted dish rows before saving.');
      setMessageType('error');
      return;
    }

    setSaving(true);
    setMessage('');
    const cleaned = rows
      .map(toDishCostItem)
      .filter((row) => row.name && row.category.trim());
    try {
      const response = await fetch('/api/admin/dishes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cleaned, categories: availableCategories, subcategories }),
      });
      if (!response.ok) throw new Error();
      saveDishCostItems(cleaned);
      const recipeCatalog = createRecipeServingCatalog();
      setRows(cleaned.map((item) => toEditableDish(item, recipeCatalog)));
      setDirty(false);
      setMessageType('success');
      setMessage('Dish catalog saved. Client menus now use these dishes and rates.');
    } catch {
      setMessageType('error');
      setMessage('Could not save dish master. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (!confirm('Reset every dish and rate to the default catalog? Your custom changes will be removed.')) return;
    setMessage('');
    const response = await fetch('/api/admin/dishes', { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Could not reset dish master. Please try again.');
      setMessageType('error');
      return;
    }

    const reload = await fetch('/api/admin/dishes', { cache: 'no-store' });
    const data = await reload.json();
    const recipeCatalog = createRecipeServingCatalog();
    const defaults = parseDishItems(data.items).map((item) => toEditableDish(item, recipeCatalog));
    saveDishCostItems(defaults.map(toDishCostItem));
    setRows(defaults);
    setCategories(Array.isArray(data.categories) ? data.categories.map((category: unknown) => String(category).trim()).filter(Boolean) : [...CATEGORIES]);
    setSubcategories(data.subcategories && typeof data.subcategories === 'object' && !Array.isArray(data.subcategories)
      ? Object.fromEntries(Object.entries(data.subcategories as Record<string, unknown>).map(([category, values]) => [
        category,
        Array.isArray(values) ? values.map((value) => String(value).trim()).filter(Boolean) : [],
      ]))
      : {});
    setDirty(false);
    setMessageType('success');
    setMessage('Dish master reset to the default shared catalog.');
  }

  return (
    <AppShell title="Dish Catalog" subtitle="Manage the dishes, serving sizes, aliases and default prices used across every menu">
      <section className="content-grid">
        <div className={`dish-master-overview ${rowErrors.size ? 'needs-attention' : ''}`}>
          <div className="dish-master-overview-copy">
            <div className="section-kicker">Catalog overview</div>
            <h2>{rowErrors.size ? `${rowErrors.size} dishes need attention` : 'Your dish catalog is ready'}</h2>
            <p>Changes here update menu matching, serving quantities and default plate prices for all clients.</p>
          </div>

          <div className="dish-master-health" aria-label="Catalog health">
            <span><b>{rows.length}</b> <small>Dishes</small></span>
            <span><b>{availableCategories.length}</b> <small>Categories</small></span>
            <span><b>{subcategoryCount}</b> <small>Subcategories</small></span>
            <span><b>{recipeLinkedCount}</b> <small>Recipe linked</small></span>
            <span className={rowErrors.size ? 'needs-attention' : 'is-complete'}>
              <b>{rowErrors.size}</b> <small>{rowErrors.size === 1 ? 'Issue' : 'Issues'}</small>
            </span>
          </div>

          <div className="dish-master-actions">
            <button className="primary-button" type="button" onClick={addRow}><span aria-hidden="true">＋</span> Add dish</button>
            <button className="ghost-button" type="button" onClick={addCategory}><span aria-hidden="true">＋</span> Add category</button>
            <button className="secondary-button" onClick={saveAll} disabled={saving || !dirty}>
              {saving ? 'Saving…' : dirty ? 'Save All Changes' : 'All Changes Saved'}
            </button>
            <button className="ghost-button dish-reset-button" type="button" onClick={resetAll}>Reset defaults</button>
          </div>
          {dirty ? <div className="dish-unsaved"><span />You have unsaved catalog changes</div> : null}
          {message ? <div className={`admin-message ${messageType}`} style={{ marginTop: 12, marginBottom: 0 }}>{message}</div> : null}
        </div>

        <details className="glass-card dish-category-manager">
          <summary>
            <div>
              <span className="section-kicker">Category manager</span>
              <h2>Edit categories &amp; subcategories</h2>
              <p>Organise dishes in two levels. Renaming automatically updates every assigned dish.</p>
            </div>
            <span className="dish-category-summary-count">{availableCategories.length} categories</span>
          </summary>
          <div className="dish-category-manager-body">
            <div className="dish-category-toolbar">
              <div className="dish-search-input">
                <span aria-hidden="true">⌕</span>
                <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="Find a category…" aria-label="Find a dish category" />
                {categoryQuery ? <button type="button" onClick={() => setCategoryQuery('')} aria-label="Clear category search">×</button> : null}
              </div>
              <button className="primary-button" type="button" onClick={addCategory}><span aria-hidden="true">＋</span> Add category</button>
            </div>
            {visibleCategories.length ? (
              <div className="dish-category-grid">
                {visibleCategories.map((category) => {
                  const assignedCount = rows.filter((row) => row.category === category).length;
                  const protectedCategory = category === 'Other';
                  const categorySubcategories = subcategories[category] ?? [];
                  return (
                    <div className={`dish-category-item ${protectedCategory ? 'is-protected' : ''}`} key={category}>
                      <div className="dish-category-item-heading">
                        <div>
                          <strong>{category}</strong>
                          <small>{assignedCount} dish{assignedCount === 1 ? '' : 'es'} · {categorySubcategories.length} subcategories{protectedCategory ? ' · Fallback' : ''}</small>
                        </div>
                        <div className="dish-category-item-actions">
                          <button type="button" onClick={() => renameCategory(category)} disabled={protectedCategory} aria-label={`Rename ${category}`}>Edit</button>
                          <button className="delete" type="button" onClick={() => deleteCategory(category)} disabled={protectedCategory} aria-label={`Delete ${category}`}>Delete</button>
                        </div>
                      </div>
                      <div className="dish-subcategory-section">
                        <button className="dish-add-subcategory" type="button" onClick={() => addSubcategory(category)} aria-label={`Add subcategory to ${category}`}><span aria-hidden="true">＋</span> Add subcategory</button>
                        {categorySubcategories.length ? (
                          <div className="dish-subcategory-list">
                            {categorySubcategories.map((subcategory) => {
                              const subAssignedCount = rows.filter((row) => row.category === category && row.subcategory === subcategory).length;
                              return (
                                <div className="dish-subcategory-chip" key={subcategory}>
                                  <span><b>{subcategory}</b><small>{subAssignedCount}</small></span>
                                  <button type="button" onClick={() => renameSubcategory(category, subcategory)} aria-label={`Rename ${subcategory}`}>Edit</button>
                                  <button className="delete" type="button" onClick={() => deleteSubcategory(category, subcategory)} aria-label={`Delete ${subcategory}`}>×</button>
                                </div>
                              );
                            })}
                          </div>
                        ) : <small className="dish-no-subcategories">No subcategories yet</small>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="admin-empty dish-category-empty"><strong>No categories found</strong><span>Try another search.</span></div>}
          </div>
        </details>

        <div className="glass-card dish-master-filter-card">
          <div className="dish-list-heading">
            <div><span className="section-kicker">Find &amp; review</span><h2>Find a dish</h2><p className="muted">Search names and aliases, or narrow the catalog by status.</p></div>
            <span className="badge">{filteredRows.length} of {rows.length}</span>
          </div>
          <div className="dish-filter-grid">
            <div className="field dish-search-field">
              <label htmlFor="dish-search">Search catalog</label>
              <div className="dish-search-input">
                <span aria-hidden="true">⌕</span>
                <input id="dish-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a dish, category or alias…" />
                {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button> : null}
              </div>
            </div>
            <div className="field">
              <label htmlFor="dish-category-filter">Category</label>
              <select id="dish-category-filter" className="select select-large" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="ALL">All categories</option>
                {availableCategories.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="dish-sort">Sort by</label>
              <select id="dish-sort" className="select select-large" value={sort} onChange={(e) => setSort(e.target.value as DishSort)}>
                <option value="NAME_ASC">Name A–Z</option>
                <option value="NAME_DESC">Name Z–A</option>
                <option value="RATE_HIGH">Highest price</option>
                <option value="RATE_LOW">Lowest price</option>
              </select>
            </div>
            <button
              className="ghost-button dish-filter-clear"
              type="button"
              disabled={!query && categoryFilter === 'ALL' && statusFilter === 'ALL'}
              onClick={() => {
                setQuery('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              Clear filters
            </button>
          </div>
          <div className="dish-status-filters" aria-label="Filter dishes by status">
            {([
              ['ALL', 'All dishes', rows.length],
              ['ERROR', 'Needs attention', rowErrors.size],
              ['RECIPE', 'Recipe linked', recipeLinkedCount],
              ['NO_RECIPE', 'No recipe', rows.length - recipeLinkedCount],
            ] as const).map(([value, label, count]) => (
              <button
                type="button"
                key={value}
                className={statusFilter === value ? 'active' : ''}
                aria-pressed={statusFilter === value}
                onClick={() => setStatusFilter(value)}
              >
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {!ready ? <div className="glass-card dish-loading" role="status"><span className="admin-loader" aria-hidden="true" /><strong>Loading dish catalog…</strong></div> : null}

        {ready ? (
          <div className="glass-card dish-master-list-card">
            <div className="dish-list-heading">
              <div><span className="section-kicker">Catalog editor</span><h2>Dish list</h2><p className="muted">Prices are per serving. Changing serving quantity adjusts the price proportionally.</p></div>
              <div className="dish-list-actions">
                <span className="badge">{visibleStart}–{visibleEnd} of {filteredRows.length}</span>
                <button className="secondary-button" onClick={saveAll} disabled={saving || !dirty}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
            {filteredRows.length === 0 ? <div className="admin-empty"><strong>No dishes found</strong><span>Try another search, category or status.</span></div> : null}
            <div className="admin-dish-list">
              {visibleRows.map((row, index) => {
                const rowSubcategories = Array.from(new Set([
                  ...(subcategories[row.category] ?? []),
                  ...(row.subcategory ? [row.subcategory] : []),
                ])).sort((left, right) => left.localeCompare(right));
                return (
                  <div className={`admin-dish-row ${rowErrors.has(row.id) ? 'admin-dish-row-error' : ''}`} key={row.id}>
                  <div className="admin-dish-row-heading">
                    <span className="dish-row-number">{visibleStart + index}</span>
                    <div>
                      <strong>{row.name.trim() || 'New dish'}</strong>
                      <small>{row.category || 'Uncategorised'}{row.subcategory ? ` / ${row.subcategory}` : ''} · ₹{Number(row.rate || 0).toLocaleString('en-IN')} per {row.servingUnit || 'serving'}</small>
                    </div>
                    <span className={`dish-row-status ${rowErrors.has(row.id) ? 'error' : row.recipeServing ? 'linked' : ''}`}>
                      {rowErrors.has(row.id) ? 'Needs attention' : row.recipeServing ? 'Recipe linked' : 'No recipe'}
                    </span>
                  </div>
                  <div className="field dish-name-field">
                    <label>Dish Name</label>
                    <input id={`dish-name-${row.id}`} className="input input-large" value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} placeholder="Paneer Butter Masala" />
                    {rowErrors.get(row.id)?.name ? <span className="field-error">{rowErrors.get(row.id)?.name}</span> : null}
                  </div>
                  <div className="field dish-category-field">
                    <label>Category</label>
                    <select className="select select-large" aria-label={`Category for ${row.name || 'new dish'}`} value={row.category} onChange={(e) => updateRow(row.id, { category: e.target.value, subcategory: '' })}>
                      {availableCategories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                    {rowErrors.get(row.id)?.category ? <span className="field-error">{rowErrors.get(row.id)?.category}</span> : null}
                  </div>
                  <div className="field dish-subcategory-field">
                    <label>Subcategory</label>
                    <select className="select select-large" aria-label={`Subcategory for ${row.name || 'new dish'}`} value={row.subcategory || ''} onChange={(e) => updateRow(row.id, { subcategory: e.target.value })}>
                      <option value="">No subcategory</option>
                      {rowSubcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
                    </select>
                    {!rowSubcategories.length ? <small className="dish-field-hint">Add one in Category manager</small> : null}
                  </div>
                  <div className="field dish-price-field">
                    <label>Price / serving</label>
                    <div className="dish-price-input">
                      <span aria-hidden="true">₹</span>
                      <input type="number" min="0" value={row.rate || ''} onChange={(e) => updateRow(row.id, { rate: Number(e.target.value) })} placeholder="0" aria-label={`Price per serving for ${row.name || 'new dish'}`} />
                    </div>
                    {rowErrors.get(row.id)?.rate ? <span className="field-error">{rowErrors.get(row.id)?.rate}</span> : null}
                  </div>
                  <div className="admin-serving-grid">
                    <div className="field">
                      <label>Serving Quantity</label>
                      <input className="input input-large" type="number" min="0.01" step="0.01" value={row.servingQuantity ?? 1} onChange={(e) => updateServingQuantity(row, Number(e.target.value))} placeholder="1" />
                      {rowErrors.get(row.id)?.servingQuantity ? <span className="field-error">{rowErrors.get(row.id)?.servingQuantity}</span> : null}
                    </div>
                    <div className="field">
                      <label>Serving Unit</label>
                      <input className="input input-large" value={row.servingUnit ?? 'serving'} onChange={(e) => updateRow(row.id, { servingUnit: e.target.value })} placeholder="serving" />
                      {rowErrors.get(row.id)?.servingUnit ? <span className="field-error">{rowErrors.get(row.id)?.servingUnit}</span> : null}
                    </div>
                    {row.recipeServing ? (
                      <div className="dish-recipe-serving">
                        <span>Suggested: <strong>{row.recipeServing.quantity} {row.recipeServing.unit}</strong></span>
                        <button className="ghost-button" type="button" onClick={() => useRecipeServing(row)}>Use suggested</button>
                      </div>
                    ) : (
                      <div className="dish-recipe-serving dish-recipe-serving-missing">No matching recipe serving</div>
                    )}
                  </div>
                  <details className="admin-alias-section" open={Boolean(rowErrors.get(row.id)?.aliases) || undefined}>
                    <summary>
                      <span>Aliases &amp; search names</span>
                      <small>
                        {rowErrors.get(row.id)?.aliases
                          ? 'Needs attention'
                          : `${allRowAliases(row).length} saved`}
                      </small>
                    </summary>
                    <div className="admin-alias-grid">
                      <div className="field">
                        <label>English / Roman Aliases</label>
                        <input className="input input-large" value={row.aliasesText} onChange={(e) => updateRow(row.id, { aliasesText: e.target.value })} placeholder="pbm, butter paneer" />
                        {rowErrors.get(row.id)?.aliases ? <span className="field-error">{rowErrors.get(row.id)?.aliases}</span> : null}
                      </div>
                      <div className="field">
                        <label>Hindi Aliases</label>
                        <input className="input input-large" lang="hi" value={row.hindiAliasesText} onChange={(e) => updateRow(row.id, { hindiAliasesText: e.target.value })} placeholder="पनीर बटर मसाला" />
                      </div>
                      <div className="field">
                        <label>Gujarati Aliases</label>
                        <input className="input input-large" lang="gu" value={row.gujaratiAliasesText} onChange={(e) => updateRow(row.id, { gujaratiAliasesText: e.target.value })} placeholder="પનીર બટર મસાલા" />
                      </div>
                    </div>
                  </details>
                  <button className="admin-dish-delete" type="button" onClick={() => removeRow(row.id)} aria-label={`Delete ${row.name || 'new dish'}`}>Delete dish</button>
                  </div>
                );
              })}
            </div>
            {filteredRows.length > DISHES_PER_PAGE ? (
              <div className="dish-pagination">
                <button className="ghost-button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span>Page <strong>{page}</strong> of {pageCount}</span>
                <button className="ghost-button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
              </div>
            ) : null}
          </div>
        ) : null}
        {dirty ? (
          <div className="dish-save-dock no-print" role="status">
            <div><span aria-hidden="true" /><strong>Unsaved changes</strong><small>Save to publish updates to client menus.</small></div>
            <button className="primary-button" type="button" onClick={saveAll} disabled={saving}>
              {saving ? 'Saving…' : 'Save all changes'}
            </button>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
