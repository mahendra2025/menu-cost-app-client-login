'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { clearWork, getClients, getSession, loadWork, logout, saveWork, upsertClient } from '../../../lib/store';
import type { ClientUser, Session, WorkState } from '../../../lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [client, setClient] = useState<ClientUser | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) {
      setWork(loadWork(current.tenantId));
      if (current.role === 'CLIENT') setClient(getClients().find((item) => item.id === current.tenantId) ?? null);
    }
  }, []);

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
    <AppShell title="Profile" subtitle="Fifth page: business profile, plan status and logout">
      <section className="content-grid">
        <div className="stat-grid">
          <div className="stat-card"><small>Role</small><strong>{session.role}</strong><span>{session.userId}</span></div>
          <div className="stat-card"><small>Plan</small><strong>{session.role === 'CLIENT' ? '₹999' : 'Admin'}</strong><span>Monthly Pro</span></div>
          <div className="stat-card"><small>Status</small><strong>{session.status}</strong><span>{client?.expiryDate ? `Expiry ${client.expiryDate}` : 'No expiry'}</span></div>
          <div className="stat-card"><small>Data</small><strong>Local</strong><span>Browser storage demo</span></div>
        </div>

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
              <button className="ghost-button" onClick={() => { logout(); router.replace('/login'); }}>Logout</button>
              <button className="danger-button" onClick={resetMyData}>Remove My Saved Data</button>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h2>How Client Login Works</h2>
          <p className="muted">Admin creates user ID and password in Admin Users. Give those details to your client. If payment is not done, admin changes status to EXPIRED and the client app becomes locked.</p>
        </div>
      </section>
    </AppShell>
  );
}
