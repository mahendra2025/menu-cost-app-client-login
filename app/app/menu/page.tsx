'use client';

import { useEffect, useMemo, useState } from 'react';

import AppShell, { LockedCard } from '../../components/AppShell';
import {
  flushDraftToServer,
  flushWorkSave,
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';
import type { MenuItem, Session, WorkState } from '../../../lib/types';
import { CATEGORIES } from '../../../lib/menuCategories';
import { downloadMenuCreationPdf } from '../../../lib/menuCreationPdf';

import styles from './page.module.css';

type FunctionGroup = {
  key: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  items: MenuItem[];
  draft?: boolean;
};

type Station = {
  key: string;
  label: string;
  categories: string[];
};

type CatalogDish = {
  name: string;
  category: string;
  subcategory?: string;
  rate: number;
  source: 'global' | 'tenant';
  servingQuantity: number;
  servingUnit: string;
  pieceWeightGrams?: number;
  gasKgPer100?: number;
  hasRecipe?: boolean;
};

const DEFAULT_STATIONS: Station[] = [
  { key: 'welcome', label: 'Welcome Drink', categories: ['Welcome Drink', 'Mocktail', 'Beverage'] },
  { key: 'starter', label: 'Starter', categories: ['Starter', 'Snacks'] },
  { key: 'soup', label: 'Soup', categories: ['Soup'] },
  { key: 'sweet', label: 'Sweet', categories: ['Sweet', 'Dessert'] },
  { key: 'farsan', label: 'Farsan', categories: ['Farsan'] },
  { key: 'chaat', label: 'Chaat', categories: ['Chaat', 'Street Food'] },
  { key: 'sabji', label: 'Sabji', categories: ['Sabji', 'Paneer', 'Main Course'] },
  { key: 'bread', label: 'Indian Bread', categories: ['Bread', 'Tandoor', 'Indian Bread'] },
  { key: 'dal-rice', label: 'Dal & Rice', categories: ['Dal / Kadhi', 'Dal', 'Rice'] },
  { key: 'chinese', label: 'Chinese', categories: ['Chinese'] },
  { key: 'south-indian', label: 'South Indian', categories: ['South Indian'] },
  { key: 'ice-cream', label: 'Ice Cream', categories: ['Ice Cream'] },
  { key: 'fruit', label: 'Fruit', categories: ['Fruit'] },
  { key: 'mukhwas', label: 'Mukhwas', categories: ['Mukhwas', 'Paan'] },
  { key: 'other', label: 'Other', categories: ['Other'] },
];

function norm(value: unknown) {
  return String(value || '').trim().toLocaleLowerCase('en-IN');
}

function catalogDishKey(dish: Pick<CatalogDish, 'name' | 'category'>) {
  return `${norm(dish.category)}::${norm(dish.name)}`;
}

function functionGroups(work: WorkState): FunctionGroup[] {
  const groups = new Map<string, FunctionGroup>();

  work.menu
    .filter((item) => item.coverageStatus !== 'REJECTED')
    .forEach((item) => {
      const dayLabel = String(item.dayLabel || work.event.eventDate || '').trim();
      const mealLabel = String(item.mealLabel || work.event.functionType || 'Event Menu').trim();
      const fallbackKey = [dayLabel, mealLabel].map(norm).join('::') || 'event-menu';
      const key = String(item.serviceId || fallbackKey);

      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
        existing.pax = Math.max(existing.pax, Number(item.servicePax) || 0);
        return;
      }

      groups.set(key, {
        key,
        dayLabel,
        mealLabel,
        pax: Math.max(0, Number(item.servicePax) || Number(work.event.pax) || 0),
        items: [item],
      });
    });

  return Array.from(groups.values());
}

function formatDate(value: string) {
  if (!value) return 'Date not set';
  const parsed = new Date(value + 'T00:00:00');
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function categoryInStation(category: string, station: Station) {
  const categoryKey = norm(category);
  return station.categories.some((value) => norm(value) === categoryKey);
}

function stationForItem(item: MenuItem, stations: Station[]) {
  return stations.find((station) => categoryInStation(item.category, station)) ||
    stations.find((station) => station.key === 'other') ||
    stations[0];
}

export default function MenuStudioPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [activeFunctionKey, setActiveFunctionKey] = useState('');
  const [selectedStationKey, setSelectedStationKey] = useState('welcome');
  const [stationOrder, setStationOrder] = useState<string[]>([]);
  const [draggingStationKey, setDraggingStationKey] = useState('');
  const [stationDropTargetKey, setStationDropTargetKey] = useState('');
  const [hideEmpty, setHideEmpty] = useState(false);
  const [stationSearch, setStationSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [showDishForm, setShowDishForm] = useState(false);
  const [showFunctionForm, setShowFunctionForm] = useState(false);
  const [showStationForm, setShowStationForm] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState('Welcome Drink');
  const [functionName, setFunctionName] = useState('');
  const [functionDay, setFunctionDay] = useState('');
  const [functionPax, setFunctionPax] = useState('');
  const [stationName, setStationName] = useState('');
  const [customStations, setCustomStations] = useState<Station[]>([]);
  const [draftFunctions, setDraftFunctions] = useState<FunctionGroup[]>([]);
  const [catalogDishes, setCatalogDishes] = useState<CatalogDish[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [showDishPicker, setShowDishPicker] = useState(false);
  const [dishPickerQuery, setDishPickerQuery] = useState('');
  const [selectedCatalogDishKeys, setSelectedCatalogDishKeys] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const current = getSession();
    setSession(current);

    if (!current) return;
    const loaded = loadWork(current.tenantId);
    setWork(loaded);

    const savedStationOrder = window.localStorage.getItem(
      `menu-studio-station-order:${current.tenantId}`,
    );

    if (savedStationOrder) {
      try {
        const parsed = JSON.parse(savedStationOrder);
        if (Array.isArray(parsed)) {
          setStationOrder(
            parsed
              .map((value) => String(value || '').trim())
              .filter(Boolean),
          );
        }
      } catch {
        // Use default order if an older saved preference is invalid.
      }
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadDishCatalog() {
      setCatalogLoading(true);
      setCatalogError('');

      try {
        const response = await fetch('/api/dishes', {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Could not load Dish Master.');
        }

        const items: CatalogDish[] = Array.isArray(data.items)
          ? data.items
              .filter(
                (value: unknown) =>
                  value &&
                  typeof value === 'object' &&
                  !Array.isArray(value),
              )
              .map((value: unknown) => {
                const row = value as Record<string, unknown>;

                return {
                  name: String(row.name || '').trim(),
                  category: String(row.category || 'Other').trim() || 'Other',
                  subcategory: String(row.subcategory || '').trim(),
                  rate: Math.max(0, Number(row.rate) || 0),
                  source: String(row.source || 'global') === 'tenant'
                    ? 'tenant'
                    : 'global',
                  servingQuantity: Math.max(0.01, Number(row.servingQuantity) || 1),
                  servingUnit: String(row.servingUnit || 'serving').trim() || 'serving',
                  pieceWeightGrams:
                    Math.max(0, Number(row.pieceWeightGrams) || 0) || undefined,
                  gasKgPer100:
                    row.gasKgPer100 === null ||
                    row.gasKgPer100 === undefined ||
                    String(row.gasKgPer100).trim() === ''
                      ? undefined
                      : Math.max(0, Number(row.gasKgPer100) || 0),
                  hasRecipe: Boolean(row.hasRecipe),
                };
              })
              .filter((item: CatalogDish) => Boolean(item.name))
          : [];

        if (!cancelled) {
          setCatalogDishes(items);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error
              ? error.message
              : 'Could not load Dish Master.',
          );
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadDishCatalog();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const savedFunctions = useMemo(
    () => (work ? functionGroups(work) : []),
    [work],
  );

  const functions = useMemo(() => {
    const map = new Map<string, FunctionGroup>();
    draftFunctions.forEach((item) => map.set(item.key, item));
    savedFunctions.forEach((item) => map.set(item.key, item));

    if (!map.size && work) {
      map.set('event-menu', {
        key: 'event-menu',
        dayLabel: work.event.eventDate,
        mealLabel: work.event.functionType || 'Event Menu',
        pax: Math.max(0, Number(work.event.pax) || 0),
        items: [],
        draft: true,
      });
    }

    return Array.from(map.values());
  }, [draftFunctions, savedFunctions, work]);

  useEffect(() => {
    if (!functions.length) return;
    if (!functions.some((item) => item.key === activeFunctionKey)) {
      setActiveFunctionKey(functions[0].key);
    }
  }, [activeFunctionKey, functions]);

  const activeFunction = functions.find((item) => item.key === activeFunctionKey) || functions[0];

  const stations = useMemo(() => {
    if (!work) return [...DEFAULT_STATIONS, ...customStations];

    const known = [...DEFAULT_STATIONS, ...customStations];
    const knownCategories = new Set(
      known.flatMap((station) => station.categories.map(norm)),
    );

    const discovered = work.menu
      .map((item) => String(item.category || '').trim())
      .filter(Boolean)
      .filter((category, index, all) => all.findIndex((value) => norm(value) === norm(category)) === index)
      .filter((category) => !knownCategories.has(norm(category)))
      .map((category) => ({
        key: 'custom-' + norm(category).replace(/[^a-z0-9]+/g, '-'),
        label: category,
        categories: [category],
      }));

    return [...known, ...discovered];
  }, [customStations, work]);

  const orderedStations = useMemo(() => {
    if (!stationOrder.length) return stations;

    const rank = new Map(
      stationOrder.map((key, index) => [key, index]),
    );

    return [...stations].sort((left, right) => {
      const leftRank = rank.get(left.key);
      const rightRank = rank.get(right.key);

      if (leftRank === undefined && rightRank === undefined) {
        return stations.indexOf(left) - stations.indexOf(right);
      }
      if (leftRank === undefined) return 1;
      if (rightRank === undefined) return -1;
      return leftRank - rightRank;
    });
  }, [stationOrder, stations]);

  useEffect(() => {
    if (!orderedStations.some((station) => station.key === selectedStationKey)) {
      setSelectedStationKey(orderedStations[0]?.key || 'welcome');
    }
  }, [orderedStations, selectedStationKey]);

  const activeStation =
    orderedStations.find((station) => station.key === selectedStationKey) ||
    orderedStations[0];

  const stationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!activeFunction) return counts;

    activeFunction.items.forEach((item) => {
      const station = stationForItem(item, orderedStations);
      counts.set(station.key, (counts.get(station.key) || 0) + 1);
    });

    return counts;
  }, [activeFunction, orderedStations]);

  const visibleStations = orderedStations.filter((station) => {
    const matchesSearch = norm(station.label).includes(norm(stationSearch));
    const hasItems = (stationCounts.get(station.key) || 0) > 0;
    return matchesSearch && (!hideEmpty || hasItems);
  });

  const stationItems = activeFunction && activeStation
    ? activeFunction.items.filter((item) => categoryInStation(item.category, activeStation))
    : [];

  const activeFunctionDishNames = useMemo(
    () =>
      new Set(
        (activeFunction?.items || []).map((item) => norm(item.name)),
      ),
    [activeFunction],
  );

  const pickerDishes = useMemo(() => {
    if (!activeStation) return [];

    const query = norm(dishPickerQuery);

    return catalogDishes
      .filter((dish) => categoryInStation(dish.category, activeStation))
      .filter((dish) => {
        if (!query) return true;

        return norm(
          [dish.name, dish.category, dish.subcategory || ''].join(' '),
        ).includes(query);
      })
      .sort(
        (left, right) =>
          Number(right.source === 'tenant') -
            Number(left.source === 'tenant') ||
          left.name.localeCompare(right.name),
      );
  }, [activeStation, catalogDishes, dishPickerQuery]);

  const selectedPickerDishes = useMemo(
    () =>
      catalogDishes.filter((dish) =>
        selectedCatalogDishKeys.has(catalogDishKey(dish)),
      ),
    [catalogDishes, selectedCatalogDishKeys],
  );

  function commit(next: WorkState) {
    if (!session) return;
    setWork(next);
    saveWork(session.tenantId, next);
    setSaveStatus('Changes saved');
    window.setTimeout(() => setSaveStatus(''), 1400);
  }

  function updateEvent(field: keyof WorkState['event'], value: string | number) {
    if (!work) return;
    commit({
      ...work,
      event: {
        ...work.event,
        [field]: value,
      },
    });
  }

  function updateDish(itemId: string, patch: Partial<MenuItem>) {
    if (!work) return;
    commit({
      ...work,
      menu: work.menu.map((item) => item.id === itemId ? { ...item, ...patch } : item),
    });
  }

  function removeDish(itemId: string) {
    if (!work) return;
    commit({
      ...work,
      menu: work.menu.filter((item) => item.id !== itemId),
    });
  }

  function persistStationOrder(next: string[]) {
    if (!session) return;

    setStationOrder(next);
    window.localStorage.setItem(
      `menu-studio-station-order:${session.tenantId}`,
      JSON.stringify(next),
    );
    setSaveStatus('Station order saved');
    window.setTimeout(() => setSaveStatus(''), 1400);
  }

  function moveStationByDrop(draggedKey: string, targetKey: string) {
    if (
      !draggedKey ||
      !targetKey ||
      draggedKey === targetKey
    ) return;

    const currentKeys = orderedStations.map((station) => station.key);
    const fromIndex = currentKeys.indexOf(draggedKey);
    const toIndex = currentKeys.indexOf(targetKey);

    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...currentKeys];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    persistStationOrder(next);
  }

  function moveDish(itemId: string, direction: -1 | 1) {
    if (!work) return;
    const visibleIds = stationItems.map((item) => item.id);
    const visibleIndex = visibleIds.indexOf(itemId);
    const swapVisibleIndex = visibleIndex + direction;
    if (visibleIndex < 0 || swapVisibleIndex < 0 || swapVisibleIndex >= visibleIds.length) return;

    const sourceIndex = work.menu.findIndex((item) => item.id === visibleIds[visibleIndex]);
    const targetIndex = work.menu.findIndex((item) => item.id === visibleIds[swapVisibleIndex]);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextMenu = [...work.menu];
    [nextMenu[sourceIndex], nextMenu[targetIndex]] = [nextMenu[targetIndex], nextMenu[sourceIndex]];
    commit({ ...work, menu: nextMenu });
  }

  function openDishPicker() {
    setDishPickerQuery('');
    setSelectedCatalogDishKeys(new Set());
    setCatalogError('');
    setShowDishPicker(true);
  }

  function toggleCatalogDish(dish: CatalogDish) {
    const key = catalogDishKey(dish);

    setSelectedCatalogDishKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function selectAllVisiblePickerDishes() {
    const selectableKeys = pickerDishes
      .filter((dish) => !activeFunctionDishNames.has(norm(dish.name)))
      .map(catalogDishKey);

    setSelectedCatalogDishKeys((current) => {
      const allSelected =
        selectableKeys.length > 0 &&
        selectableKeys.every((key) => current.has(key));

      if (allSelected) {
        return new Set(
          Array.from(current).filter((key) => !selectableKeys.includes(key)),
        );
      }

      return new Set([...current, ...selectableKeys]);
    });
  }

  function addSelectedCatalogDishes() {
    if (!work || !activeFunction || !selectedPickerDishes.length) return;

    const existingNames = new Set(
      activeFunction.items.map((item) => norm(item.name)),
    );
    const selected = selectedPickerDishes.filter(
      (dish) => !existingNames.has(norm(dish.name)),
    );

    if (!selected.length) {
      setShowDishPicker(false);
      return;
    }

    const serviceId =
      activeFunction.key === 'event-menu'
        ? uid('service')
        : activeFunction.key;

    const nextItems: MenuItem[] = selected.map((dish) => ({
      id: uid('menu'),
      name: dish.name,
      category: dish.category,
      costPerPlate: dish.rate,
      portionQuantity: dish.servingQuantity,
      portionBaseQuantity: dish.servingQuantity,
      portionUnit: dish.servingUnit,
      pieceWeightGrams: dish.pieceWeightGrams,
      gasKgPer100: dish.gasKgPer100,
      serviceId,
      dayLabel: activeFunction.dayLabel || work.event.eventDate,
      mealLabel:
        activeFunction.mealLabel ||
        work.event.functionType ||
        'Event Menu',
      servicePax: Math.max(
        0,
        Number(activeFunction.pax) ||
          Number(work.event.pax) ||
          0,
      ),
      detectionSource: 'manual',
      costSource: dish.rate > 0 ? 'catalog' : undefined,
      coverageStatus: dish.rate > 0 ? 'COSTED' : 'NEW_DISH_PENDING',
      costQualityStatus: dish.rate > 0 ? 'READY' : undefined,
      costConfidence: dish.rate > 0 ? 100 : 0,
      rateCoveragePercent: dish.rate > 0 ? 100 : 0,
      coverageReason: dish.hasRecipe
        ? 'Selected from Dish Master with linked recipe'
        : 'Selected from Dish Master',
    }));

    commit({
      ...work,
      menu: [...work.menu, ...nextItems],
    });
    setActiveFunctionKey(serviceId);
    setSelectedCatalogDishKeys(new Set());
    setDishPickerQuery('');
    setShowDishPicker(false);
  }

  function addDish() {
    if (!work || !activeFunction || !dishName.trim()) return;

    const category = dishCategory.trim() || activeStation?.categories[0] || 'Other';
    const serviceId = activeFunction.key === 'event-menu'
      ? uid('service')
      : activeFunction.key;
    const item: MenuItem = {
      id: uid('menu'),
      name: dishName.trim(),
      category,
      costPerPlate: 0,
      serviceId,
      dayLabel: activeFunction.dayLabel || work.event.eventDate,
      mealLabel: activeFunction.mealLabel || work.event.functionType || 'Event Menu',
      servicePax: Math.max(0, Number(activeFunction.pax) || Number(work.event.pax) || 0),
      detectionSource: 'manual',
      coverageStatus: 'NEW_DISH_PENDING',
    };

    commit({ ...work, menu: [...work.menu, item] });
    setActiveFunctionKey(serviceId);
    setDishName('');
    setShowDishForm(false);
  }

  function addFunction() {
    const mealLabel = functionName.trim();
    if (!mealLabel) return;
    const key = uid('service');
    const nextFunction: FunctionGroup = {
      key,
      dayLabel: functionDay.trim() || work?.event.eventDate || '',
      mealLabel,
      pax: Math.max(0, Number(functionPax) || Number(work?.event.pax) || 0),
      items: [],
      draft: true,
    };
    setDraftFunctions((current) => [...current, nextFunction]);
    setActiveFunctionKey(key);
    setFunctionName('');
    setFunctionDay('');
    setFunctionPax('');
    setShowFunctionForm(false);
  }

  function addStation() {
    const label = stationName.trim();
    if (!label) return;
    const next: Station = {
      key: 'custom-' + uid('station'),
      label,
      categories: [label],
    };
    setCustomStations((current) => [...current, next]);
    setStationOrder((current) => {
      const base = current.length
        ? current
        : orderedStations.map((station) => station.key);
      const nextOrder = [...base.filter((key) => key !== next.key), next.key];

      if (session) {
        window.localStorage.setItem(
          `menu-studio-station-order:${session.tenantId}`,
          JSON.stringify(nextOrder),
        );
      }

      return nextOrder;
    });
    setSelectedStationKey(next.key);
    setDishCategory(label);
    setStationName('');
    setShowStationForm(false);
  }

  async function saveNow() {
    if (!session || !work) return;
    setSaveStatus('Saving…');
    saveWork(session.tenantId, work);
    flushWorkSave(session.tenantId);
    try {
      await flushDraftToServer(session.tenantId, work);
      setSaveStatus('Saved');
    } catch {
      setSaveStatus('Saved on this device');
    }
  }

  if (!session || !work) {
    return (
      <AppShell title="Menu Studio" hidePageTitle>
        <LockedCard />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Menu Studio"
      subtitle="Create a beautiful client-facing menu"
      hidePageTitle
    >
      <div className={styles.studio}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>CLIENT MENU BUILDER</span>
            <h1>Menu Studio</h1>
            <p>Create, arrange, preview and export your client menu.</p>
          </div>

          <div className={styles.headerActions}>
            <label className={styles.hideToggle}>
              <input
                type="checkbox"
                checked={hideEmpty}
                onChange={(event) => setHideEmpty(event.target.checked)}
              />
              <span>Hide Empty Stations</span>
            </label>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => document.getElementById('menu-live-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Preview
            </button>
            <button type="button" className={styles.saveButton} onClick={() => void saveNow()}>
              Save
            </button>
            <button
              type="button"
              className={styles.pdfButton}
              onClick={() =>
                downloadMenuCreationPdf(
                  work,
                  orderedStations.flatMap((station) => station.categories),
                )
              }
              disabled={!work.menu.length}
            >
              Download PDF
            </button>
          </div>
        </header>

        {saveStatus ? <div className={styles.saveToast}>{saveStatus}</div> : null}

        <section className={styles.eventBar}>
          <label>
            <span>Client</span>
            <input
              value={work.event.clientName}
              onChange={(event) => updateEvent('clientName', event.target.value)}
              placeholder="Client name"
            />
          </label>
          <label>
            <span>Event</span>
            <input
              value={work.event.eventName}
              onChange={(event) => updateEvent('eventName', event.target.value)}
              placeholder="Wedding / Event"
            />
          </label>
          <label>
            <span>Date</span>
            <input
              type="date"
              value={work.event.eventDate}
              onChange={(event) => updateEvent('eventDate', event.target.value)}
            />
          </label>
          <label>
            <span>Guests</span>
            <input
              type="number"
              min="0"
              value={work.event.pax || ''}
              onChange={(event) => updateEvent('pax', Math.max(0, Number(event.target.value) || 0))}
              placeholder="0"
            />
          </label>
        </section>

        <section className={styles.functionStrip} aria-label="Functions">
          <div className={styles.functionScroller}>
            {functions.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === activeFunction?.key ? styles.functionActive : styles.functionTab}
                onClick={() => setActiveFunctionKey(item.key)}
              >
                <b>{item.mealLabel || 'Function'}</b>
                <small>
                  {[item.dayLabel ? formatDate(item.dayLabel) : '', item.pax > 0 ? item.pax.toLocaleString('en-IN') + ' guests' : '']
                    .filter(Boolean)
                    .join(' · ') || 'Add dishes'}
                </small>
              </button>
            ))}
          </div>
          <button type="button" className={styles.addFunctionButton} onClick={() => setShowFunctionForm(true)}>
            + Add Function
          </button>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.stationsPanel}>
            <div className={styles.panelTitle}>
              <div>
                <span>MENU STRUCTURE</span>
                <h2>Stations</h2>
              </div>
              <button type="button" onClick={() => setShowStationForm(true)}>+ New</button>
            </div>

            <div className={styles.searchBox}>
              <span aria-hidden="true">⌕</span>
              <input
                value={stationSearch}
                onChange={(event) => setStationSearch(event.target.value)}
                placeholder="Search station…"
              />
            </div>

            <div className={styles.stationList}>
              {visibleStations.map((station) => {
                const count = stationCounts.get(station.key) || 0;
                const isDragging = draggingStationKey === station.key;
                const isDropTarget =
                  stationDropTargetKey === station.key &&
                  draggingStationKey !== station.key;

                const rowClassName = [
                  station.key === activeStation?.key
                    ? styles.stationRowActive
                    : styles.stationRow,
                  isDragging ? styles.stationRowDragging : '',
                  isDropTarget ? styles.stationRowDropTarget : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <div
                    key={station.key}
                    className={rowClassName}
                    draggable
                    onDragStart={(event) => {
                      setDraggingStationKey(station.key);
                      setStationDropTargetKey('');
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData(
                        'text/plain',
                        station.key,
                      );
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';

                      if (draggingStationKey !== station.key) {
                        setStationDropTargetKey(station.key);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedKey =
                        event.dataTransfer.getData('text/plain') ||
                        draggingStationKey;

                      moveStationByDrop(draggedKey, station.key);
                      setDraggingStationKey('');
                      setStationDropTargetKey('');
                    }}
                    onDragEnd={() => {
                      setDraggingStationKey('');
                      setStationDropTargetKey('');
                    }}
                  >
                    <span
                      className={styles.stationDragHandle}
                      aria-hidden="true"
                      title="Drag station"
                    >
                      ⋮⋮
                    </span>

                    <button
                      type="button"
                      className={styles.stationSelect}
                      onClick={() => {
                        setSelectedStationKey(station.key);
                        setDishCategory(station.categories[0] || station.label);
                      }}
                    >
                      <b>{station.label}</b>
                      <small>{count || ''}</small>
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          <main className={styles.dishesPanel}>
            <div className={styles.dishesHeader}>
              <div>
                <span>STATION</span>
                <h2>{activeStation?.label || 'Menu'}</h2>
                <p>Add and arrange dishes for this station.</p>
              </div>
              <div className={styles.dishHeaderActions}>
                <button
                  type="button"
                  className={styles.addDishTop}
                  onClick={openDishPicker}
                >
                  + Dish Picker
                </button>
                <button
                  type="button"
                  className={styles.customDishButton}
                  onClick={() => {
                    setDishCategory(activeStation?.categories[0] || 'Other');
                    setShowDishForm(true);
                  }}
                >
                  + Custom
                </button>
              </div>
            </div>

            {stationItems.length ? (
              <div className={styles.dishList}>
                {stationItems.map((item, index) => (
                  <article className={styles.dishCard} key={item.id}>
                    <div className={styles.dishThumb}>
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt="" />
                      ) : (
                        <span>{item.name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <div className={styles.dishMain}>
                      <input
                        className={styles.dishNameInput}
                        value={item.name}
                        onChange={(event) => updateDish(item.id, { name: event.target.value })}
                        aria-label={'Dish name ' + item.name}
                      />
                      <div className={styles.dishMeta}>
                        <select
                          value={item.category}
                          onChange={(event) => updateDish(item.id, { category: event.target.value })}
                          aria-label={'Category for ' + item.name}
                        >
                          {!CATEGORIES.includes(item.category as never) ? (
                            <option value={item.category}>{item.category}</option>
                          ) : null}
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                          {customStations.map((station) => (
                            <option key={station.key} value={station.label}>{station.label}</option>
                          ))}
                        </select>
                        {item.costPerPlate > 0 ? <span>Cost linked</span> : <span className={styles.pendingTag}>Cost pending</span>}
                      </div>
                    </div>

                    <div className={styles.dishActions}>
                      <button type="button" disabled={index === 0} onClick={() => moveDish(item.id, -1)} aria-label="Move dish up">↑</button>
                      <button type="button" disabled={index === stationItems.length - 1} onClick={() => moveDish(item.id, 1)} aria-label="Move dish down">↓</button>
                      <button type="button" className={styles.deleteButton} onClick={() => removeDish(item.id)} aria-label={'Delete ' + item.name}>×</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyStation}>
                <div>+</div>
                <h3>No dishes in {activeStation?.label || 'this station'}</h3>
                <p>Add the first dish. Empty stations stay hidden from the client PDF.</p>
              </div>
            )}

            <div className={styles.addDishRow}>
              <button
                type="button"
                className={styles.addDishWide}
                onClick={openDishPicker}
              >
                + Add from Dish Master
              </button>
              <button
                type="button"
                className={styles.customDishWide}
                onClick={() => {
                  setDishCategory(activeStation?.categories[0] || 'Other');
                  setShowDishForm(true);
                }}
              >
                + Custom Dish
              </button>
            </div>
          </main>

          <aside className={styles.previewPanel} id="menu-live-preview">
            <div className={styles.previewTitle}>
              <div>
                <span>CLIENT VIEW</span>
                <h2>Live Menu Preview</h2>
              </div>
              <small>{activeFunction?.items.length || 0} dishes</small>
            </div>

            <div className={styles.menuPaper}>
              <div className={styles.menuOrnament}>✦</div>
              <div className={styles.brand}>
                <small>{work.profile.tagline || 'Premium Event Catering'}</small>
                <h3>{work.profile.businessName || session.businessName || 'Catering Business'}</h3>
              </div>

              <div className={styles.clientBlock}>
                <b>{work.event.clientName || 'Client Name'}</b>
                <span>{work.event.eventName || work.event.functionType || 'Celebration'}</span>
                <small>
                  {[formatDate(activeFunction?.dayLabel || work.event.eventDate), activeFunction?.pax ? activeFunction.pax.toLocaleString('en-IN') + ' guests' : '']
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </div>

              <div className={styles.previewFunction}>{activeFunction?.mealLabel || 'Event Menu'}</div>

              <div className={styles.previewStations}>
                {orderedStations.map((station) => {
                  const items = activeFunction?.items.filter((item) => categoryInStation(item.category, station)) || [];
                  if (!items.length) return null;
                  return (
                    <section key={station.key}>
                      <h4>{station.label}</h4>
                      {items.map((item) => <p key={item.id}>{item.name}</p>)}
                    </section>
                  );
                })}
              </div>

              {!activeFunction?.items.length ? (
                <div className={styles.previewEmpty}>Add dishes to build the client menu.</div>
              ) : null}

              <div className={styles.paperFooter}>Crafted with care for a memorable celebration</div>
            </div>
          </aside>
        </div>

        {showDishPicker ? (
          <div
            className={styles.modalLayer}
            role="presentation"
            onMouseDown={() => setShowDishPicker(false)}
          >
            <section
              className={`${styles.modal} ${styles.pickerModal}`}
              role="dialog"
              aria-modal="true"
              aria-label="Dish picker"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className={styles.pickerHead}>
                <div>
                  <span className={styles.modalEyebrow}>
                    {activeFunction?.mealLabel || 'MENU'} · {activeStation?.label || 'STATION'}
                  </span>
                  <h2>Dish Picker</h2>
                  <p>Select multiple dishes and add them together.</p>
                </div>
                <button
                  type="button"
                  className={styles.pickerClose}
                  onClick={() => setShowDishPicker(false)}
                  aria-label="Close Dish Picker"
                >
                  ×
                </button>
              </div>

              <div className={styles.pickerSearchBar}>
                <span aria-hidden="true">⌕</span>
                <input
                  autoFocus
                  value={dishPickerQuery}
                  onChange={(event) => setDishPickerQuery(event.target.value)}
                  placeholder={`Search ${activeStation?.label || 'dishes'}…`}
                />
                {dishPickerQuery ? (
                  <button
                    type="button"
                    onClick={() => setDishPickerQuery('')}
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className={styles.pickerToolbar}>
                <div>
                  <b>{pickerDishes.length}</b>
                  <span> available</span>
                  {selectedCatalogDishKeys.size > 0 ? (
                    <strong>{selectedCatalogDishKeys.size} selected</strong>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={selectAllVisiblePickerDishes}
                  disabled={!pickerDishes.length}
                >
                  Select visible
                </button>
              </div>

              {catalogError ? (
                <div className={styles.pickerError}>{catalogError}</div>
              ) : null}

              <div className={styles.pickerList}>
                {catalogLoading ? (
                  <div className={styles.pickerEmpty}>
                    Loading Dish Master…
                  </div>
                ) : pickerDishes.length ? (
                  pickerDishes.map((dish) => {
                    const key = catalogDishKey(dish);
                    const alreadyAdded =
                      activeFunctionDishNames.has(norm(dish.name));
                    const selected = selectedCatalogDishKeys.has(key);

                    return (
                      <label
                        key={key}
                        className={
                          alreadyAdded
                            ? styles.pickerRowDisabled
                            : selected
                              ? styles.pickerRowSelected
                              : styles.pickerRow
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={alreadyAdded}
                          onChange={() => toggleCatalogDish(dish)}
                        />
                        <span className={styles.pickerDishMark}>
                          {dish.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className={styles.pickerDishCopy}>
                          <b>{dish.name}</b>
                          <small>
                            {[dish.category, dish.subcategory]
                              .filter(Boolean)
                              .join(' · ')}
                          </small>
                        </span>
                        <span className={styles.pickerBadges}>
                          {dish.source === 'tenant' ? (
                            <i className={styles.myDishBadge}>My Dish</i>
                          ) : null}
                          {dish.hasRecipe ? (
                            <i className={styles.recipeBadge}>Recipe</i>
                          ) : null}
                          {alreadyAdded ? (
                            <i className={styles.addedBadge}>Added</i>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className={styles.pickerEmpty}>
                    <b>No dishes found in {activeStation?.label || 'this station'}.</b>
                    <span>Use Custom Dish to add a new item.</span>
                  </div>
                )}
              </div>

              <div className={styles.pickerFooter}>
                <button
                  type="button"
                  className={styles.pickerCustomAction}
                  onClick={() => {
                    setShowDishPicker(false);
                    setDishCategory(activeStation?.categories[0] || 'Other');
                    setShowDishForm(true);
                  }}
                >
                  + Custom Dish
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDishPicker(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={addSelectedCatalogDishes}
                    disabled={!selectedPickerDishes.length}
                  >
                    Add {selectedPickerDishes.length || ''} Dish{selectedPickerDishes.length === 1 ? '' : 'es'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {showDishForm ? (
          <div className={styles.modalLayer} role="presentation" onMouseDown={() => setShowDishForm(false)}>
            <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Add dish" onMouseDown={(event) => event.stopPropagation()}>
              <span className={styles.modalEyebrow}>ADD TO {activeFunction?.mealLabel || 'MENU'}</span>
              <h2>Add Dish</h2>
              <label>
                <span>Dish name</span>
                <input autoFocus value={dishName} onChange={(event) => setDishName(event.target.value)} placeholder="e.g. Paneer Tikka" onKeyDown={(event) => { if (event.key === 'Enter') addDish(); }} />
              </label>
              <label>
                <span>Station / category</span>
                <select value={dishCategory} onChange={(event) => setDishCategory(event.target.value)}>
                  {stations.flatMap((station) => station.categories.slice(0, 1)).map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowDishForm(false)}>Cancel</button>
                <button type="button" className={styles.saveButton} onClick={addDish} disabled={!dishName.trim()}>Add Dish</button>
              </div>
            </section>
          </div>
        ) : null}

        {showFunctionForm ? (
          <div className={styles.modalLayer} role="presentation" onMouseDown={() => setShowFunctionForm(false)}>
            <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Add function" onMouseDown={(event) => event.stopPropagation()}>
              <span className={styles.modalEyebrow}>NEW FUNCTION</span>
              <h2>Add Function</h2>
              <label>
                <span>Function name</span>
                <input autoFocus value={functionName} onChange={(event) => setFunctionName(event.target.value)} placeholder="Breakfast / Lunch / Dinner" />
              </label>
              <div className={styles.modalGrid}>
                <label>
                  <span>Date</span>
                  <input type="date" value={functionDay} onChange={(event) => setFunctionDay(event.target.value)} />
                </label>
                <label>
                  <span>Guests</span>
                  <input type="number" min="0" value={functionPax} onChange={(event) => setFunctionPax(event.target.value)} placeholder={String(work.event.pax || 0)} />
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowFunctionForm(false)}>Cancel</button>
                <button type="button" className={styles.saveButton} onClick={addFunction} disabled={!functionName.trim()}>Add Function</button>
              </div>
            </section>
          </div>
        ) : null}

        {showStationForm ? (
          <div className={styles.modalLayer} role="presentation" onMouseDown={() => setShowStationForm(false)}>
            <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Add station" onMouseDown={(event) => event.stopPropagation()}>
              <span className={styles.modalEyebrow}>CUSTOM MENU STATION</span>
              <h2>New Station</h2>
              <label>
                <span>Station name</span>
                <input autoFocus value={stationName} onChange={(event) => setStationName(event.target.value)} placeholder="e.g. Mexican Live Counter" onKeyDown={(event) => { if (event.key === 'Enter') addStation(); }} />
              </label>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowStationForm(false)}>Cancel</button>
                <button type="button" className={styles.saveButton} onClick={addStation} disabled={!stationName.trim()}>Create Station</button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
