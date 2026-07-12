'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import {
  CATEGORIES,
  saveDishCostItems,
  type Category,
  type DishCostItem,
} from '../../../lib/dishCostMaster';
import { getSession, uid } from '../../../lib/store';

type EditableDish = DishCostItem & { id: string; aliasesText: string };
type DishRowErrors = {
  name?: string;
  rate?: string;
  aliases?: string;
};

function toEditableDish(item: DishCostItem): EditableDish {
  return {
    ...item,
    id: uid('dish_master'),
    aliasesText: (item.aliases ?? []).join(', '),
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
      const aliases = Array.isArray(row.aliases)
        ? row.aliases.map((alias) => String(alias).trim()).filter(Boolean)
        : [];

      if (!name || !CATEGORIES.includes(category)) return null;
      return { name, category, rate, aliases };
    })
    .filter((item): item is DishCostItem => item !== null);
}

function toDishCostItem(item: EditableDish): DishCostItem {
  return {
    name: item.name.trim(),
    category: item.category,
    rate: Math.max(Number(item.rate) || 0, 0),
    aliases: item.aliasesText.split(',').map((alias) => alias.trim()).filter(Boolean),
  };
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function validateRows(rows: EditableDish[]) {
  const errors = new Map<string, DishRowErrors>();
  const nameOwners = new Map<string, string[]>();
  const aliasOwners = new Map<string, string[]>();

  rows.forEach((row) => {
    const rowErrors: DishRowErrors = {};
    const name = row.name.trim();
    const aliases = row.aliasesText.split(',').map((alias) => alias.trim()).filter(Boolean);

    if (!name) rowErrors.name = 'Dish name is required.';
    if (!(Number(row.rate) > 0)) rowErrors.rate = 'Rate must be greater than 0.';

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

    const aliases = row.aliasesText.split(',').map((alias) => alias.trim()).filter(Boolean);
    const hasConflictingAlias = aliases.some((alias) => (aliasOwners.get(normalizeToken(alias))?.length ?? 0) > 1);
    if (hasConflictingAlias) {
      rowErrors.aliases = 'Aliases must be unique across all dishes.';
    }

    const aliasMatchesDishName = aliases.some((alias) => normalizeToken(alias) === normalizedName);
    if (aliasMatchesDishName) {
      rowErrors.aliases = 'Do not repeat the dish name inside aliases.';
    }

    if (Object.keys(rowErrors).length) errors.set(row.id, rowErrors);
  });

  return errors;
}

export default function AdminDishesPage() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<EditableDish[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const rowErrors = useMemo(() => validateRows(rows), [rows]);

  useEffect(() => {
    const session = getSession();
    if (session?.role !== 'ADMIN') return;

    async function loadRows() {
      try {
        const response = await fetch('/api/admin/dishes', { cache: 'no-store' });
        const data = await response.json();
        const cleaned = parseDishItems(data.items).map(toEditableDish);
        setRows(cleaned);
        saveDishCostItems(cleaned.map(toDishCostItem));
      } finally {
        setReady(true);
      }
    }

    void loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) =>
      row.name.toLowerCase().includes(search) ||
      row.category.toLowerCase().includes(search) ||
      row.aliasesText.toLowerCase().includes(search),
    );
  }, [rows, query]);

  function updateRow(id: string, patch: Partial<EditableDish>) {
    setMessage('');
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setMessage('');
    setQuery('');
    setRows((current) => [
      {
        id: uid('dish_master'),
        name: '',
        category: 'Sabji',
        rate: 1,
        aliases: [],
        aliasesText: '',
      },
      ...current,
    ]);
  }

  function removeRow(id: string) {
    setMessage('');
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function saveAll() {
    if (rowErrors.size > 0) {
      setMessage('Please fix the highlighted dish rows before saving.');
      return;
    }

    const cleaned = rows
      .map(toDishCostItem)
      .filter((row) => row.name && CATEGORIES.includes(row.category as Category));
    const response = await fetch('/api/admin/dishes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cleaned }),
    });

    if (!response.ok) {
      setMessage('Could not save dish master. Please try again.');
      return;
    }

    saveDishCostItems(cleaned);
    setRows(cleaned.map(toEditableDish));
    setMessage('Dish master saved. Menu detection and rates now use the shared admin list.');
  }

  async function resetAll() {
    setMessage('');
    const response = await fetch('/api/admin/dishes', { method: 'DELETE' });
    if (!response.ok) {
      setMessage('Could not reset dish master. Please try again.');
      return;
    }

    const reload = await fetch('/api/admin/dishes', { cache: 'no-store' });
    const data = await reload.json();
    const defaults = parseDishItems(data.items).map(toEditableDish);
    saveDishCostItems(defaults.map(toDishCostItem));
    setRows(defaults);
    setMessage('Dish master reset to the default shared catalog.');
  }

  return (
    <AppShell title="Dish Master" subtitle="Admin can add dishes, edit category, aliases, and rate">
      <section className="content-grid">
        <div className="glass-card">
          <div className="section-kicker">Admin Control</div>
          <h2>Manage Dish Catalog</h2>
          <p className="muted">This master list controls dish matching, category auto-fill, and default rate detection in the Menu page.</p>
          <div className="action-row" style={{ marginTop: 16 }}>
            <button className="primary-button" onClick={addRow}>Add Dish</button>
            <button className="ghost-button" onClick={saveAll}>Save All Changes</button>
            <button className="danger-button" onClick={resetAll}>Reset Default Catalog</button>
          </div>
          {message ? <p className="muted" style={{ marginTop: 12 }}>{message}</p> : null}
        </div>

        <div className="glass-card">
          <div className="two-grid">
            <div className="field">
              <label>Search Dish</label>
              <input className="input input-large" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Paneer, biryani, live counter..." />
            </div>
            <div className="stat-card">
              <small>Total Dishes</small>
              <strong>{rows.length}</strong>
              <span>{filteredRows.length} shown</span>
            </div>
          </div>
        </div>

        {!ready ? <div className="glass-card">Loading...</div> : null}

        {ready ? (
          <div className="glass-card">
            <h2>Dish List</h2>
            <div className="admin-dish-list">
              {filteredRows.map((row) => (
                <div className={`admin-dish-row ${rowErrors.has(row.id) ? 'admin-dish-row-error' : ''}`} key={row.id}>
                  <div className="field">
                    <label>Dish Name</label>
                    <input className="input input-large" value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} placeholder="Paneer Butter Masala" />
                    {rowErrors.get(row.id)?.name ? <span className="field-error">{rowErrors.get(row.id)?.name}</span> : null}
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <select className="select select-large" value={row.category} onChange={(e) => updateRow(row.id, { category: e.target.value as Category })}>
                      {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Rate / Plate</label>
                    <input className="input input-large" type="number" min="0" value={row.rate || ''} onChange={(e) => updateRow(row.id, { rate: Number(e.target.value) })} placeholder="0" />
                    {rowErrors.get(row.id)?.rate ? <span className="field-error">{rowErrors.get(row.id)?.rate}</span> : null}
                  </div>
                  <div className="field">
                    <label>Aliases</label>
                    <input className="input input-large" value={row.aliasesText} onChange={(e) => updateRow(row.id, { aliasesText: e.target.value })} placeholder="pbm, butter paneer, paneer butter masala" />
                    {rowErrors.get(row.id)?.aliases ? <span className="field-error">{rowErrors.get(row.id)?.aliases}</span> : null}
                  </div>
                  <button className="danger-button" onClick={() => removeRow(row.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
