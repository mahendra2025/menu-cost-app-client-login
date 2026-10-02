'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';
import { getSession, uid } from '../../../lib/store';

type Vendor = {
  id: string;
  name: string;
  active: boolean;
};

type UniformItem = {
  id: string;
  name: string;
  photoUrl: string;
  staffRole: string;
  components: string;
  sizes: string;
  ownership: 'IN_HOUSE' | 'RENTAL';
  availableQty: number;
  unit: string;
  defaultRate: number;
  vendorId: string;
  vendorName: string;
  laundryStatus: string;
  notes: string;
  active: boolean;
};

const LAUNDRY = ['READY', 'ISSUED', 'IN_USE', 'RETURNED', 'LAUNDRY'];

function blankUniform(): UniformItem {
  return {
    id: uid('uniform'),
    name: '',
    photoUrl: '',
    staffRole: 'Waiter',
    components: 'Shirt + Pant',
    sizes: 'S, M, L, XL, XXL',
    ownership: 'IN_HOUSE',
    availableQty: 1,
    unit: 'set',
    defaultRate: 0,
    vendorId: '',
    vendorName: '',
    laundryStatus: 'READY',
    notes: '',
    active: true,
  };
}

async function compressPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not open image'));
    element.src = dataUrl;
  });

  const scale = Math.min(1, 520 / image.width, 360 / image.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing unavailable');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.72;
  let output = canvas.toDataURL('image/jpeg', quality);

  while (output.length > 120000 && quality > 0.35) {
    quality -= 0.08;
    output = canvas.toDataURL('image/jpeg', quality);
  }

  if (output.length > 140000) {
    throw new Error('Photo is too large. Please choose a smaller image.');
  }

  return output;
}

export default function UniformMasterPage() {
  const [uniforms, setUniforms] = useState<UniformItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.assign('/login');
      return;
    }
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [uniformResponse, vendorResponse] = await Promise.all([
        fetch('/api/client/uniforms', { cache: 'no-store' }),
        fetch('/api/client/vendors', { cache: 'no-store' }),
      ]);

      const data = await uniformResponse.json();
      if (!uniformResponse.ok) {
        throw new Error(data.error || 'Could not load uniforms');
      }

      const rows = Array.isArray(data.uniforms)
        ? data.uniforms as UniformItem[]
        : [];

      setUniforms(rows);
      setSelectedId(rows[0]?.id || '');

      if (vendorResponse.ok) {
        const vendorData = await vendorResponse.json();
        setVendors(
          Array.isArray(vendorData.vendors)
            ? (vendorData.vendors as Vendor[]).filter((vendor) => vendor.active !== false)
            : [],
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load uniforms');
    } finally {
      setLoading(false);
    }
  }

  async function save(next = uniforms) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/client/uniforms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniforms: next }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save uniforms');

      const saved = Array.isArray(data.uniforms)
        ? data.uniforms as UniformItem[]
        : next;

      setUniforms(saved);
      setMessage('Dress & uniform master saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save uniforms');
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    const item = blankUniform();
    setUniforms((current) => [item, ...current]);
    setSelectedId(item.id);
    setMessage('');
  }

  function updateItem(id: string, patch: Partial<UniformItem>) {
    setUniforms((current) =>
      current.map((item) => item.id === id ? { ...item, ...patch } : item),
    );
    setMessage('');
  }

  function removeItem(id: string) {
    const next = uniforms.filter((item) => item.id !== id);
    setUniforms(next);
    setSelectedId(next[0]?.id || '');
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;

    setError('');
    try {
      updateItem(selectedId, { photoUrl: await compressPhoto(file) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not process photo');
    } finally {
      event.target.value = '';
    }
  }

  const selected = uniforms.find((item) => item.id === selectedId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return uniforms;

    return uniforms.filter((item) =>
      [item.name, item.staffRole, item.components, item.sizes, item.vendorName]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, uniforms]);

  return (
    <AppShell
      title="Dress & Uniform"
      subtitle="Photo uniform catalog for catering staff"
      hidePageTitle
    >
      <section className="uf-page">
        <style>{`
          .uf-page{display:grid;gap:14px;color:#edf2f8}
          .uf-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .uf-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .uf-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .uf-head p{margin:0;color:#8794a5;font-size:11px}
          .uf-actions{display:flex;gap:7px}
          .uf-button{min-height:40px;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
          .uf-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .uf-button:disabled{opacity:.55;cursor:wait}
          .uf-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
          .uf-stat{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .uf-stat small,.uf-stat b,.uf-stat span{display:block}.uf-stat small{color:#7b8898;font-size:8px;font-weight:850;text-transform:uppercase}
          .uf-stat b{margin:5px 0 2px;font-size:20px}.uf-stat span{color:#748192;font-size:8px}
          .uf-msg{padding:10px 12px;border:1px solid rgba(61,220,132,.18);border-radius:10px;color:#75dfa2;background:rgba(61,220,132,.06);font-size:10px}
          .uf-msg.error{border-color:rgba(255,98,89,.2);color:#ff948e;background:rgba(255,98,89,.06)}
          .uf-layout{display:grid;grid-template-columns:minmax(0,1.45fr) 390px;gap:12px;align-items:start}
          .uf-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .uf-search{padding:11px;border-bottom:1px solid #252c35}
          .uf-input,.uf-select,.uf-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}
          .uf-textarea{min-height:78px;padding:9px;resize:vertical}
          .uf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;padding:11px}
          .uf-card{position:relative;overflow:hidden;border:1px solid #2a323d;border-radius:13px;background:#0f141b;cursor:pointer;text-align:left}
          .uf-card.active{border-color:rgba(74,156,255,.75);box-shadow:0 0 0 2px rgba(74,156,255,.1)}
          .uf-photo{aspect-ratio:4/3;width:100%;overflow:hidden;background:#151c25}.uf-photo img{width:100%;height:100%;object-fit:cover;display:block}
          .uf-fallback{display:grid;width:100%;height:100%;place-items:center;align-content:center;gap:5px;color:#71839a;background:linear-gradient(145deg,#151c25,#0d1218)}
          .uf-fallback b{font-size:23px}.uf-fallback small{font-size:8px}
          .uf-card-body{padding:10px}.uf-card-body b,.uf-card-body span,.uf-card-body small{display:block}
          .uf-card-body b{font-size:11px;color:#ecf2f8}.uf-card-body span{margin-top:3px;color:#7e8b9a;font-size:8px}.uf-card-body small{margin-top:7px;color:#75dca0;font-size:8px;font-weight:850}
          .uf-badge{position:absolute;top:8px;right:8px;padding:4px 6px;border-radius:999px;background:rgba(10,15,22,.78);color:#b8c6d5;font-size:7px;font-weight:900}
          .uf-empty{padding:45px 15px;color:#748192;font-size:10px;text-align:center}
          .uf-editor{padding:14px}.uf-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid #252c35}
          .uf-editor-head h2{margin:0;font-size:17px}.uf-editor-head p{margin:3px 0 0;color:#7c8999;font-size:9px}
          .uf-photo-large{margin-top:13px;overflow:hidden;aspect-ratio:16/10;border:1px solid #2c3541;border-radius:12px;background:#111820}
          .uf-photo-large img{width:100%;height:100%;object-fit:cover;display:block}
          .uf-photo-actions{display:flex;gap:7px;margin-top:8px}.uf-upload{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 11px;border:1px solid #303945;border-radius:8px;color:#c0cad5;background:#171e27;font-size:9px;font-weight:900;cursor:pointer}.uf-upload input{display:none}
          .uf-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.uf-field{display:grid;gap:5px}.uf-field.full{grid-column:1/-1}.uf-field>span{font-size:8px;font-weight:850;color:#8290a1;text-transform:uppercase}
          .uf-foot{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #252c35}
          @media(max-width:1050px){.uf-layout{grid-template-columns:1fr}.uf-stats{grid-template-columns:1fr 1fr}}
          @media(max-width:700px){.uf-head{align-items:stretch;flex-direction:column}.uf-actions{display:grid;grid-template-columns:1fr 1fr}.uf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uf-form{grid-template-columns:1fr}.uf-field.full{grid-column:auto}}
        `}</style>

        <header className="uf-head">
          <div>
            <small>Staff presentation control</small>
            <h1>Dress & Uniform</h1>
            <p>Save uniform photos, role mapping, stock, sizes, laundry state and rental vendor.</p>
          </div>

          <div className="uf-actions">
            <button className="uf-button" type="button" onClick={addItem}>+ Add Uniform</button>
            <button className="uf-button primary" type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save Master'}
            </button>
          </div>
        </header>

        <section className="uf-stats">
          <article className="uf-stat"><small>Total uniforms</small><b>{uniforms.length}</b><span>Saved dress styles</span></article>
          <article className="uf-stat"><small>With photos</small><b>{uniforms.filter((item) => item.photoUrl).length}</b><span>Visual-ready styles</span></article>
          <article className="uf-stat"><small>Available sets</small><b>{uniforms.reduce((sum, item) => sum + item.availableQty, 0)}</b><span>All active stock</span></article>
          <article className="uf-stat"><small>Rental styles</small><b>{uniforms.filter((item) => item.ownership === 'RENTAL').length}</b><span>Vendor supplied</span></article>
        </section>

        {message ? <div className="uf-msg">{message}</div> : null}
        {error ? <div className="uf-msg error">{error}</div> : null}

        <div className="uf-layout">
          <section className="uf-panel">
            <div className="uf-search">
              <input className="uf-input" value={query} placeholder="Search waiter, chef, blazer…" onChange={(event) => setQuery(event.target.value)} />
            </div>

            {loading ? (
              <div className="uf-empty">Loading uniforms…</div>
            ) : filtered.length ? (
              <div className="uf-grid">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    className={selectedId === item.id ? 'uf-card active' : 'uf-card'}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="uf-badge">{item.ownership === 'IN_HOUSE' ? 'OWN' : 'RENTAL'}</span>
                    <div className="uf-photo">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} />
                      ) : (
                        <div className="uf-fallback"><b>{item.name.slice(0,2).toUpperCase() || 'UF'}</b><small>Add photo</small></div>
                      )}
                    </div>
                    <div className="uf-card-body">
                      <b>{item.name || 'Unnamed uniform'}</b>
                      <span>{item.staffRole || 'No role'} · {item.components || 'No components'}</span>
                      <small>Available {item.availableQty} {item.unit}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="uf-empty">No uniform styles found.</div>
            )}
          </section>

          <aside className="uf-panel">
            {selected ? (
              <div className="uf-editor">
                <div className="uf-editor-head">
                  <div><h2>{selected.name || 'New uniform'}</h2><p>Photo, role, sizes, stock and rental details.</p></div>
                  <label style={{display:'flex',alignItems:'center',gap:6,color:'#9aa6b4',fontSize:9}}>
                    <input type="checkbox" checked={selected.active} onChange={(event) => updateItem(selected.id, { active: event.target.checked })} />
                    Active
                  </label>
                </div>

                <div className="uf-photo-large">
                  {selected.photoUrl ? (
                    <img src={selected.photoUrl} alt={selected.name || 'Uniform'} />
                  ) : (
                    <div className="uf-fallback"><b>{selected.name.slice(0,2).toUpperCase() || 'UF'}</b><small>Add photo</small></div>
                  )}
                </div>

                <div className="uf-photo-actions">
                  <label className="uf-upload">
                    Upload Photo
                    <input type="file" accept="image/*" onChange={uploadPhoto} />
                  </label>
                  {selected.photoUrl ? (
                    <button className="uf-button" type="button" onClick={() => updateItem(selected.id, { photoUrl: '' })}>Remove Photo</button>
                  ) : null}
                </div>

                <div className="uf-form">
                  <label className="uf-field full"><span>Uniform Name</span><input className="uf-input" value={selected.name} placeholder="Waiter Premium Uniform" onChange={(event) => updateItem(selected.id, { name: event.target.value })} /></label>
                  <label className="uf-field"><span>Staff Role</span><input className="uf-input" value={selected.staffRole} placeholder="Waiter" onChange={(event) => updateItem(selected.id, { staffRole: event.target.value })} /></label>
                  <label className="uf-field"><span>Components</span><input className="uf-input" value={selected.components} placeholder="White Shirt + Black Pant + Tie" onChange={(event) => updateItem(selected.id, { components: event.target.value })} /></label>
                  <label className="uf-field"><span>Sizes</span><input className="uf-input" value={selected.sizes} placeholder="S, M, L, XL, XXL" onChange={(event) => updateItem(selected.id, { sizes: event.target.value })} /></label>
                  <label className="uf-field"><span>Ownership</span><select className="uf-select" value={selected.ownership} onChange={(event) => updateItem(selected.id, { ownership: event.target.value as UniformItem['ownership'] })}><option value="IN_HOUSE">In-house</option><option value="RENTAL">Rental / Vendor</option></select></label>
                  <label className="uf-field"><span>Available Qty</span><input className="uf-input" type="number" min="0" value={selected.availableQty} onChange={(event) => updateItem(selected.id, { availableQty: Math.max(0, Math.round(Number(event.target.value) || 0)) })} /></label>
                  <label className="uf-field"><span>Rate / Set</span><input className="uf-input" type="number" min="0" value={selected.defaultRate} onChange={(event) => updateItem(selected.id, { defaultRate: Math.max(0, Number(event.target.value) || 0) })} /></label>
                  <label className="uf-field"><span>Laundry Status</span><select className="uf-select" value={selected.laundryStatus} onChange={(event) => updateItem(selected.id, { laundryStatus: event.target.value })}>{LAUNDRY.map((item) => <option key={item} value={item}>{item.replace(/_/g,' ')}</option>)}</select></label>

                  <label className="uf-field full">
                    <span>Rental Vendor</span>
                    <select
                      className="uf-select"
                      value={selected.vendorId}
                      onChange={(event) => {
                        const vendor = vendors.find((item) => item.id === event.target.value);
                        updateItem(selected.id, {
                          vendorId: vendor?.id || '',
                          vendorName: vendor?.name || '',
                        });
                      }}
                    >
                      <option value="">No linked vendor</option>
                      {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                    </select>
                  </label>

                  <label className="uf-field full"><span>Photo URL</span><input className="uf-input" value={selected.photoUrl.startsWith('data:') ? '' : selected.photoUrl} placeholder="Optional https:// image URL" onChange={(event) => updateItem(selected.id, { photoUrl: event.target.value })} /></label>
                  <label className="uf-field full"><span>Notes</span><textarea className="uf-textarea" value={selected.notes} onChange={(event) => updateItem(selected.id, { notes: event.target.value })} /></label>
                </div>

                <div className="uf-foot">
                  <button className="uf-button" type="button" onClick={() => removeItem(selected.id)}>Remove</button>
                  <button className="uf-button primary" type="button" disabled={saving} onClick={() => void save()}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="uf-empty">Add a uniform style to start your photo catalog.</div>
            )}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
