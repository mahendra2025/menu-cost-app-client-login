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
type UsageMap = Record<string, number>;

const PAGE_SIZE = 40;

function rowKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ingredient_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function hasDuplicate(rows: IngredientRow[], row: IngredientRow) {
  const id = normalizeIngredientId(row.name, row.unit);
  return rows.some((item) => item.rowKey !== row.rowKey && normalizeIngredientId(item.name, item.unit) === id);
}

export default function AdminIngredientsPage() {
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [usage, setUsage] = useState<UsageMap>({});
  const [ready, setReady] = useState(false);
  const [catalogReady, setCatalogReady] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | IngredientCategory>('ALL');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  async function loadIngredients() {
    setReady(false);
    setMessage('');
    try {
      const response = await fetch('/api/admin/ingredients', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load ingredients.');
      const loaded = Array.isArray(data.rates) ? data.rates as IngredientRate[] : [];
      setRows(loaded.map((rate) => ({ ...rate, rowKey: rowKey(), originalId: rate.id })));
      setUsage(data.usage && typeof data.usage === 'object' ? data.usage : {});
      setCatalogReady(data.ready !== false);
      setDirty(false);
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
      .filter((row) => (categoryFilter === 'ALL' || row.category === categoryFilter) &&
        (!search || row.name.toLowerCase().includes(search) || row.category.toLowerCase().includes(search) || row.unit.includes(search)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, query, categoryFilter]);
  const categoryCount = useMemo(() => new Set(rows.map((row) => row.category)).size, [rows]);
  const recipeLinkedCount = useMemo(() => rows.filter((row) => (usage[row.originalId] || 0) > 0).length, [rows, usage]);
  const duplicateCount = useMemo(() => rows.filter((row) => hasDuplicate(rows, row)).length, [rows]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [query, categoryFilter]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  function updateRow(key: string, patch: Partial<IngredientRow>) {
    setMessage('');
    setDirty(true);
    setRows((current) => current.map((row) => row.rowKey === key ? { ...row, ...patch } : row));
  }

  function addIngredient() {
    const key = rowKey();
    setRows((current) => [{
      rowKey: key,
      originalId: '',
      id: '',
      name: '',
      category: 'Vegetables & Herbs',
      rate: 0,
      unit: 'kg',
    }, ...current]);
    setQuery('');
    setCategoryFilter('ALL');
    setPage(1);
    setDirty(true);
    setMessage('');
    window.setTimeout(() => document.getElementById(`ingredient-name-${key}`)?.focus(), 60);
  }

  function removeIngredient(row: IngredientRow) {
    const usedBy = usage[row.originalId] || 0;
    if (usedBy > 0) {
      setMessageType('error');
      setMessage(`${row.name} is used by ${usedBy} recipe${usedBy === 1 ? '' : 's'} and cannot be deleted.`);
      return;
    }
    if (row.name && !window.confirm(`Delete ${row.name} from Ingredient Master?`)) return;
    setRows((current) => current.filter((item) => item.rowKey !== row.rowKey));
    setDirty(true);
    setMessage('');
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
        id: normalizeIngredientId(row.name, row.unit),
        name: row.name.trim(),
        category: row.category,
        rate: Math.max(0, Number(row.rate) || 0),
        unit: row.unit,
      }));
      const response = await fetch('/api/admin/ingredients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates }),
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
    <AppShell title="Ingredient Master" subtitle="Organise ingredients by category and maintain recipe market rates">
      <section className="content-grid ingredient-master">
        <div className={`ingredient-overview ${duplicateCount ? 'needs-attention' : ''}`}>
          <div>
            <span className="section-kicker">Recipe inventory</span>
            <h2>Ingredient Index</h2>
            <p>One place for ingredient names, categories, purchase units and current market rates.</p>
          </div>
          <div className="ingredient-health" aria-label="Ingredient catalog summary">
            <span><b>{rows.length}</b> ingredients</span>
            <span><b>{categoryCount}</b> categories</span>
            <span><b>{recipeLinkedCount}</b> recipe linked</span>
            <span className={duplicateCount ? 'needs-attention' : 'is-complete'}><b>{duplicateCount}</b> duplicates</span>
          </div>
          <div className="ingredient-actions">
            <button className="primary-button" type="button" onClick={addIngredient} disabled={!catalogReady}>+ Add Ingredient</button>
            <button className="secondary-button" type="button" onClick={saveAll} disabled={!dirty || saving || !catalogReady}>
              {saving ? 'Saving…' : dirty ? 'Save All Changes' : 'All Changes Saved'}
            </button>
          </div>
          {dirty ? <div className="dish-unsaved"><span />You have unsaved ingredient changes</div> : null}
          {message ? <div className={`admin-message ${messageType}`}>{message}</div> : null}
          {!catalogReady ? <div className="admin-message error">Open Recipe Studio once to initialise the PostgreSQL recipe catalog.</div> : null}
        </div>

        <div className="glass-card ingredient-filter-card">
          <div className="dish-list-heading">
            <div><span className="section-kicker">Find &amp; organise</span><h2>Ingredient filters</h2></div>
            <span className="badge">{filteredRows.length} shown</span>
          </div>
          <div className="ingredient-filter-grid">
            <div className="field">
              <label>Search Ingredient</label>
              <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paneer, tomato, cumin…" />
            </div>
            <div className="field">
              <label>Category</label>
              <select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}>
                <option value="ALL">All categories</option>
                {INGREDIENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <button className="ghost-button" type="button" disabled={!query && categoryFilter === 'ALL'} onClick={() => { setQuery(''); setCategoryFilter('ALL'); }}>Clear filters</button>
          </div>
        </div>

        <div className="glass-card ingredient-list-card">
          <div className="dish-list-heading">
            <div><h2>Ingredients</h2><p className="muted">Recipe-linked names and units are protected so recipe costing stays connected.</p></div>
            <button className="secondary-button" type="button" onClick={saveAll} disabled={!dirty || saving || !catalogReady}>Save changes</button>
          </div>
          {!ready ? <div className="admin-empty"><span className="admin-loader" /><strong>Loading ingredients</strong></div> : null}
          {ready && !visibleRows.length ? <div className="admin-empty"><strong>No ingredients found</strong><span>Try another search or add a new ingredient.</span></div> : null}
          {ready && visibleRows.length ? (
            <div className="ingredient-table-wrap">
              <table className="ingredient-table">
                <thead><tr><th>Ingredient</th><th>Category</th><th>Purchase unit</th><th>Market rate</th><th>Recipe use</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const usedBy = usage[row.originalId] || 0;
                    const duplicate = hasDuplicate(rows, row);
                    return (
                      <tr key={row.rowKey} className={duplicate ? 'has-error' : ''}>
                        <td>
                          <input
                            id={`ingredient-name-${row.rowKey}`}
                            className="input"
                            value={row.name}
                            disabled={usedBy > 0}
                            onChange={(event) => {
                              const name = event.target.value;
                              updateRow(row.rowKey, { name, category: row.originalId ? row.category : inferIngredientCategory(name) });
                            }}
                            placeholder="Ingredient name"
                          />
                          {duplicate ? <small className="ingredient-row-error">Duplicate name and unit</small> : null}
                        </td>
                        <td><select className="select" value={row.category} onChange={(event) => updateRow(row.rowKey, { category: event.target.value as IngredientCategory })}>{INGREDIENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></td>
                        <td><select className="select" value={row.unit} disabled={usedBy > 0} onChange={(event) => updateRow(row.rowKey, { unit: event.target.value as IngredientUnit })}>{INGREDIENT_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></td>
                        <td><div className="ingredient-rate-input"><span>₹</span><input className="input" type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.rowKey, { rate: Math.max(0, Number(event.target.value) || 0) })} /></div></td>
                        <td><span className={`ingredient-usage ${usedBy ? 'linked' : ''}`}>{usedBy ? `${usedBy} recipe${usedBy === 1 ? '' : 's'}` : 'Not used'}</span></td>
                        <td><button className="ingredient-delete" type="button" aria-label={`Delete ${row.name || 'ingredient'}`} title={usedBy ? 'Used ingredients cannot be deleted' : 'Delete ingredient'} disabled={usedBy > 0} onClick={() => removeIngredient(row)}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
          {pageCount > 1 ? <div className="dish-pagination"><button className="ghost-button" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="ghost-button" type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div> : null}
        </div>
      </section>
    </AppShell>
  );
}
