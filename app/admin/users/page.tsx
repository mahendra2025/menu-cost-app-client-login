'use client';

import { FormEvent, useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { deleteClient, getClients, getSession, saveClients, uid, upsertClient } from '../../../lib/store';
import type { ClientUser } from '../../../lib/types';

const emptyClient: ClientUser = {
  id: '',
  userId: '',
  password: '',
  businessName: '',
  ownerName: '',
  phone: '',
  city: '',
  planName: 'PRO_999',
  status: 'ACTIVE',
  expiryDate: '',
  createdAt: '',
};

export default function AdminUsersPage() {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [form, setForm] = useState<ClientUser>(emptyClient);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const session = getSession();
    if (session?.role !== 'ADMIN') return;
    setClients(getClients());
  }, []);

  function resetForm() {
    setForm(emptyClient);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.userId.trim() || !form.password.trim() || !form.businessName.trim()) {
      setMessage('User ID, password and business name are required.');
      return;
    }
    const allClients = getClients();
    const duplicate = allClients.find((client) => client.userId === form.userId.trim() && client.id !== form.id);
    if (duplicate) {
      setMessage('This user ID already exists. Use another ID.');
      return;
    }
    const client: ClientUser = {
      ...form,
      id: form.id || uid('client'),
      userId: form.userId.trim(),
      password: form.password.trim(),
      status: form.status,
      expiryDate: form.expiryDate || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
      createdAt: form.createdAt || new Date().toISOString(),
    };
    upsertClient(client);
    setClients(getClients());
    setMessage(form.id ? 'Client updated.' : 'Client user created. Give this ID and password to your client.');
    resetForm();
  }

  function toggleStatus(client: ClientUser) {
    const next = { ...client, status: client.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE' } as ClientUser;
    upsertClient(next);
    setClients(getClients());
  }

  function clearAllClients() {
    if (!confirm('Remove all client users from this browser?')) return;
    saveClients([]);
    setClients([]);
    setMessage('All client users removed.');
  }

  return (
    <AppShell title="Admin Users" subtitle="Create ID and password for each client">
      <section className="content-grid">
        <div className="stat-grid">
          <div className="stat-card"><small>Total Clients</small><strong>{clients.length}</strong><span>No default client data</span></div>
          <div className="stat-card"><small>Active</small><strong>{clients.filter((c) => c.status === 'ACTIVE').length}</strong><span>Can use app</span></div>
          <div className="stat-card"><small>Expired</small><strong>{clients.filter((c) => c.status === 'EXPIRED').length}</strong><span>Locked</span></div>
          <div className="stat-card"><small>Plan</small><strong>₹999</strong><span>Monthly Pro</span></div>
        </div>

        <div className="glass-card">
          <h2>{form.id ? 'Edit Client' : 'Add New Client'}</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="three-grid">
              <div className="field"><label>Business Name</label><input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Kalash Caterers" /></div>
              <div className="field"><label>User ID</label><input className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="kalash001" /></div>
              <div className="field"><label>Password</label><input className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="123456" /></div>
            </div>
            <div className="three-grid">
              <div className="field"><label>Owner Name</label><input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></div>
              <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field"><label>City</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="two-grid">
              <div className="field"><label>Status</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientUser['status'] })}><option>ACTIVE</option><option>EXPIRED</option></select></div>
              <div className="field"><label>Expiry Date</label><input className="input" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
            </div>
            {message ? <p className="muted"><b>{message}</b></p> : null}
            <div className="action-row">
              <button className="primary-button" type="submit">{form.id ? 'Save Client' : 'Create Client Login'}</button>
              <button className="ghost-button" type="button" onClick={resetForm}>Clear Form</button>
              <button className="danger-button" type="button" onClick={clearAllClients}>Remove All Clients</button>
            </div>
          </form>
        </div>

        <div className="glass-card">
          <h2>Client Login List</h2>
          {clients.length === 0 ? <p className="muted">No client users yet. Create one above, then give them the user ID and password.</p> : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Business</th><th>User ID</th><th>Password</th><th>Status</th><th>Expiry</th><th>Action</th></tr></thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td><b>{client.businessName}</b><br /><small>{client.ownerName} {client.phone ? `• ${client.phone}` : ''}</small></td>
                    <td>{client.userId}</td>
                    <td>{client.password}</td>
                    <td><span className={`badge ${client.status === 'ACTIVE' ? 'green' : 'red'}`}>{client.status}</span></td>
                    <td>{client.expiryDate}</td>
                    <td>
                      <div className="action-row">
                        <button className="ghost-button" onClick={() => setForm(client)}>Edit</button>
                        <button className="ghost-button" onClick={() => toggleStatus(client)}>{client.status === 'ACTIVE' ? 'Expire' : 'Activate'}</button>
                        <button className="danger-button" onClick={() => { deleteClient(client.id); setClients(getClients()); }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
