'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import {
  flushDraftToServer,
  flushWorkSave,
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';
import { menuItemIdentity } from '../../../lib/menuFunctionImport';
import { CATEGORIES } from '../../../lib/menuCategories';
import type { MenuItem } from '../../../lib/types';
import styles from './page.module.css';

type CachedDetection = {
  rawMenuText?: string;
  preview?: {
    menu?: MenuItem[];
  };
};

export default function DetectedMenuPage() {
  const [dishes, setDishes] = useState<MenuItem[] | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const session = getSession();
      if (!session) {
        setDishes([]);
        return;
      }

      const work = loadWork(session.tenantId);
      const cached = JSON.parse(
        sessionStorage.getItem(`menu-detection:${session.tenantId}`) || 'null',
      ) as CachedDetection | null;
      const menu =
        cached?.rawMenuText === work.event.rawMenuText
          ? cached?.preview?.menu
          : [];

      setDishes(
        Array.isArray(menu)
          ? menu.filter(
              (dish): dish is MenuItem =>
                Boolean(
                  dish &&
                    typeof dish.name === 'string' &&
                    dish.name.trim() &&
                    typeof dish.category === 'string' &&
                    dish.coverageStatus !== 'REJECTED',
                ),
            )
          : [],
      );
    } catch {
      setDishes([]);
    }
  }, []);

  async function continueToManpower() {
    if (!dishes?.length || continuing) return;

    setContinuing(true);
    setError('');

    try {
      const session = getSession();
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const work = loadWork(session.tenantId);
      const usageResponse = await fetch(
        `/api/client/free-usage?costingId=${encodeURIComponent(work.costingId)}`,
        { cache: 'no-store' },
      );

      if (!usageResponse.ok) {
        throw new Error(
          'Could not verify your costing allowance. Please try again.',
        );
      }

      const usage = (await usageResponse.json()) as {
        canUseCurrentCosting?: boolean;
      };

      if (!usage.canUseCurrentCosting) {
        throw new Error(
          'Your 5 free costings are used. Upgrade to Pro to start a new costing.',
        );
      }

      const defaultPax = Math.max(0, Number(work.event.pax) || 0);
      const fallbackMealLabel =
        work.event.functionType?.trim() || 'Event Menu';
      const importableDishes = dishes.map((dish) => ({
        ...dish,
        mealLabel: dish.mealLabel?.trim() || fallbackMealLabel,
        servicePax: Math.max(
          0,
          Number(dish.servicePax) || defaultPax,
        ),
      }));

      const existingKeys = new Set(work.menu.map(menuItemIdentity));
      const newItems = importableDishes.filter(
        (dish) => !existingKeys.has(menuItemIdentity(dish)),
      );
      const nextWork = {
        ...work,
        menu: [...work.menu, ...newItems],
      };

      saveWork(session.tenantId, nextWork);
      flushWorkSave(session.tenantId);
      await flushDraftToServer(session.tenantId, nextWork);

      window.location.assign('/app/manpower');
    } catch (continueError) {
      setError(
        continueError instanceof Error
          ? continueError.message
          : 'The detected menu could not be saved. Please try again.',
      );
      setContinuing(false);
    }
  }

  const groups = new Map<string, MenuItem[]>();
  for (const dish of dishes ?? []) {
    const category = dish.category.trim() || 'Other';
    const group = groups.get(category) ?? [];
    if (
      !group.some(
        (item) =>
          item.name.trim().toLowerCase() === dish.name.trim().toLowerCase(),
      )
    ) {
      group.push(dish);
    }
    groups.set(category, group);
  }

  const categories = [...groups.keys()].sort((a, b) => {
    const order = (name: string) => {
      const index = (CATEGORIES as readonly string[]).indexOf(name);
      return index < 0 ? CATEGORIES.length : index;
    };
    return order(a) - order(b) || a.localeCompare(b);
  });

  return (
    <AppShell title="Detected menu">
      <div className={styles.menu}>
        <div className={styles.actions}>
          <Link href="/app/event">Back to menu upload / review</Link>
        </div>

        {dishes === null ? (
          <p role="status">Loading dishes…</p>
        ) : categories.length === 0 ? (
          <p>
            No detected dishes to show.{' '}
            <Link href="/app/event">Upload a menu to get started.</Link>
          </p>
        ) : (
          <>
            {categories.map((category, index) => (
              <section
                className={styles.category}
                key={category}
                aria-labelledby={`category-${index}`}
              >
                <h2 id={`category-${index}`}>{category}</h2>
                <ul>
                  {groups.get(category)!.map((dish) => (
                    <li key={dish.id}>{dish.name}</li>
                  ))}
                </ul>
              </section>
            ))}

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            <div className={styles.footerActions}>
              <Link className={styles.backButton} href="/app/event">
                Back
              </Link>
              <button
                className="primary-button"
                type="button"
                onClick={() => void continueToManpower()}
                disabled={continuing}
              >
                {continuing ? 'Saving menu…' : 'Next: Manpower'}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
