'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { clearWork, getClients, getSession, loadWork, logout, saveWork, upsertClient } from '../../../lib/store';
import type { ClientUser, Session, WorkState } from '../../../lib/types';

type BillingStatus = {
  configured: boolean;
  plan: string;
  status: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  razorpaySubscriptionId: string | null;
};

type RazorpayCheckout = new (options: Record<string, unknown>) => { open: () => void };

declare global {
  interface Window { Razorpay?: RazorpayCheckout }
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [client, setClient] = useState<ClientUser | null>(null);
  const [message, setMessage] = useState('');
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) {
      setWork(loadWork(current.tenantId));
      if (current.role === 'CLIENT') setClient(getClients().find((item) => item.id === current.tenantId) ?? null);
      if (current.role === 'CLIENT') void loadBilling();
    }
  }, []);

  async function loadBilling() {
    try {
      const response = await fetch('/api/billing/status', { cache: 'no-store' });
      if (response.ok) setBilling(await response.json());
    } catch {
      setMessage('Could not load subscription status.');
    }
  }

  function loadRazorpayCheckout() {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function subscribe() {
    setBillingBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/billing/create-subscription', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start subscription');
      if (!(await loadRazorpayCheckout()) || !window.Razorpay) throw new Error('Could not load Razorpay Checkout');
      const checkout = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Menu Cost App',
        description: 'Monthly Pro · ₹999',
        prefill: { email: session?.userId || '' },
        theme: { color: '#007aff' },
        handler: async (result: Record<string, string>) => {
          const verify = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
          });
          const verified = await verify.json();
          if (!verify.ok) {
            setMessage(verified.error || 'Payment verification failed.');
            return;
          }
          setMessage('Payment verified. Your subscription will activate shortly.');
          await loadBilling();
        },
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start subscription');
    } finally {
      setBillingBusy(false);
    }
  }

  async function cancelSubscription() {
    if (!confirm('Cancel renewal at the end of the current billing cycle?')) return;
    setBillingBusy(true);
    try {
      const response = await fetch('/api/billing/cancel', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not cancel subscription');
      setMessage('Subscription will cancel at the end of the current billing cycle.');
      await loadBilling();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not cancel subscription');
    } finally {
      setBillingBusy(false);
    }
  }

  if (!work || !session) return <AppShell title="Profile"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;

  function persist(next: WorkState) {
    if (!session) return;
    setWork(next);
    saveWork(session.tenantId, next);
  }

  function saveProfile() {
    if (!work) return;
    const current = work;
    persist(current);
    if (client) {
      const updated = {
        ...client,
        businessName: current.profile.businessName || client.businessName,
        ownerName: current.profile.ownerName,
        phone: current.profile.phone,
        city: current.profile.city,
      };
      upsertClient(updated);
      setClient(updated);
    }
    setMessage('Profile saved.');
  }

  function resetMyData() {
    if (!session) return;
    if (!confirm('Clear event, menu, cost and profile data from this browser?')) return;
    clearWork(session.tenantId);
    const fresh = loadWork(session.tenantId);
    setWork(fresh);
    setMessage('Your saved app data was cleared.');
  }

  return (
    <AppShell title="Profile" subtitle="Step 6 of 6: business profile, plan status and logout">
      <section className="content-grid">
        <div className="stat-grid">
          <div className="stat-card"><small>Role</small><strong>{session.role}</strong><span>{session.userId}</span></div>
          <div className="stat-card"><small>Plan</small><strong>{session.role === 'CLIENT' ? '₹999' : 'Admin'}</strong><span>Monthly Pro</span></div>
          <div className="stat-card"><small>Status</small><strong>{session.status}</strong><span>{client?.expiryDate ? `Expiry ${client.expiryDate}` : 'No expiry'}</span></div>
          <div className="stat-card"><small>Saving</small><strong>Auto-saved</strong><span>Stored on this device</span></div>
        </div>

        {session.role === 'CLIENT' ? (
          <div className="glass-card billing-card">
            <div className="billing-heading">
              <div><div className="section-kicker">Razorpay Subscription</div><h2>Monthly Pro</h2><p className="muted">Full Menu Cost access with secure recurring billing.</p></div>
              <div className="billing-price"><strong>₹999</strong><span>/ month</span></div>
            </div>
            <div className="billing-details">
              <div><small>Billing status</small><strong>{billing?.subscriptionStatus || 'Not subscribed'}</strong></div>
              <div><small>Next billing date</small><strong>{billing?.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString('en-IN') : '—'}</strong></div>
              <div><small>Renewal</small><strong>{billing?.cancelAtPeriodEnd ? 'Cancels after cycle' : billing?.razorpaySubscriptionId ? 'Automatic' : 'Not started'}</strong></div>
            </div>
            {!billing?.configured ? <div className="admin-message">Online subscription is not available yet. Contact your account administrator to activate or renew your plan.</div> : null}
            <div className="action-row">
              {billing?.configured && !['active', 'authenticated', 'pending'].includes(billing?.subscriptionStatus || '') ? <button className="primary-button" disabled={billingBusy} onClick={subscribe}>{billingBusy ? 'Opening…' : 'Subscribe ₹999/month'}</button> : null}
              {billing?.razorpaySubscriptionId && !billing.cancelAtPeriodEnd ? <button className="danger-button" disabled={billingBusy} onClick={cancelSubscription}>Cancel renewal</button> : null}
              <button className="ghost-button" disabled={billingBusy} onClick={loadBilling}>Refresh status</button>
            </div>
          </div>
        ) : null}

        <div className="glass-card">
          <h2>Business Profile</h2>
          <div className="form-grid">
            <div className="three-grid">
              <div className="field"><label>Business Name</label><input className="input" value={work.profile.businessName} onChange={(e) => persist({ ...work, profile: { ...work.profile, businessName: e.target.value } })} /></div>
              <div className="field"><label>Owner Name</label><input className="input" value={work.profile.ownerName} onChange={(e) => persist({ ...work, profile: { ...work.profile, ownerName: e.target.value } })} /></div>
              <div className="field"><label>Mobile Number</label><input className="input" value={work.profile.phone} onChange={(e) => persist({ ...work, profile: { ...work.profile, phone: e.target.value } })} /></div>
            </div>
            <div className="two-grid">
              <div className="field"><label>City</label><input className="input" value={work.profile.city} onChange={(e) => persist({ ...work, profile: { ...work.profile, city: e.target.value } })} /></div>
              <div className="field"><label>Logo Text</label><input className="input" value={work.profile.logoText} onChange={(e) => persist({ ...work, profile: { ...work.profile, logoText: e.target.value.toUpperCase().slice(0, 4) } })} placeholder="KC" /></div>
            </div>
            {message ? <p className="muted"><b>{message}</b></p> : null}
            <div className="action-row">
              <button className="primary-button" onClick={saveProfile}>Save Profile</button>
              <button className="ghost-button" onClick={() => { logout(); void fetch('/api/client/session', { method: 'DELETE' }); router.replace('/login'); }}>Logout</button>
              <button className="danger-button" onClick={resetMyData}>Remove My Saved Data</button>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h2>Your Data & Access</h2>
          <p className="muted">Your event, menu, manpower and costing changes save automatically on this device. Your account administrator manages login access and subscription status.</p>
        </div>
      </section>
    </AppShell>
  );
}
