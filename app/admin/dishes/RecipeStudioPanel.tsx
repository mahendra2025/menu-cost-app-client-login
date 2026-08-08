'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

type StudioStatus = {
  state:
    | 'connecting'
    | 'saving'
    | 'saved'
    | 'offline';
  text: string;
  recipes: number;
  costedRecipes: number;
  ingredients: number;
  missingRates: number;
  selectedRecipe: string;
  dirty: boolean;
};

export type RecipeStudioDishRequest = {
  requestId: string;
  name: string;
  category: string;
  subcategory: string;
};

const INITIAL_STATUS: StudioStatus = {
  state: 'connecting',
  text: 'Connecting to recipe storage',
  recipes: 0,
  costedRecipes: 0,
  ingredients: 0,
  missingRates: 0,
  selectedRecipe: '',
  dirty: false,
};

export default function RecipeStudioPanel({
  requestedDish,
  catalogRevision = 0,
  onCatalogChanged,
}: {
  requestedDish?: RecipeStudioDishRequest | null;
  catalogRevision?: number;
  onCatalogChanged?: () => void;
}) {
  const workspaceRef =
    useRef<HTMLElement>(null);
  const frameRef =
    useRef<HTMLIFrameElement>(null);
  const [frameKey, setFrameKey] =
    useState(0);
  const [loading, setLoading] =
    useState(true);
  const [slowLoad, setSlowLoad] =
    useState(false);
  const [expanded, setExpanded] =
    useState(false);
  const [
    studioStatus,
    setStudioStatus,
  ] = useState<StudioStatus>(
    INITIAL_STATUS,
  );
  const [
    workspaceMessage,
    setWorkspaceMessage,
  ] = useState('');

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(
      () => setSlowLoad(true),
      8000,
    );
    return () =>
      window.clearTimeout(timer);
  }, [loading, frameKey]);

  useEffect(() => {
    const syncFullscreenState = () =>
      setExpanded(
        document.fullscreenElement ===
          workspaceRef.current,
      );
    document.addEventListener(
      'fullscreenchange',
      syncFullscreenState,
    );
    return () =>
      document.removeEventListener(
        'fullscreenchange',
        syncFullscreenState,
      );
  }, []);

  useEffect(() => {
    const receiveStudioStatus = (
      event: MessageEvent,
    ) => {
      if (
        event.origin !==
          window.location.origin ||
        event.source !==
          frameRef.current
            ?.contentWindow
      ) {
        return;
      }
      if (!event.data) {
        return;
      }
      if (event.data.type === 'recipe-studio-catalog-changed') {
        onCatalogChanged?.();
        return;
      }
      if (event.data.type !== 'recipe-studio-status') return;

      const payload =
        event.data as Partial<StudioStatus> & {
          type: string;
        };
      setStudioStatus({
        state: [
          'connecting',
          'saving',
          'saved',
          'offline',
        ].includes(
          String(payload.state),
        )
          ? (payload.state as StudioStatus['state'])
          : 'connecting',
        text: String(
          payload.text ||
            'Recipe studio ready',
        ),
        recipes: Math.max(
          0,
          Number(payload.recipes) || 0,
        ),
        costedRecipes: Math.max(
          0,
          Number(
            payload.costedRecipes,
          ) || 0,
        ),
        ingredients: Math.max(
          0,
          Number(payload.ingredients) ||
            0,
        ),
        missingRates: Math.max(
          0,
          Number(
            payload.missingRates,
          ) || 0,
        ),
        selectedRecipe: String(
          payload.selectedRecipe || '',
        ),
        dirty: Boolean(payload.dirty),
      });
    };

    window.addEventListener(
      'message',
      receiveStudioStatus,
    );
    return () =>
      window.removeEventListener(
        'message',
        receiveStudioStatus,
      );
  }, [onCatalogChanged]);

  useEffect(() => {
    if (!requestedDish || loading) return;
    frameRef.current?.contentWindow?.postMessage(
      {
        type: 'recipe-studio-open-dish',
        dish: requestedDish,
      },
      window.location.origin,
    );
  }, [loading, requestedDish]);

  useEffect(() => {
    if (!catalogRevision || loading) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: 'recipe-studio-refresh-catalog' },
      window.location.origin,
    );
  }, [catalogRevision, loading]);

  async function toggleFullscreen() {
    setWorkspaceMessage('');
    try {
      if (
        document.fullscreenElement
      ) {
        await document.exitFullscreen();
        return;
      }
      await workspaceRef.current
        ?.requestFullscreen();
    } catch {
      setWorkspaceMessage(
        'Full screen is not available in this browser.',
      );
    }
  }

  function reloadStudio() {
    if (
      studioStatus.dirty &&
      !window.confirm(
        'Reload the studio and discard unsaved recipe changes?',
      )
    ) {
      return;
    }
    setLoading(true);
    setSlowLoad(false);
    setWorkspaceMessage('');
    setStudioStatus(INITIAL_STATUS);
    setFrameKey(
      (current) => current + 1,
    );
  }

  return (
    <>
      <section
        className={`recipe-overview ${studioStatus.state === 'offline' ? 'is-offline' : ''}`}
      >
        <div className="recipe-overview-copy">
          <span className="section-kicker">
            Recipe operations
          </span>
          <h2>
            Keep every plate cost-ready
          </h2>
          <p>
            Build recipes by batch,
            connect live ingredient
            rates, and publish the
            calculated per-person cost
            to your Dish Catalog.
          </p>
          <div
            className="recipe-workflow"
            aria-label="Recipe workflow"
          >
            <span>
              <b>1</b>Select a dish
            </span>
            <i aria-hidden="true">→</i>
            <span>
              <b>2</b>Set yield &amp;
              ingredients
            </span>
            <i aria-hidden="true">→</i>
            <span>
              <b>3</b>Apply &amp; save
            </span>
          </div>
        </div>
        <div
          className="recipe-overview-stats"
          aria-label="Recipe catalog summary"
        >
          <div>
            <strong>
              {studioStatus.recipes}
            </strong>
            <span>Recipes</span>
          </div>
          <div>
            <strong>
              {
                studioStatus.costedRecipes
              }
            </strong>
            <span>Costed</span>
          </div>
          <div>
            <strong>
              {studioStatus.ingredients}
            </strong>
            <span>Ingredients</span>
          </div>
          <div
            className={
              studioStatus.missingRates
                ? 'needs-attention'
                : ''
            }
          >
            <strong>
              {
                studioStatus.missingRates
              }
            </strong>
            <span>Missing rates</span>
          </div>
        </div>
      </section>

      <section
        className="recipe-workspace"
        ref={workspaceRef}
      >
        <header className="recipe-workspace-header no-print">
          <div className="recipe-workspace-copy">
            <div className="recipe-workspace-title">
              <span
                className="recipe-workspace-mark"
                aria-hidden="true"
              >
                R
              </span>
              <div>
                <span className="page-eyebrow">
                  Recipe Cost Studio
                </span>
                <h2>
                  {studioStatus.selectedRecipe ||
                    'Recipe workspace'}
                </h2>
              </div>
            </div>
            <p>
              {studioStatus.selectedRecipe
                ? 'Edit the selected batch recipe and review its live per-person cost.'
                : 'Choose a dish to start editing its batch recipe.'}
            </p>
          </div>

          <div className="recipe-workspace-controls">
            <div
              className={`recipe-storage-status ${studioStatus.state}`}
              role="status"
              aria-live="polite"
            >
              <i aria-hidden="true" />
              <span>
                <b>
                  {studioStatus.dirty
                    ? 'Unsaved changes'
                    : studioStatus.text}
                </b>
                <small>
                  {studioStatus.state ===
                  'offline'
                    ? 'Changes remain on this device'
                    : 'PostgreSQL recipe storage'}
                </small>
              </span>
            </div>
            <div className="action-row recipe-workspace-actions">
              <a
                className="ghost-button"
                href="/admin/ingredients"
              >
                Ingredient rates
              </a>
              <button
                className="ghost-button"
                type="button"
                onClick={reloadStudio}
              >
                Reload
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  void toggleFullscreen()
                }
              >
                {expanded
                  ? 'Exit full screen'
                  : 'Full screen'}
              </button>
            </div>
          </div>
        </header>

        {workspaceMessage ? (
          <div
            className="recipe-workspace-message"
            role="alert"
          >
            {workspaceMessage}
          </div>
        ) : null}

        <div className="recipe-studio-shell">
          {loading ? (
            <div
              className="recipe-studio-loading"
              role="status"
              aria-live="polite"
            >
              <span
                className="recipe-loading-spinner"
                aria-hidden="true"
              />
              <strong>
                {slowLoad
                  ? 'The studio is taking longer than expected'
                  : 'Opening your recipe workspace'}
              </strong>
              <p>
                {slowLoad
                  ? 'Your saved recipes are safe. Try reloading the studio.'
                  : 'Loading recipes, ingredients and market rates…'}
              </p>
              {slowLoad ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={reloadStudio}
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}
          <iframe
            key={frameKey}
            ref={frameRef}
            className="recipe-studio-frame"
            src="/recipe-cost-studio.html?embedded=1&theme=dark"
            title="Menu Costing Recipe Cost Studio"
            onLoad={() => {
              setLoading(false);
              setSlowLoad(false);
            }}
            onError={() => {
              setLoading(false);
              setWorkspaceMessage(
                'The Recipe Cost Studio could not be opened. Reload to try again.',
              );
            }}
          />
        </div>
      </section>
    </>
  );
}
