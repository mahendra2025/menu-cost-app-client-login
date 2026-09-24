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
    savingSetting,
    setSavingSetting,
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
    settingMessage,
    setSettingMessage,
  ] =
    useState('');

  const [
    settingError,
    setSettingError,
  ] =
    useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    setSettingError('');

    try {
      const [
        lpgResponse,
        masterResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/admin/gas-cost/lpg',
            {
              cache:
                'no-store',
            },
          ),
          fetch(
            '/api/admin/gas-cost/lpg',
            {
              cache:
                'no-store',
            },
          ),
        ]);

      const lpgData =
        await lpgResponse.json();

      if (!lpgResponse.ok) {
        throw new Error(
          lpgData.error ||
            'Could not load LPG settings.',
        );
      }

      if (lpgData.setting) {
        setSetting({
          cylinderPrice:
            Number(
              lpgData.setting
                .cylinderPrice,
            ) ||
            DEFAULT_LPG_SETTING
              .cylinderPrice,
          cylinderWeightKg:
            Number(
              lpgData.setting
                .cylinderWeightKg,
            ) ||
            DEFAULT_LPG_SETTING
              .cylinderWeightKg,
        });
      }

      const masterData =
        await masterResponse.json();

      if (masterResponse.ok) {
        if (
          Array.isArray(
            masterData.categoryRates,
          )
        ) {
          setRates(
            masterData.categoryRates,
          );
        }
      } else {
        setError(
          masterData.error ||
            'Cylinder settings loaded, but category gas rates could not be loaded.',
        );
      }
    } catch (loadError) {
      setSettingError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load LPG settings.',
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

  function updateSetting(
    patch:
      Partial<LpgCostSetting>,
  ) {
    setSettingMessage('');
    setSettingError('');

    setSetting(
      (current) => ({
        ...current,
        ...patch,
      }),
    );
  }

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

  async function saveSetting() {
    if (
      !(setting.cylinderPrice > 0) ||
      !(setting.cylinderWeightKg > 0)
    ) {
      setError(
        'Cylinder price and cylinder weight must be greater than 0.',
      );
      return;
    }

    setSavingSetting(true);
    setSettingMessage('');
    setSettingError('');

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
                setting: {
                  cylinderPrice:
                    setting.cylinderPrice,
                  cylinderWeightKg:
                    setting.cylinderWeightKg,
                },
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save cylinder price.',
        );
      }

      const savedSetting = {
        cylinderPrice:
          Number(
            data.setting
              ?.cylinderPrice,
          ) ||
          setting.cylinderPrice,
        cylinderWeightKg:
          Number(
            data.setting
              ?.cylinderWeightKg,
          ) ||
          setting.cylinderWeightKg,
      };

      setSetting(
        savedSetting,
      );

      setSettingMessage(
        `Cylinder price saved. LPG rate is ₹${lpgRatePerKg(savedSetting).toFixed(2)} / kg.`,
      );
    } catch (saveError) {
      setSettingError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save cylinder price.',
      );
    } finally {
      setSavingSetting(false);
    }
  }

  async function save() {
    if (
      !(setting.cylinderPrice > 0) ||
      !(setting.cylinderWeightKg > 0)
    ) {
      setError(
        'Cylinder price and cylinder weight must be greater than 0.',
      );
      return;
    }

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
                setting: {
                  cylinderPrice:
                    setting.cylinderPrice,
                  cylinderWeightKg:
                    setting.cylinderWeightKg,
                },
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

      if (data.setting) {
        setSetting({
          cylinderPrice:
            Number(
              data.setting
                .cylinderPrice,
            ) ||
            setting.cylinderPrice,
          cylinderWeightKg:
            Number(
              data.setting
                .cylinderWeightKg,
            ) ||
            setting.cylinderWeightKg,
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

      setMessage(
        'Cylinder price, LPG rate and category gas rates saved.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save gas cost master.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Gas Cost"
      subtitle="Manage LPG price and category fallback rates"
    >
      <section className="content-grid gas-master-page">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">
              Gas Category Master
            </span>
            <h2>
              Category LPG fallback rates
            </h2>
            <p>
              Real dish cooking profiles are preferred. These category rates are used only when a dish has no real profile or measured dish rate.
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
                LPG Price
              </span>
              <h2>
                Commercial cylinder price
              </h2>
              <p>
                Update the current cylinder purchase price here. LPG rate per kg recalculates instantly and is saved with the Gas Cost Master.
              </p>
            </div>

            <span className="badge">
              ₹{ratePerKg.toFixed(2)} / kg
            </span>
          </div>

          <div className="two-grid gas-setting-grid">
            <label className="field">
              <span>
                Cylinder Price ₹
              </span>
              <input
                className="input input-large"
                type="number"
                min="0.01"
                step="1"
                inputMode="decimal"
                value={
                  setting.cylinderPrice
                }
                disabled={
                  loading ||
                  saving ||
                  savingSetting
                }
                onChange={(event) =>
                  updateSetting({
                    cylinderPrice:
                      Math.max(
                        0,
                        Number(
                          event.target.value,
                        ) || 0,
                      ),
                  })
                }
              />
            </label>

            <label className="field">
              <span>
                Cylinder Weight kg
              </span>
              <input
                className="input input-large"
                type="number"
                min="0.01"
                step="0.1"
                inputMode="decimal"
                value={
                  setting.cylinderWeightKg
                }
                disabled={
                  loading ||
                  saving ||
                  savingSetting
                }
                onChange={(event) =>
                  updateSetting({
                    cylinderWeightKg:
                      Math.max(
                        0,
                        Number(
                          event.target.value,
                        ) || 0,
                      ),
                  })
                }
              />
            </label>
          </div>

          <div className="operations-total-box gas-rate-result">
            <span>
              Auto LPG Rate / kg
            </span>
            <strong>
              ₹{ratePerKg.toFixed(2)}
            </strong>
            <small>
              ₹{setting.cylinderPrice.toLocaleString('en-IN')} ÷ {setting.cylinderWeightKg || 0} kg
            </small>
          </div>

          <small className="muted">
            Example: ₹1,900 ÷ 19 kg = ₹100 / kg. All event gas costs use the saved LPG rate.
          </small>

          <div className="action-row page-actions">
            <button
              className="primary-button"
              type="button"
              disabled={
                loading ||
                saving ||
                savingSetting
              }
              onClick={() =>
                void saveSetting()
              }
            >
              {savingSetting
                ? 'Saving Cylinder Price…'
                : 'Save Cylinder Price'}
            </button>
          </div>

          {settingMessage ? (
            <div className="admin-message success">
              {settingMessage}
            </div>
          ) : null}

          {settingError ? (
            <div className="admin-message error">
              {settingError}
            </div>
          ) : null}
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
                These rates are the last fallback when a dish has no real cooking profile and no measured kg / 100 value. Zero is valid for no-gas categories.
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
                : 'Save All Gas Settings'}
            </button>

            <Link
              className="ghost-button"
              href="/admin/gas/profiles"
            >
              Open Dish Gas Profiles
            </Link>

            <Link
              className="ghost-button"
              href="/admin/gas/sweets"
            >
              Open Sweet Gas Master
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
