'use client';

import AppShell from '../../components/AppShell';

export default function AdminRecipeStudioPage() {
  return (
    <AppShell
      title="Recipe Cost Studio"
      subtitle="Build recipes, manage ingredient rates, and calculate per-person food cost"
    >
      <section className="recipe-studio-shell">
        <iframe
          className="recipe-studio-frame"
          src="/recipe-cost-studio.html"
          title="CatererOS Recipe Cost Studio"
        />
      </section>
    </AppShell>
  );
}
