'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import {
  CATEGORIES,
  saveDishCostItems,
  type Category,
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
  rate?: string;
  servingQuantity?: string;
  servingUnit?: string;
  aliases?: string;
};

const DISHES_PER_PAGE = 50;
const HINDI_SCRIPT = /[\u0900-\u097F]/u;
const GUJARATI_SCRIPT = /[\u0A80-\u0AFF]/u;

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
      const category = String(row.category || '').trim() as Category;
      const rate = Math.max(Number(row.rate) || 0, 0);
      const servingQuantity = Math.max(Number(row.servingQuantity) || 1, 0.01);
      const servingUnit = String(row.servingUnit || 'serving').trim() || 'serving';
      const aliases = Array.isArray(row.aliases)
        ? row.aliases.map((alias) => String(alias).trim()).filter(Boolean)
        : [];

      if (!name || !CATEGORIES.includes(category)) return null;
      return { name, category, rate, servingQuantity, servingUnit, aliases };
    })
    .filter((item): item is DishCostItem => item !== null);
}

function toDishCostItem(item: EditableDish): DishCostItem {
  return {
    name: item.name.trim(),
    category: item.category,
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
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | Category>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ERROR' | 'RECIPE' | 'NO_RECIPE'>('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const rowErrors = useMemo(() => validateRows(rows), [rows]);

  useEffect(() => {
    const session = getSession();
    if (session?.role !== 'ADMIN') return;

    async function loadRows() {
      try {
        const response = await fetch('/api/admin/dishes', { cache: 'no-store' });
        const data = await response.json();
        const recipeCatalog = createRecipeServingCatalog();
        const dishItems = parseDishItems(data.items);
        const cleaned = dishItems.map((item) => toEditableDish(item, recipeCatalog));
        const loadedRecipeServings = cleaned.some((item, index) =>
          item.servingQuantity !== dishItems[index]?.servingQuantity ||
          item.servingUnit !== dishItems[index]?.servingUnit
        );

        setRows(cleaned);
        saveDishCostItems(cleaned.map(toDishCostItem));
        if (loadedRecipeServings) {
          setDirty(true);
          setMessageType('success');
          setMessage('Serving quantities loaded from Recipes. Save all changes to publish them to client menus.');
        }
      } finally {
        setReady(true);
      }
    }

    void loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesCategory = categoryFilter === 'ALL' || row.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ERROR' && rowErrors.has(row.id)) ||
        (statusFilter === 'RECIPE' && Boolean(row.recipeServing)) ||
        (statusFilter === 'NO_RECIPE' && !row.recipeServing);
      const matchesSearch = !search || row.name.toLowerCase().includes(search) ||
        row.category.toLowerCase().includes(search) || allRowAliases(row).some((alias) => alias.toLowerCase().includes(search));
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [rows, query, categoryFilter, statusFilter, rowErrors]);
  const recipeLinkedCount = useMemo(
    () => rows.filter((row) => Boolean(row.recipeServing)).length,
    [rows],
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / DISHES_PER_PAGE));
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
      .filter((row) => row.name && CATEGORIES.includes(row.category as Category));
    try {
      const response = await fetch('/api/admin/dishes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cleaned }),
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
    setDirty(false);
    setMessageType('success');
    setMessage('Dish master reset to the default shared catalog.');
  }

  return (
    <AppShell title="Dish Master" subtitle="Admin can add dishes and edit category, serving quantity, aliases, and rate">
      <section className="content-grid">
        <div className={`dish-master-overview ${rowErrors.size ? 'needs-attention' : ''}`}>
          <div className="dish-master-overview-copy">
            <div className="section-kicker">Admin Control</div>
            <h2>Manage Dish Catalog</h2>
            <p>This catalog controls Menu matching, serving quantities, categories and default rates.</p>
          </div>

          <div className="dish-master-health" aria-label="Catalog health">
            <span><b>{rows.length}</b> dishes</span>
            <span><b>{CATEGORIES.length}</b> categories</span>
            <span><b>{recipeLinkedCount}</b> recipe linked</span>
            <span className={rowErrors.size ? 'needs-attention' : 'is-complete'}>
              <b>{rowErrors.size}</b> issues
            </span>
          </div>

          <div className="dish-master-actions">
            <button className="primary-button" onClick={addRow}>+ Add Dish</button>
            <button className="secondary-button" onClick={saveAll} disabled={saving || !dirty}>
              {saving ? 'Saving…' : dirty ? 'Save All Changes' : 'All Changes Saved'}
            </button>
            <button className="ghost-button dish-reset-button" onClick={resetAll}>Reset defaults</button>
          </div>
          {dirty ? <div className="dish-unsaved"><span />You have unsaved catalog changes</div> : null}
          {message ? <div className={`admin-message ${messageType}`} style={{ marginTop: 12, marginBottom: 0 }}>{message}</div> : null}
        </div>

        <div className="glass-card dish-master-filter-card">
          <div className="dish-list-heading">
            <div><span className="section-kicker">Find &amp; review</span><h2>Catalog filters</h2></div>
            <span className="badge">{filteredRows.length} shown</span>
          </div>
          <div className="dish-filter-grid">
            <div className="field">
              <label>Search Dish</label>
              <input className="input input-large" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Paneer, biryani, live counter..." />
            </div>
            <div className="field">
              <label>Category</label>
              <select className="select select-large" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | Category)}>
                <option value="ALL">All categories</option>
                {CATEGORIES.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Catalog Status</label>
              <select className="select select-large" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="ALL">All dishes</option>
                <option value="ERROR">Needs attention ({rowErrors.size})</option>
                <option value="RECIPE">Recipe linked ({recipeLinkedCount})</option>
                <option value="NO_RECIPE">Recipe not linked ({rows.length - recipeLinkedCount})</option>
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
        </div>

        {!ready ? <div className="glass-card">Loading...</div> : null}

        {ready ? (
          <div className="glass-card dish-master-list-card">
            <div className="dish-list-heading">
              <div><h2>Dish List</h2><p className="muted">Edit core details first. Open Aliases only when matching names need maintenance.</p></div>
              <div className="dish-list-actions">
                <span className="badge">{filteredRows.length} dishes</span>
                <button className="secondary-button" onClick={saveAll} disabled={saving || !dirty}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
            {filteredRows.length === 0 ? <div className="admin-empty"><strong>No dishes found</strong><span>Try another search, category or status.</span></div> : null}
            <div className="admin-dish-list">
              {visibleRows.map((row) => (
                <div className={`admin-dish-row ${rowErrors.has(row.id) ? 'admin-dish-row-error' : ''}`} key={row.id}>
                  <div className="field">
                    <label>Dish Name</label>
                    <input id={`dish-name-${row.id}`} className="input input-large" value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} placeholder="Paneer Butter Masala" />
                    {rowErrors.get(row.id)?.name ? <span className="field-error">{rowErrors.get(row.id)?.name}</span> : null}
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <select className="select select-large" value={row.category} onChange={(e) => updateRow(row.id, { category: e.target.value as Category })}>
                      {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Rate / Plate (Auto)</label>
                    <input className="input input-large" type="number" min="0" value={row.rate || ''} onChange={(e) => updateRow(row.id, { rate: Number(e.target.value) })} placeholder="0" />
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
                  <button className="admin-dish-delete" onClick={() => removeRow(row.id)}>Delete</button>
                </div>
              ))}
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
      </section>
    </AppShell>
  );
}
