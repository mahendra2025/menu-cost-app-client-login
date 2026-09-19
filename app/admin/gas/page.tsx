'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  DEFAULT_GAS_CATEGORY_RATES,
  DEFAULT_LPG_SETTING,
  lpgRatePerKg,
  type GasCategoryRateValue,
  type LpgCostSetting,
} from '../../../lib/gasCost';

export default function AdminGasCostPage() {
  const [
    setting,
    setSetting,
  ] =
    useState<LpgCostSetting>({
      ...DEFAULT_LPG_SETTING,
    });

  const [
    rates,
    setRates,
  ] =
    useState<GasCategoryRateValue[]>(
      () =>
        DEFAULT_GAS_CATEGORY_RATES.map(
          (rate) => ({
            ...rate,
          }),
        ),
    );

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

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/gas-cost',
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
            'Could not load gas cost master.',
        );
      }

      if (data.setting) {
        setSetting({
          cylinderPrice:
            Number(
              data.setting
                .cylinderPrice,
            ) ||
            DEFAULT_LPG_SETTING
              .cylinderPrice,
          cylinderWeightKg:
            Number(
              data.setting
                .cylinderWeightKg,
            ) ||
            DEFAULT_LPG_SETTING
              .cylinderWeightKg,
        });
      }

      if (
        Array.isArray(
          data.categoryRates,
        )
      ) {
        setRates(
          data.categoryRates,
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load gas cost master.',
      );
    } finally {
      setLoading(false);
    }
  }

  const activeCount =
    useMemo(
      () =>
        rates.filter(
          (rate) =>
            rate.active !== false,
        ).length,
      [rates],
    );

  const ratePerKg =
    lpgRatePerKg(
      setting,
    );

  function updateRate(
    index: number,
    patch:
      Partial<GasCategoryRateValue>,
  ) {
    setMessage('');
    setError('');

    setRates(
      (current) =>
        current.map(
          (rate, rateIndex) =>
            rateIndex === index
              ? {
                  ...rate,
                  ...patch,
                }
              : rate,
        ),
    );
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/gas-cost',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                categoryRates:
                  rates.map(
                    (rate) => ({
                      categoryName:
                        rate.categoryName,
                      lpgKgPer100:
                        Math.max(
                          0,
                          Number(
                            rate.lpgKgPer100,
                          ) || 0,
                        ),
                      basePax:
                        100,
                      active:
                        rate.active !==
                        false,
                    }),
                  ),
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save gas category rates.',
        );
      }

      if (
        Array.isArray(
          data.categoryRates,
        )
      ) {
        setRates(
          data.categoryRates,
        );
      }

      setMessage(
        'Gas Category Master saved.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save gas category rates.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Gas Cost"
      subtitle="Manage category LPG usage per 100 guests"
    >
      <section className="content-grid gas-master-page">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">
              Gas Category Master
            </span>
            <h2>
              Automatic LPG usage by food category
            </h2>
            <p>
              Every dish uses its category rate unless that dish has a manual LPG override.
            </p>
          </div>

          <div className="final-costing-overview-total">
            <span>
              Current LPG rate
            </span>
            <b>
              ₹{ratePerKg.toFixed(2)} / kg
            </b>
            <small>
              ₹{setting.cylinderPrice.toLocaleString('en-IN')} ÷ {setting.cylinderWeightKg} kg
            </small>

            <Link
              className="secondary-button"
              href="/admin/settings/cost-masters/lpg"
            >
              LPG Settings
            </Link>
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">
                Category Rates
              </span>
              <h2>
                LPG kg per 100 guests
              </h2>
              <p>
                These rates are used automatically in every event. Zero is valid for no-gas categories.
              </p>
            </div>

            <span className="badge">
              {activeCount} active
            </span>
          </div>

          {loading ? (
            <div className="loader-card">
              Loading gas rates…
            </div>
          ) : (
            <div className="gas-category-grid">
              {rates.map(
                (rate, index) => (
                  <article
                    className="gas-category-row"
                    key={rate.categoryName}
                  >
                    <div>
                      <b>
                        {rate.categoryName}
                      </b>
                      <small>
                        Base: 100 guests
                      </small>
                    </div>

                    <label>
                      <span>
                        kg / 100
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          rate.lpgKgPer100
                        }
                        onChange={(event) =>
                          updateRate(
                            index,
                            {
                              lpgKgPer100:
                                Math.max(
                                  0,
                                  Number(
                                    event.target.value,
                                  ) || 0,
                                ),
                            },
                          )
                        }
                      />
                    </label>

                    <label className="gas-active-toggle">
                      <input
                        type="checkbox"
                        checked={
                          rate.active !==
                          false
                        }
                        onChange={(event) =>
                          updateRate(
                            index,
                            {
                              active:
                                event.target.checked,
                            },
                          )
                        }
                      />
                      <span>
                        Active
                      </span>
                    </label>
                  </article>
                ),
              )}
            </div>
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
                saving ||
                loading
              }
              onClick={() =>
                void save()
              }
            >
              {saving
                ? 'Saving…'
                : 'Save Category Rates'}
            </button>

            <Link
              className="ghost-button"
              href="/admin/dishes"
            >
              Edit Dish Overrides
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
