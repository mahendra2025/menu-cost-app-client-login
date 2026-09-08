'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import { getSession, loadWork } from '../../../lib/store';
import { CATEGORIES } from '../../../lib/menuCategories';
import styles from './page.module.css';

type Dish = { id: string; name: string; category: string };

export default function DetectedMenuPage() {
  const [dishes, setDishes] = useState<Dish[] | null>(null);

  useEffect(() => {
    try {
      const session = getSession();
      if (!session) return;
      const work = loadWork(session.tenantId);
      const cached = JSON.parse(sessionStorage.getItem(`menu-detection:${session.tenantId}`) || 'null');
      const menu = cached?.rawMenuText === work.event.rawMenuText ? cached?.preview?.menu : [];
      setDishes(Array.isArray(menu) ? menu.filter((dish: Dish) =>
        dish && typeof dish.name === 'string' && dish.name.trim() && typeof dish.category === 'string'
      ) : []);
    } catch {
      setDishes([]);
    }
  }, []);

  const groups = new Map<string, Dish[]>();
  for (const dish of dishes ?? []) {
    const category = dish.category.trim() || 'Other';
    const group = groups.get(category) ?? [];
    if (!group.some((item) => item.name.trim().toLowerCase() === dish.name.trim().toLowerCase())) {
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
        {dishes === null ? <p role="status">Loading dishes…</p> : categories.length === 0 ? (
          <p>No detected dishes to show. <Link href="/app/event">Upload a menu to get started.</Link></p>
        ) : categories.map((category, index) => (
          <section className={styles.category} key={category} aria-labelledby={`category-${index}`}>
            <h2 id={`category-${index}`}>{category}</h2>
            <ul>{groups.get(category)!.map((dish) => <li key={dish.id}>{dish.name}</li>)}</ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
