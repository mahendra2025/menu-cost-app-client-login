'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

type TenantLink = {
  id: string;
  name: string;
  email: string;
  status: string;
  caterersOsWorkspaceId: string | null;
  caterersOsSyncEnabled: boolean;
  caterersOsLinkedAt: string | null;
};

type Draft = {
  workspaceId: string;
  enabled: boolean;
};

export default function CaterersOsLinksPage() {
  const [
    tenants,
    setTenants,
  ] = useState<TenantLink[]>([]);
  const [
    drafts,
    setDrafts,
  ] = useState<
    Record<string, Draft>
  >({});
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    savingId,
    setSavingId,
  ] = useState('');
  const [
    message,
    setMessage,
  ] = useState('');
  const [
    error,
    setError,
  ] = useState('');

  const load =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const response =
          await fetch(
            '/api/admin/caterersos-links',
            {
              cache:
                'no-store',
            },
          );
        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Could not load CaterersOS links',
          );
        }

        const rows =
          Array.isArray(
            data.tenants,
          )
            ? data.tenants as TenantLink[]
            : [];

        setTenants(rows);
        setDrafts(
          Object.fromEntries(
            rows.map(
              (tenant) => [
                tenant.id,
                {
                  workspaceId:
                    tenant.caterersOsWorkspaceId ||
                    '',
                  enabled:
                    Boolean(
                      tenant.caterersOsSyncEnabled,
                    ),
                },
              ],
            ),
          ),
        );
      } catch (
        nextError
      ) {
        setError(
          nextError instanceof
            Error
            ? nextError.message
            : 'Could not load CaterersOS links',
        );
      } finally {
        setLoading(
          false,
        );
      }
    }, []);

  useEffect(
    () => {
      void load();
    },
    [load],
  );

  const linkedCount =
    useMemo(
      () =>
        tenants.filter(
          (tenant) =>
            tenant.caterersOsSyncEnabled &&
            tenant.caterersOsWorkspaceId,
        ).length,
      [tenants],
    );

  function updateDraft(
    tenantId: string,
    patch: Partial<Draft>,
  ) {
    setDrafts(
      (current) => ({
        ...current,
        [tenantId]: {
          workspaceId:
            current[
              tenantId
            ]?.workspaceId ||
            '',
          enabled:
            current[
              tenantId
            ]?.enabled ||
            false,
          ...patch,
        },
      }),
    );
  }

  async function save(
    tenant: TenantLink,
  ) {
    const draft =
      drafts[tenant.id] || {
        workspaceId: '',
        enabled: false,
      };

    setSavingId(
      tenant.id,
    );
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/caterersos-links',
          {
            method:
              'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                tenantId:
                  tenant.id,
                workspaceId:
                  draft.workspaceId,
                enabled:
                  draft.enabled,
              }),
          },
        );
      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save CaterersOS link',
        );
      }

      setTenants(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              tenant.id
                ? data.tenant
                : item,
          ),
      );
      setMessage(
        `${tenant.name} CaterersOS link saved.`,
      );
    } catch (
      nextError
    ) {
      setError(
        nextError instanceof
          Error
          ? nextError.message
          : 'Could not save CaterersOS link',
      );
    } finally {
      setSavingId('');
    }
  }

  return (
    <main
      style={{
        maxWidth: 1180,
        margin:
          '0 auto',
        padding:
          '32px 20px 60px',
        fontFamily:
          'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display:
            'flex',
          gap: 16,
          justifyContent:
            'space-between',
          alignItems:
            'flex-start',
          flexWrap:
            'wrap',
          marginBottom:
            24,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color:
                '#ea580c',
              fontWeight: 800,
              letterSpacing:
                '.08em',
              textTransform:
                'uppercase',
              fontSize: 12,
            }}
          >
            Global SaaS integration
          </p>
          <h1
            style={{
              margin:
                '6px 0 8px',
              fontSize: 32,
              color:
                '#0f172a',
            }}
          >
            CaterersOS Links
          </h1>
          <p
            style={{
              margin: 0,
              color:
                '#64748b',
              maxWidth: 720,
            }}
          >
            Connect each Menu Cost tenant to exactly one CaterersOS workspace. Event data is sent only to that tenant&apos;s linked workspace.
          </p>
        </div>
        <div
          style={{
            border:
              '1px solid #e2e8f0',
            borderRadius:
              16,
            padding:
              '14px 18px',
            background:
              '#fff',
            minWidth:
              150,
          }}
        >
          <div
            style={{
              color:
                '#64748b',
              fontSize: 12,
            }}
          >
            Active links
          </div>
          <strong
            style={{
              display:
                'block',
              fontSize: 28,
              color:
                '#0f172a',
            }}
          >
            {linkedCount}
          </strong>
        </div>
      </div>

      {message ? (
        <div
          style={{
            marginBottom:
              16,
            padding:
              '12px 14px',
            borderRadius:
              12,
            background:
              '#f0fdf4',
            color:
              '#166534',
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom:
              16,
            padding:
              '12px 14px',
            borderRadius:
              12,
            background:
              '#fef2f2',
            color:
              '#991b1b',
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          border:
            '1px solid #e2e8f0',
          borderRadius:
            18,
          overflow:
            'hidden',
          background:
            '#fff',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: 24,
              color:
                '#64748b',
            }}
          >
            Loading tenants…
          </div>
        ) : tenants.length ===
          0 ? (
          <div
            style={{
              padding: 24,
              color:
                '#64748b',
            }}
          >
            No tenants found.
          </div>
        ) : (
          tenants.map(
            (tenant) => {
              const draft =
                drafts[
                  tenant.id
                ] || {
                  workspaceId:
                    '',
                  enabled:
                    false,
                };

              return (
                <section
                  key={
                    tenant.id
                  }
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      'minmax(220px, 1fr) minmax(300px, 1.4fr) auto auto',
                    gap: 14,
                    alignItems:
                      'center',
                    padding:
                      '18px 20px',
                    borderBottom:
                      '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <strong
                      style={{
                        color:
                          '#0f172a',
                      }}
                    >
                      {
                        tenant.name
                      }
                    </strong>
                    <div
                      style={{
                        color:
                          '#64748b',
                        fontSize:
                          13,
                        marginTop:
                          3,
                      }}
                    >
                      {
                        tenant.email
                      } ·{' '}
                      {
                        tenant.status
                      }
                    </div>
                  </div>

                  <input
                    value={
                      draft.workspaceId
                    }
                    onChange={(
                      event,
                    ) =>
                      updateDraft(
                        tenant.id,
                        {
                          workspaceId:
                            event
                              .target
                              .value,
                        },
                      )
                    }
                    placeholder="CaterersOS workspace UUID"
                    style={{
                      width:
                        '100%',
                      boxSizing:
                        'border-box',
                      border:
                        '1px solid #cbd5e1',
                      borderRadius:
                        10,
                      padding:
                        '11px 12px',
                      fontSize:
                        14,
                    }}
                  />

                  <label
                    style={{
                      display:
                        'flex',
                      gap: 8,
                      alignItems:
                        'center',
                      whiteSpace:
                        'nowrap',
                      color:
                        '#334155',
                      fontSize:
                        14,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        draft.enabled
                      }
                      disabled={
                        !draft.workspaceId.trim()
                      }
                      onChange={(
                        event,
                      ) =>
                        updateDraft(
                          tenant.id,
                          {
                            enabled:
                              event
                                .target
                                .checked,
                          },
                        )
                      }
                    />
                    Sync enabled
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      void save(
                        tenant,
                      )
                    }
                    disabled={
                      savingId ===
                      tenant.id
                    }
                    style={{
                      border: 0,
                      borderRadius:
                        10,
                      padding:
                        '11px 16px',
                      background:
                        '#0f172a',
                      color:
                        '#fff',
                      fontWeight:
                        700,
                      cursor:
                        'pointer',
                    }}
                  >
                    {savingId ===
                    tenant.id
                      ? 'Saving…'
                      : 'Save'}
                  </button>
                </section>
              );
            },
          )
        )}
      </div>
    </main>
  );
}
