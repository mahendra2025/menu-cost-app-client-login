'use client';

import Link from 'next/link';
import {
  useEffect,
  useState,
} from 'react';

import AppShell from '../../../../components/AppShell';

import {
  DEFAULT_LPG_SETTING,
  lpgRatePerKg,
  type LpgCostSetting,
} from '../../../../../lib/gasCost';

export default function AdminLpgSettingsPage() {
  const [
    setting,
    setSetting,
  ] =
    useState<LpgCostSetting>({
      ...DEFAULT_LPG_SETTING,
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
            'Could not load LPG settings.',
        );
      }

      setSetting({
        cylinderPrice:
          Number(
            data.setting
              ?.cylinderPrice,
          ) ||
          DEFAULT_LPG_SETTING
            .cylinderPrice,
        cylinderWeightKg:
          Number(
            data.setting
              ?.cylinderWeightKg,
          ) ||
          DEFAULT_LPG_SETTING
            .cylinderWeightKg,
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load LPG settings.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (
      !(setting.cylinderPrice > 0) ||
      !(setting.cylinderWeightKg > 0)
    ) {
      setError(
        'Cylinder price and weight must be greater than 0.',
      );
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

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
                setting,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save LPG settings.',
        );
      }

      setSetting({
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
      });

      setMessage(
        'LPG settings saved.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save LPG settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  const ratePerKg =
    lpgRatePerKg(
      setting,
    );

  return (
    <AppShell
      title="LPG Cost Master"
      subtitle="Admin > Settings > Cost Masters > LPG"
    >
      <section className="content-grid gas-master-page">
        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">
                LPG Settings
              </span>
              <h2>
                Commercial cylinder master
              </h2>
              <p>
                The app uses cylinder price ÷ cylinder weight to calculate the LPG rate per kg automatically.
              </p>
            </div>
          </div>

          <div className="two-grid gas-setting-grid">
            <label className="field">
              <span>
                Commercial Cylinder Price
              </span>
              <input
                className="input input-large"
                type="number"
                min="0.01"
                step="1"
                value={
                  setting.cylinderPrice
                }
                disabled={
                  loading
                }
                onChange={(event) =>
                  setSetting(
                    (current) => ({
                      ...current,
                      cylinderPrice:
                        Math.max(
                          0,
                          Number(
                            event.target.value,
                          ) || 0,
                        ),
                    }),
                  )
                }
              />
            </label>

            <label className="field">
              <span>
                Cylinder Weight in kg
              </span>
              <input
                className="input input-large"
                type="number"
                min="0.01"
                step="0.1"
                value={
                  setting.cylinderWeightKg
                }
                disabled={
                  loading
                }
                onChange={(event) =>
                  setSetting(
                    (current) => ({
                      ...current,
                      cylinderWeightKg:
                        Math.max(
                          0,
                          Number(
                            event.target.value,
                          ) || 0,
                        ),
                    }),
                  )
                }
              />
            </label>
          </div>

          <div className="operations-total-box gas-rate-result">
            <span>
              LPG Rate per kg
            </span>
            <strong>
              ₹{ratePerKg.toFixed(4)}
            </strong>
            <small>
              ₹{setting.cylinderPrice.toLocaleString('en-IN')} ÷ {setting.cylinderWeightKg || 0} kg
            </small>
          </div>

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
                : 'Save LPG Settings'}
            </button>

            <Link
              className="ghost-button"
              href="/admin/gas"
            >
              Gas Category Rates
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
