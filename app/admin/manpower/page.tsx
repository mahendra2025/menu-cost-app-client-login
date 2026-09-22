'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  DEFAULT_MANPOWER_RULES,
  MANPOWER_RULE_DEFINITIONS,
  normalizeManpowerRules,
  type ManpowerRuleConfig,
  type ManpowerRuleDefinition,
} from '../../../lib/manpowerMaster';

const GROUP_ORDER:
  ManpowerRuleDefinition['group'][] = [
    'Service',
    'Water Service',
    'Counters',
    'Live Counters',
    'Bread',
    'Kitchen',
    'Preparation',
    'Utility',
    'Logistics & Management',
  ];

export default function AdminManpowerMasterPage() {
  const [
    rules,
    setRules,
  ] =
    useState<ManpowerRuleConfig>({
      ...DEFAULT_MANPOWER_RULES,
    });

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    updatedAt,
    setUpdatedAt,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    void load();
  }, []);

  const groupedRules =
    useMemo(
      () =>
        GROUP_ORDER.map(
          (group) => ({
            group,
            definitions:
              MANPOWER_RULE_DEFINITIONS.filter(
                (definition) =>
                  definition.group ===
                  group,
              ),
          }),
        ),
      [],
    );

  async function load() {
    setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/manpower-master',
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
            'Could not load manpower master.',
        );
      }

      setRules(
        normalizeManpowerRules(
          data.rules,
        ),
      );

      setUpdatedAt(
        typeof data.updatedAt ===
          'string'
          ? data.updatedAt
          : null,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load manpower master.',
      );
    } finally {
      setLoading(false);
    }
  }

  function updateRule(
    definition:
      ManpowerRuleDefinition,
    rawValue: string,
  ) {
    setMessage('');
    setError('');

    const value =
      Number(rawValue);

    setRules(
      (current) => ({
        ...current,
        [definition.key]:
          Number.isFinite(value)
            ? value
            : 0,
      }),
    );
  }

  function resetDraft() {
    setRules({
      ...DEFAULT_MANPOWER_RULES,
    });

    setMessage(
      'Default values loaded. Save to apply them.',
    );

    setError('');
  }

  async function save() {
    for (
      const definition
      of MANPOWER_RULE_DEFINITIONS
    ) {
      const value =
        Number(
          rules[
            definition.key
          ],
        );

      if (
        !Number.isFinite(
          value,
        ) ||
        value <
          definition.min ||
        value >
          definition.max
      ) {
        setError(
          `${definition.label} must be between ${definition.min} and ${definition.max}.`,
        );

        return;
      }
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/manpower-master',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                rules,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save manpower master.',
        );
      }

      setRules(
        normalizeManpowerRules(
          data.rules,
        ),
      );

      setUpdatedAt(
        typeof data.updatedAt ===
          'string'
          ? data.updatedAt
          : null,
      );

      setMessage(
        'Manpower Master saved. New auto calculations will use these rules.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save manpower master.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Manpower Master"
      subtitle="Manage automatic staffing ratios and capacities"
    >
      <section className="content-grid">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">
              Admin Manpower Master
            </span>

            <h2>
              One control center for automatic manpower
            </h2>

            <p>
              Edit guest ratios, station capacities and kitchen workload triggers. Saved values are used by the Team page for future automatic recommendations.
            </p>
          </div>

          <div className="final-costing-overview-total">
            <span>
              Calculation rules
            </span>

            <b>
              {MANPOWER_RULE_DEFINITIONS.length}
            </b>

            <small>
              {GROUP_ORDER.length} rule groups
              {updatedAt
                ? ` · Saved ${new Date(
                    updatedAt,
                  ).toLocaleString(
                    'en-IN',
                  )}`
                : ''}
            </small>
          </div>
        </div>

        {loading ? (
          <div className="loader-card">
            Loading manpower master…
          </div>
        ) : (
          groupedRules.map(
            ({
              group,
              definitions,
            }) => (
              <div
                className="glass-card"
                key={group}
              >
                <div className="final-costing-section-heading">
                  <div>
                    <span className="section-kicker">
                      Manpower Rules
                    </span>

                    <h2>
                      {group}
                    </h2>

                    <p>
                      {group ===
                      'Service'
                        ? 'Waiter, captain and supervisor capacities.'
                        : group ===
                            'Water Service'
                          ? 'Water-service style ratios.'
                          : group ===
                              'Counters'
                            ? 'General serving station capacities.'
                            : group ===
                                'Live Counters'
                              ? 'Cook and helper throughput for live stations.'
                              : group ===
                                  'Bread'
                                ? 'Bread production and support-team rules.'
                                : group ===
                                    'Kitchen'
                                  ? 'Main production, halwai and kitchen leadership rules.'
                                  : group ===
                                      'Preparation'
                                    ? 'Preparation helper workload rules.'
                                    : group ===
                                        'Utility'
                                      ? 'Dishwashing and cleaning capacities.'
                                      : 'Waste, loading and event-management triggers.'}
                    </p>
                  </div>

                  <span className="badge">
                    {definitions.length} rules
                  </span>
                </div>

                <div
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(250px, 1fr))',
                    gap:
                      '14px',
                  }}
                >
                  {definitions.map(
                    (
                      definition,
                    ) => (
                      <label
                        className="field"
                        key={
                          definition.key
                        }
                        style={{
                          padding:
                            '14px',
                          border:
                            '1px solid var(--line, rgba(255,255,255,.12))',
                          borderRadius:
                            '16px',
                        }}
                      >
                        <span>
                          {
                            definition.label
                          }
                        </span>

                        <small className="muted">
                          {
                            definition.description
                          }
                        </small>

                        <div
                          style={{
                            display:
                              'grid',
                            gridTemplateColumns:
                              'minmax(0, 1fr) auto',
                            gap:
                              '10px',
                            alignItems:
                              'center',
                          }}
                        >
                          <input
                            className="input"
                            type="number"
                            min={
                              definition.min
                            }
                            max={
                              definition.max
                            }
                            step={
                              definition.step
                            }
                            value={
                              rules[
                                definition.key
                              ]
                            }
                            onChange={(
                              event,
                            ) =>
                              updateRule(
                                definition,
                                event
                                  .target
                                  .value,
                              )
                            }
                          />

                          <b
                            className="muted"
                            style={{
                              fontSize:
                                '12px',
                              minWidth:
                                '88px',
                              textAlign:
                                'right',
                            }}
                          >
                            {
                              definition.unit
                            }
                          </b>
                        </div>
                      </label>
                    ),
                  )}
                </div>
              </div>
            ),
          )
        )}

        {message ? (
          <div className="admin-message success">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="admin-message error">
            {error}
          </div>
        ) : null}

        <div className="action-row page-actions">
          <button
            className="primary-button"
            type="button"
            disabled={
              loading ||
              saving
            }
            onClick={() =>
              void save()
            }
          >
            {saving
              ? 'Saving…'
              : 'Save Manpower Master'}
          </button>

          <button
            className="ghost-button"
            type="button"
            disabled={
              loading ||
              saving
            }
            onClick={
              resetDraft
            }
          >
            Reset to Defaults
          </button>
        </div>
      </section>
    </AppShell>
  );
}
