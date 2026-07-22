'use client';

import { useEffect, useRef, useState } from 'react';
import AppShell from '../../components/AppShell';

export default function AdminRecipeStudioPage() {
  const workspaceRef = useRef<HTMLElement>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlowLoad(true), 8000);
    return () => window.clearTimeout(timer);
  }, [loading, frameKey]);

  useEffect(() => {
    const syncFullscreenState = () => setExpanded(document.fullscreenElement === workspaceRef.current);
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await workspaceRef.current?.requestFullscreen();
  }

  function reloadStudio() {
    setLoading(true);
    setSlowLoad(false);
    setFrameKey((current) => current + 1);
  }

  return (
    <AppShell
      title="Recipes"
      subtitle="Standardise ingredients, yields and food cost across your catalog"
    >
      <section className="recipe-workspace" ref={workspaceRef}>
        <header className="recipe-workspace-header no-print">
          <div className="recipe-workspace-copy">
            <span className="page-eyebrow">Recipe operations</span>
            <h2>Recipe Cost Studio</h2>
            <p>Choose a dish, update its batch recipe, and review the live per-person cost.</p>
          </div>

          <div className="recipe-workspace-controls">
            <div className="recipe-status-list" aria-label="Workspace features">
              <span><i className="recipe-status-dot" aria-hidden="true" />PostgreSQL storage</span>
              <span>Live costing</span>
            </div>
            <div className="action-row recipe-workspace-actions">
              <button className="ghost-button" type="button" onClick={reloadStudio}>
                Reload studio
              </button>
              <button className="secondary-button" type="button" onClick={() => void toggleFullscreen()}>
                {expanded ? 'Exit full screen' : 'Full screen'}
              </button>
            </div>
          </div>
        </header>

        <div className="recipe-studio-shell">
          {loading ? (
            <div className="recipe-studio-loading" role="status" aria-live="polite">
              <span className="recipe-loading-spinner" aria-hidden="true" />
              <strong>{slowLoad ? 'The studio is taking longer than expected' : 'Opening your recipe workspace'}</strong>
              <p>{slowLoad ? 'Your saved recipes are safe. Try reloading the studio.' : 'Loading recipes, ingredients and market rates…'}</p>
              {slowLoad ? (
                <button className="ghost-button" type="button" onClick={reloadStudio}>Try again</button>
              ) : null}
            </div>
          ) : null}
          <iframe
            key={frameKey}
            className="recipe-studio-frame"
            src="/recipe-cost-studio.html?embedded=1"
            title="Menu Cost Recipe Cost Studio"
            onLoad={() => {
              setLoading(false);
              setSlowLoad(false);
            }}
          />
        </div>
      </section>
    </AppShell>
  );
}
