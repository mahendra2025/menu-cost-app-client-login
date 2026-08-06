'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
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

type MarketRateProposal = {
  ingredientId: string;
  ingredientName: string;
  unit: IngredientUnit;
  currentRate: number;
  proposedRate: number;
  changePercent: number;
  commodity: string;
  market: string;
  arrivalDate: string;
  source: string;
  confidence: 'HIGH' | 'REVIEW';
};

type MarketRatePreview = {
  city: string;
  marketType: string;
  rateDate: string;
  source: string;
  marketsChecked: string[];
  proposals: MarketRateProposal[];
  unmatched: string[];
  supplierRequired: string[];
  warning?: string;
};

const PAGE_SIZE = 30;

function rowKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ingredient_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function hasDuplicate(rows: IngredientRow[], row: IngredientRow) {
  const id = normalizeIngredientId(row.name, row.unit);
  return rows.some((item) => item.rowKey !== row.rowKey && normalizeIngredientId(item.name, item.unit) === id);
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
  const [marketBusy, setMarketBusy] = useState(false);
  const [marketPreview, setMarketPreview] =
    useState<MarketRatePreview | null>(null);

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
    const search = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const usedBy = usage[row.originalId]?.length || 0;
        const needsAttention = !(Number(row.rate) > 0) || !row.name.trim() || hasDuplicate(rows, row);
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
  }, [rows, query, categoryFilter, statusFilter, sort, usage]);
  const categoryCount = categories.length;
  const visibleCategories = useMemo(() => {
    const search = categoryQuery.trim().toLowerCase();
    return categories.filter((category) => !search || category.toLowerCase().includes(search));
  }, [categories, categoryQuery]);
  const recipeLinkedCount = useMemo(() => rows.filter((row) => (usage[row.originalId]?.length || 0) > 0).length, [rows, usage]);
  const duplicateCount = useMemo(() => rows.filter((row) => hasDuplicate(rows, row)).length, [rows]);
  const missingRateCount = useMemo(() => rows.filter((row) => !(Number(row.rate) > 0)).length, [rows]);
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

  async function fetchCurrentMarketRates() {
    setMarketBusy(true);
    setMessage('');
    setMarketPreview(null);

    try {
      const response = await fetch(
        '/api/admin/ingredient-market-rates',
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            city: 'Silvassa',
            marketType: 'Wholesale',
            rates: rows.map((row) => ({
              id:
                row.originalId ||
                row.id ||
                normalizeIngredientId(
                  row.name,
                  row.unit,
                ),
              name: row.name,
              category: row.category,
              rate: Number(row.rate) || 0,
              unit: row.unit,
            })),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not fetch market rates.',
        );
      }

      setMarketPreview(
        data as MarketRatePreview,
      );
      setMessageType('success');
      setMessage(
        `${data.proposals.length} wholesale rate proposal${
          data.proposals.length === 1 ? '' : 's'
        } found. Review before applying.`,
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not fetch market rates.',
      );
    } finally {
      setMarketBusy(false);
    }
  }

  function applySafeMarketRates() {
    if (!marketPreview) return;

    const safeProposals =
      marketPreview.proposals.filter(
        (proposal) =>
          proposal.confidence === 'HIGH',
      );

    if (!safeProposals.length) {
      setMessageType('error');
      setMessage(
        'No safe automatic matches are available. Review and update rates manually.',
      );
      return;
    }

    const proposalById = new Map(
      safeProposals.map((proposal) => [
        proposal.ingredientId,
        proposal,
      ]),
    );

    setRows((current) =>
      current.map((row) => {
        const id =
          row.originalId ||
          row.id ||
          normalizeIngredientId(
            row.name,
            row.unit,
          );

        const proposal =
          proposalById.get(id);

        return proposal
          ? {
              ...row,
              rate:
                proposal.proposedRate,
            }
          : row;
      }),
    );

    setDirty(true);
    setMessageType('success');
    setMessage(
      `${safeProposals.length} safe market rate${
        safeProposals.length === 1 ? '' : 's'
      } applied. Save all changes to update linked recipes.`,
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

  async function saveAll() {
    if (rows.some((row) => !row.name.trim())) {
      setMessageType('error');
      setMessage('Every ingredient needs a name.');
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save ingredients.');
      setMessageType('success');
      setMessage('Ingredient Master saved to PostgreSQL. Recipes now use these categories and market rates.');
      await loadIngredients();
      setMessageType('success');
      setMessage('Ingredient Master saved to PostgreSQL. Recipes now use these categories and market rates.');
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Could not save ingredients.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Ingredients" subtitle="Maintain purchase units and market rates used by every recipe">
      <section className="content-grid ingredient-master">
        <div className={`ingredient-overview ${duplicateCount || missingRateCount ? 'needs-attention' : ''}`}>
          <div className="ingredient-overview-copy">
            <span className="section-kicker">Market rate catalog</span>
            <h2>{missingRateCount ? `${missingRateCount} rates need attention` : 'Your ingredient rates are ready'}</h2>
            <p>Accurate purchase rates keep recipe costs and Dish Catalog prices reliable.</p>
          </div>
          <div className="ingredient-health" aria-label="Ingredient catalog summary">
            <span><b>{rows.length}</b><small>Ingredients</small></span>
            <span><b>{categoryCount}</b><small>Categories</small></span>
            <span><b>{recipeLinkedCount}</b><small>Recipe linked</small></span>
            <span className={missingRateCount ? 'needs-attention' : 'is-complete'}><b>{missingRateCount}</b><small>Missing rates</small></span>
          </div>
          <div className="ingredient-actions">
            <button className="primary-button" type="button" onClick={addIngredient} disabled={!catalogReady}><span aria-hidden="true">＋</span> Add ingredient</button>
            <button className="ghost-button" type="button" onClick={addCategory} disabled={!catalogReady}><span aria-hidden="true">＋</span> Add category</button>
            <button className="secondary-button" type="button" onClick={saveAll} disabled={!dirty || saving || !catalogReady}>
              {saving ? 'Saving…' : dirty ? 'Save all changes' : 'All changes saved'}
            </button>
          </div>
          {dirty ? <div className="dish-unsaved"><span />You have unsaved ingredient changes</div> : null}
          {message ? <div className={`admin-message ${messageType}`}>{message}</div> : null}
          {!catalogReady ? <div className="admin-message error">Open Recipe Studio once to initialise the PostgreSQL recipe catalog.</div> : null}
        </div>

        <div className="glass-card market-rate-profile">
          <div className="market-rate-profile-heading">
            <div>
              <span className="section-kicker">
                Current market profile
              </span>
              <h2>Silvassa wholesale rates</h2>
              <p className="muted">
                Fetch AGMARKNET modal wholesale rates and keep supplier-only ingredients for manual review.
              </p>
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={marketBusy || !catalogReady}
              onClick={() =>
                void fetchCurrentMarketRates()
              }
            >
              {marketBusy
                ? 'Fetching rates…'
                : 'Fetch current rates'}
            </button>
          </div>

          <div className="market-rate-profile-grid">
            <div>
              <small>City</small>
              <strong>Silvassa</strong>
            </div>
            <div>
              <small>Market type</small>
              <strong>Wholesale</strong>
            </div>
            <div>
              <small>Rate date</small>
              <strong>
                {new Date().toLocaleDateString(
                  'en-IN',
                  {
                    timeZone:
                      'Asia/Kolkata',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  },
                )}
              </strong>
            </div>
            <div>
              <small>Source</small>
              <strong>
                AGMARKNET + Suppliers
              </strong>
            </div>
          </div>

          {marketPreview ? (
            <div className="market-rate-preview">
              <div className="market-rate-summary">
                <span>
                  <b>
                    {
                      marketPreview.proposals
                        .length
                    }
                  </b>
                  <small>Matched</small>
                </span>
                <span>
                  <b>
                    {
                      marketPreview.proposals.filter(
                        (proposal) =>
                          proposal.confidence ===
                          'HIGH',
                      ).length
                    }
                  </b>
                  <small>Safe matches</small>
                </span>
                <span>
                  <b>
                    {
                      marketPreview
                        .supplierRequired
                        .length
                    }
                  </b>
                  <small>Supplier rates</small>
                </span>
                <span>
                  <b>
                    {
                      marketPreview.unmatched
                        .length
                    }
                  </b>
                  <small>Not matched</small>
                </span>
              </div>

              {marketPreview.warning ? (
                <div className="admin-message error">
                  {marketPreview.warning}
                </div>
              ) : null}

              {marketPreview.proposals.length ? (
                <>
                  <div className="table-wrap market-rate-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Current</th>
                          <th>Proposed</th>
                          <th>Change</th>
                          <th>Market</th>
                          <th>Rate date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketPreview.proposals
                          .slice(0, 30)
                          .map((proposal) => (
                            <tr
                              key={`${proposal.ingredientId}-${proposal.commodity}`}
                            >
                              <td>
                                <b>
                                  {
                                    proposal.ingredientName
                                  }
                                </b>
                                <small>
                                  {
                                    proposal.commodity
                                  }
                                </small>
                              </td>
                              <td>
                                ₹
                                {proposal.currentRate.toLocaleString(
                                  'en-IN',
                                )}
                                /{proposal.unit}
                              </td>
                              <td>
                                <b>
                                  ₹
                                  {proposal.proposedRate.toLocaleString(
                                    'en-IN',
                                  )}
                                  /{proposal.unit}
                                </b>
                              </td>
                              <td>
                                {proposal.changePercent >
                                0
                                  ? '+'
                                  : ''}
                                {
                                  proposal.changePercent
                                }
                                %
                              </td>
                              <td>
                                {proposal.market}
                              </td>
                              <td>
                                {
                                  proposal.arrivalDate
                                }
                              </td>
                              <td>
                                <span
                                  className={
                                    proposal.confidence ===
                                    'HIGH'
                                      ? 'market-match-safe'
                                      : 'market-match-review'
                                  }
                                >
                                  {proposal.confidence ===
                                  'HIGH'
                                    ? 'Safe match'
                                    : 'Review'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="action-row">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={
                        applySafeMarketRates
                      }
                    >
                      Apply safe matches
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() =>
                        setMarketPreview(null)
                      }
                    >
                      Clear preview
                    </button>
                  </div>
                </>
              ) : (
                <div className="admin-empty">
                  <strong>
                    No automatic market matches
                  </strong>
                  <span>
                    Update supplier and unmatched
                    ingredients manually.
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <details className="glass-card dish-category-manager">
          <summary>
            <div>
              <span className="section-kicker">Category manager</span>
              <h2>Edit ingredient categories</h2>
              <p>Add, rename, or delete the categories used throughout the Ingredient Master.</p>
            </div>
            <span className="dish-category-summary-count">{categories.length} categories</span>
          </summary>
          <div className="dish-category-manager-body">
            <div className="dish-category-toolbar">
              <div className="dish-search-input">
                <span aria-hidden="true">⌕</span>
                <input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="Find a category…" aria-label="Find an ingredient category" />
                {categoryQuery ? <button type="button" onClick={() => setCategoryQuery('')} aria-label="Clear category search">×</button> : null}
              </div>
              <button className="primary-button" type="button" onClick={addCategory} disabled={!catalogReady}><span aria-hidden="true">＋</span> Add category</button>
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
                          <small>{assignedCount} ingredient{assignedCount === 1 ? '' : 's'}{protectedCategory ? ' · Fallback' : ''}</small>
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
            ) : <div className="admin-empty dish-category-empty"><strong>No categories found</strong><span>Try another search.</span></div>}
          </div>
        </details>

        <div className="glass-card ingredient-filter-card">
          <div className="dish-list-heading">
            <div><span className="section-kicker">Find &amp; review</span><h2>Find ingredients</h2><p className="muted">Search the catalog or isolate missing rates and recipe-linked ingredients.</p></div>
            <span className="badge">{filteredRows.length} of {rows.length}</span>
          </div>
          <div className="ingredient-filter-grid">
            <div className="field ingredient-search-field">
              <label htmlFor="ingredient-search">Search catalog</label>
              <div className="ingredient-search-input">
                <span aria-hidden="true">⌕</span>
                <input id="ingredient-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ingredient, category or unit…" />
                {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear ingredient search">×</button> : null}
              </div>
            </div>
            <div className="field">
              <label htmlFor="ingredient-category-filter">Category</label>
              <select id="ingredient-category-filter" className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}>
                <option value="ALL">All categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ingredient-sort">Sort by</label>
              <select id="ingredient-sort" className="select" value={sort} onChange={(event) => setSort(event.target.value as IngredientSort)}>
                <option value="NAME_ASC">Name A–Z</option>
                <option value="NAME_DESC">Name Z–A</option>
                <option value="RATE_HIGH">Highest rate</option>
                <option value="RATE_LOW">Lowest rate</option>
                <option value="MOST_USED">Most used</option>
              </select>
            </div>
            <button className="ghost-button" type="button" disabled={!query && categoryFilter === 'ALL' && statusFilter === 'ALL'} onClick={() => { setQuery(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); }}>Clear filters</button>
          </div>
          <div className="ingredient-status-filters" aria-label="Filter ingredients by status">
            {([
              ['ALL', 'All ingredients', rows.length],
              ['ATTENTION', 'Needs attention', rows.filter((row) => !(Number(row.rate) > 0) || !row.name.trim() || hasDuplicate(rows, row)).length],
              ['LINKED', 'Recipe linked', recipeLinkedCount],
              ['UNLINKED', 'Not linked', rows.length - recipeLinkedCount],
            ] as const).map(([value, label, count]) => (
              <button type="button" key={value} className={statusFilter === value ? 'active' : ''} aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)}>
                {label}<span>{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card ingredient-list-card">
          <div className="dish-list-heading">
            <div><span className="section-kicker">Ingredient editor</span><h2>Ingredient details</h2><p className="muted">Click a linked ingredient to open its first recipe. Editing controls remain available.</p></div>
            <div className="ingredient-list-actions"><span className="badge">{visibleStart}–{visibleEnd} of {filteredRows.length}</span><button className="secondary-button" type="button" onClick={saveAll} disabled={!dirty || saving || !catalogReady}>Save changes</button></div>
          </div>
          {selectedRows.length ? (
            <div className="ingredient-bulk-toolbar" role="region" aria-label="Bulk ingredient actions">
              <div className="ingredient-bulk-summary">
                <strong>{selectedRows.length} selected</strong>
                <button type="button" onClick={() => setSelectedRowKeys(new Set())}>Clear selection</button>
              </div>
              <div className="ingredient-bulk-control">
                <label htmlFor="bulk-ingredient-category">Category</label>
                <select id="bulk-ingredient-category" className="select" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}>
                  <option value="">Choose…</option>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <button type="button" className="ghost-button" disabled={!bulkCategory} onClick={applyBulkCategory}>Apply</button>
              </div>
              <div className="ingredient-bulk-control">
                <label htmlFor="bulk-ingredient-unit">Purchase unit</label>
                <select id="bulk-ingredient-unit" className="select" value={bulkUnit} onChange={(event) => setBulkUnit(event.target.value)}>
                  <option value="">Choose…</option>
                  {INGREDIENT_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                </select>
                <button type="button" className="ghost-button" disabled={!bulkUnit} onClick={applyBulkUnit}>Apply</button>
              </div>
              <div className="ingredient-bulk-control ingredient-bulk-rate">
                <label htmlFor="bulk-ingredient-rate">Rate change</label>
                <div><input id="bulk-ingredient-rate" className="input" type="number" step="0.1" min="-99.9" value={bulkRateChange} onChange={(event) => setBulkRateChange(event.target.value)} placeholder="e.g. 5" /><span>%</span></div>
                <button type="button" className="ghost-button" disabled={!bulkRateChange} onClick={applyBulkRateChange}>Apply</button>
              </div>
              <button className="ingredient-bulk-delete" type="button" disabled={selectedLinkedCount > 0} title={selectedLinkedCount ? 'Linked ingredients cannot be deleted' : 'Delete selected ingredients'} onClick={removeSelectedIngredients}>Delete selected</button>
            </div>
          ) : null}
          {!ready ? <div className="admin-empty"><span className="admin-loader" /><strong>Loading ingredients</strong></div> : null}
          {ready && messageType === 'error' && !rows.length ? <div className="ingredient-load-error"><strong>Ingredient catalog unavailable</strong><span>{message}</span><button className="ghost-button" type="button" onClick={() => void loadIngredients()}>Try again</button></div> : null}
          {ready && !visibleRows.length && !(messageType === 'error' && !rows.length) ? <div className="admin-empty"><strong>No ingredients found</strong><span>Try another search or add a new ingredient.</span></div> : null}
          {ready && visibleRows.length ? (
            <div className="ingredient-table-wrap">
              <table className="ingredient-table">
                <thead><tr><th><label className="ingredient-select-all"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} /><span>Select page</span></label></th><th>Category</th><th>Purchase unit</th><th>Rate per unit</th><th>Used in</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const usedByRecipes = usage[row.originalId] || [];
                    const usedBy = usedByRecipes.length;
                    const duplicate = hasDuplicate(rows, row);
                    return (
                      <tr
                        key={row.rowKey}
                        className={`${duplicate ? 'has-error ' : ''}${usedBy ? 'is-recipe-linked' : ''}`.trim()}
                        title={usedBy ? `Open ${usedByRecipes[0].name} in Recipe Studio` : undefined}
                        onClick={(event) => {
                          if (!usedBy) return;
                          if ((event.target as HTMLElement).closest('button, input, select, textarea, summary, a, label')) return;
                          window.location.href = `/admin/dishes?recipe=${encodeURIComponent(usedByRecipes[0].name)}#recipes`;
                        }}
                      >
                        <td data-label="Ingredient">
                          <div className="ingredient-name-field">
                            <input className="ingredient-row-check" type="checkbox" checked={selectedRowKeys.has(row.rowKey)} onChange={() => toggleRowSelection(row.rowKey)} aria-label={`Select ${row.name || 'new ingredient'}`} />
                            <span className="ingredient-initial" aria-hidden="true">{row.name.trim().charAt(0).toUpperCase() || '+'}</span>
                            <input
                              id={`ingredient-name-${row.rowKey}`}
                              className="input"
                              value={row.name}
                              onChange={(event) => {
                                const name = event.target.value;
                                updateRow(row.rowKey, { name, category: row.originalId ? row.category : inferIngredientCategory(name) });
                              }}
                              placeholder="Ingredient name"
                            />
                          </div>
                          {duplicate ? <small className="ingredient-row-error">Duplicate name and unit</small> : null}
                          {!duplicate && !(Number(row.rate) > 0) ? <small className="ingredient-row-warning">Add a market rate</small> : null}
                        </td>
                        <td data-label="Category"><select className="select ingredient-category-select" value={row.category} onChange={(event) => updateRow(row.rowKey, { category: event.target.value as IngredientCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></td>
                        <td data-label="Purchase unit"><select className="select" value={row.unit} onChange={(event) => updateRow(row.rowKey, { unit: event.target.value as IngredientUnit })}>{INGREDIENT_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></td>
                        <td data-label="Rate per unit"><div className={`ingredient-rate-input ${Number(row.rate) > 0 ? '' : 'is-missing'}`}><span className="ingredient-currency">₹</span><input className="input" aria-label={`Market rate for ${row.name || 'new ingredient'}`} type="number" min="0" step="0.01" value={row.rate || ''} placeholder="0.00" onChange={(event) => updateRow(row.rowKey, { rate: Math.max(0, Number(event.target.value) || 0) })} /><small>/{row.unit}</small></div></td>
                        <td data-label="Recipe usage">
                          {usedBy ? (
                            <div className="ingredient-recipe-links" aria-label={`${row.name} is used in ${usedBy} recipe${usedBy === 1 ? '' : 's'}`}>
                              <strong>{usedBy} recipe{usedBy === 1 ? '' : 's'}</strong>
                              {usedByRecipes.map((recipe) => (
                                <a key={recipe.id} href={`/admin/dishes?recipe=${encodeURIComponent(recipe.name)}#recipes`} title={`Open ${recipe.name} in Recipe Studio`}>
                                  <span>{recipe.name}</span><small>{formatIngredientQuantity(recipe.quantity, recipe.unit)}</small>
                                </a>
                              ))}
                            </div>
                          ) : <span className="ingredient-usage">Not linked</span>}
                        </td>
                        <td data-label="Actions"><button className="ingredient-delete" type="button" aria-label={`Delete ${row.name || 'ingredient'}`} title={usedBy ? 'Used ingredients cannot be deleted' : 'Delete ingredient'} disabled={usedBy > 0} onClick={() => removeIngredient(row)}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          {pageCount > 1 ? <div className="dish-pagination"><button className="ghost-button" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="ghost-button" type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div> : null}
        </div>
        {dirty ? (
          <div className="dish-save-dock ingredient-save-dock no-print" role="status">
            <div><span aria-hidden="true" /><strong>Unsaved rate changes</strong><small>Save to update recipe costing.</small></div>
            <div className="ingredient-save-dock-actions"><button className="ghost-button" type="button" onClick={discardChanges} disabled={saving}>Discard</button><button className="primary-button" type="button" onClick={saveAll} disabled={saving || !catalogReady}>{saving ? 'Saving…' : 'Save all changes'}</button></div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
