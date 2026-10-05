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

type CrockeryItem = {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  ownership: 'IN_HOUSE' | 'RENTAL';
  availableQty: number;
  unit: string;
  defaultRate: number;
  vendorId: string;
  vendorName: string;
  sizeType: string;
  unitsPerGuest: number;
  bufferPercent: number;
  notes: string;
  active: boolean;
};

const DEFAULT_CATEGORIES = [
  'Dinner Plate',
  'Quarter Plate',
  'Bowl',
  'Dessert Bowl',
  'Glass',
  'Spoon',
  'Fork',
  'Cup & Saucer',
  'Serving Spoon',
  'Buffet Utensil',
  'Other',
];

function blankItem(category = 'Dinner Plate'): CrockeryItem {
  return {
    id: uid('crockery'),
    name: '',
    category,
    photoUrl: '',
    ownership: 'IN_HOUSE',
    availableQty: 1,
    unit: 'pcs',
    defaultRate: 0,
    vendorId: '',
    vendorName: '',
    sizeType: '',
    unitsPerGuest: 1,
    bufferPercent: 10,
    notes: '',
    active: true,
  };
}

async function compressImage(file: File): Promise<string> {
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

export default function CrockeryMasterPage() {
  const [items, setItems] = useState<CrockeryItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([
    ...DEFAULT_CATEGORIES,
  ]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
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
      const [crockeryResponse, vendorResponse] = await Promise.all([
        fetch('/api/client/crockery', { cache: 'no-store' }),
        fetch('/api/client/vendors', { cache: 'no-store' }),
      ]);

      const data = await crockeryResponse.json();
      if (!crockeryResponse.ok) {
        throw new Error(data.error || 'Could not load crockery');
      }

      const rows = Array.isArray(data.crockery)
        ? data.crockery as CrockeryItem[]
        : [];

      const savedCategories = Array.isArray(data.categories)
        ? data.categories
            .map((value: unknown) => String(value || '').trim())
            .filter(Boolean)
        : [];

      const mergedCategories = Array.from(
        new Map(
          [
            ...DEFAULT_CATEGORIES,
            ...savedCategories,
            ...rows.map((item) => item.category),
          ]
            .filter(Boolean)
            .map((value) => [
              value.toLocaleLowerCase('en-IN'),
              value,
            ]),
        ).values(),
      );

      setItems(rows);
      setCategoryOptions(mergedCategories);
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
      setError(caught instanceof Error ? caught.message : 'Could not load crockery');
    } finally {
      setLoading(false);
    }
  }

  async function save(
    next = items,
    nextCategories = categoryOptions,
  ) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/client/crockery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crockery: next,
          categories: nextCategories,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save crockery');

      const saved = Array.isArray(data.crockery)
        ? data.crockery as CrockeryItem[]
        : next;

      setItems(saved);

      const savedCategories = Array.isArray(data.categories)
        ? data.categories
            .map((value: unknown) => String(value || '').trim())
            .filter(Boolean)
        : nextCategories;

      setCategoryOptions(
        Array.from(
          new Map(
            [
              ...DEFAULT_CATEGORIES,
              ...savedCategories,
              ...saved.map((item) => item.category),
            ]
              .filter(Boolean)
              .map((value) => [
                value.toLocaleLowerCase('en-IN'),
                value,
              ]),
          ).values(),
        ),
      );

      setMessage('Crockery & cutlery master saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save crockery');
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    const item = blankItem(
      categoryOptions[0] ||
        'Dinner Plate',
    );
    setItems((current) => [item, ...current]);
    setSelectedId(item.id);
    setMessage('');
  }

  function updateItem(id: string, patch: Partial<CrockeryItem>) {
    setItems((current) =>
      current.map((item) => item.id === id ? { ...item, ...patch } : item),
    );
    setMessage('');
  }

  async function createCategory(itemId?: string) {
    const entered = window.prompt(
      'New crockery / cutlery category name',
      '',
    );

    const clean = String(entered || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80);

    if (!clean) return;

    const existing = categoryOptions.find(
      (item) =>
        item.toLocaleLowerCase('en-IN') ===
        clean.toLocaleLowerCase('en-IN'),
    );

    const categoryName = existing || clean;
    const nextCategories = existing
      ? categoryOptions
      : [...categoryOptions, categoryName];

    const nextItems = itemId
      ? items.map((item) =>
          item.id === itemId
            ? { ...item, category: categoryName }
            : item,
        )
      : items;

    setCategoryOptions(nextCategories);
    setItems(nextItems);

    await save(nextItems, nextCategories);

    setMessage(
      existing
        ? `${categoryName} selected.`
        : `${categoryName} category created and saved.`,
    );
  }

  function removeItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    setSelectedId(next[0]?.id || '');
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;

    setError('');
    try {
      updateItem(selectedId, { photoUrl: await compressImage(file) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not process photo');
    } finally {
      event.target.value = '';
    }
  }

  const selected = items.find((item) => item.id === selectedId) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = category === 'ALL' || item.category === category;
      const matchesQuery =
        !q ||
        [item.name, item.category, item.sizeType, item.vendorName]
          .join(' ')
          .toLowerCase()
          .includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [category, items, query]);

  return (
    <AppShell
      title="Crockery & Cutlery"
      subtitle="Photo catalog, stock and automatic guest quantities"
      hidePageTitle
    >
      <section className="ck-page">
        <style>{`
          .ck-page{display:grid;gap:14px;color:#edf2f8}
          .ck-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .ck-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .ck-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .ck-head p{margin:0;color:#8794a5;font-size:11px}
          .ck-actions{display:flex;gap:7px}
          .ck-button{min-height:40px;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
          .ck-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .ck-button:disabled{opacity:.55;cursor:wait}
          .ck-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
          .ck-stat{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .ck-stat small,.ck-stat b,.ck-stat span{display:block}
          .ck-stat small{color:#7b8898;font-size:8px;font-weight:850;text-transform:uppercase}
          .ck-stat b{margin:5px 0 2px;font-size:20px}
          .ck-stat span{color:#748192;font-size:8px}
          .ck-msg{padding:10px 12px;border:1px solid rgba(61,220,132,.18);border-radius:10px;color:#75dfa2;background:rgba(61,220,132,.06);font-size:10px}
          .ck-msg.error{border-color:rgba(255,98,89,.2);color:#ff948e;background:rgba(255,98,89,.06)}
          .ck-layout{display:grid;grid-template-columns:minmax(0,1.45fr) 390px;gap:12px;align-items:start}
          .ck-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .ck-toolbar{display:grid;grid-template-columns:1fr 170px;gap:8px;padding:11px;border-bottom:1px solid #252c35}
          .ck-input,.ck-select,.ck-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}
          .ck-textarea{min-height:78px;padding:9px;resize:vertical}
          .ck-input:focus,.ck-select:focus,.ck-textarea:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .ck-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;padding:11px}
          .ck-card{position:relative;overflow:hidden;border:1px solid #2a323d;border-radius:13px;background:#0f141b;cursor:pointer;text-align:left}
          .ck-card.active{border-color:rgba(74,156,255,.75);box-shadow:0 0 0 2px rgba(74,156,255,.1)}
          .ck-photo{aspect-ratio:4/3;width:100%;overflow:hidden;background:#151c25}
          .ck-photo img{width:100%;height:100%;object-fit:cover;display:block}
          .ck-fallback{display:grid;width:100%;height:100%;place-items:center;align-content:center;gap:5px;color:#71839a;background:linear-gradient(145deg,#151c25,#0d1218)}
          .ck-fallback b{font-size:23px}.ck-fallback small{font-size:8px}
          .ck-card-body{padding:10px}.ck-card-body b,.ck-card-body span,.ck-card-body small{display:block}
          .ck-card-body b{font-size:11px;color:#ecf2f8}.ck-card-body span{margin-top:3px;color:#7e8b9a;font-size:8px}.ck-card-body small{margin-top:7px;color:#75dca0;font-size:8px;font-weight:850}
          .ck-badge{position:absolute;top:8px;right:8px;padding:4px 6px;border-radius:999px;background:rgba(10,15,22,.78);color:#b8c6d5;font-size:7px;font-weight:900}
          .ck-empty{padding:45px 15px;color:#748192;font-size:10px;text-align:center}
          .ck-editor{padding:14px}
          .ck-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid #252c35}
          .ck-editor-head h2{margin:0;font-size:17px}.ck-editor-head p{margin:3px 0 0;color:#7c8999;font-size:9px}
          .ck-photo-large{margin-top:13px;overflow:hidden;aspect-ratio:16/10;border:1px solid #2c3541;border-radius:12px;background:#111820}
          .ck-photo-large img{width:100%;height:100%;object-fit:cover;display:block}
          .ck-photo-actions{display:flex;gap:7px;margin-top:8px}
          .ck-upload{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 11px;border:1px solid #303945;border-radius:8px;color:#c0cad5;background:#171e27;font-size:9px;font-weight:900;cursor:pointer}.ck-upload input{display:none}
          .ck-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}
          .ck-field{display:grid;gap:5px}.ck-field.full{grid-column:1/-1}.ck-field>span{font-size:8px;font-weight:850;color:#8290a1;text-transform:uppercase}
          .ck-foot{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #252c35}
          @media(max-width:1050px){.ck-layout{grid-template-columns:1fr}.ck-stats{grid-template-columns:1fr 1fr}}
          @media(max-width:700px){.ck-head{align-items:stretch;flex-direction:column}.ck-actions{display:grid;grid-template-columns:1fr 1fr}.ck-toolbar{grid-template-columns:1fr}.ck-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ck-form{grid-template-columns:1fr}.ck-field.full{grid-column:auto}}
        `}</style>

        <header className="ck-head">
          <div>
            <small>Visual serviceware library</small>
            <h1>Crockery & Cutlery</h1>
            <p>Choose pieces by photo and calculate quantities automatically from function guests.</p>
          </div>

          <div className="ck-actions">
            <button className="ck-button" type="button" onClick={addItem}>
              + Add Item
            </button>
            <button className="ck-button primary" type="button" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save Master'}
            </button>
          </div>
        </header>

        <section className="ck-stats">
          <article className="ck-stat"><small>Total items</small><b>{items.length}</b><span>Saved serviceware</span></article>
          <article className="ck-stat"><small>With photos</small><b>{items.filter((item) => item.photoUrl).length}</b><span>Visual-ready items</span></article>
          <article className="ck-stat"><small>Owned pieces</small><b>{items.filter((item) => item.ownership === 'IN_HOUSE').reduce((sum, item) => sum + item.availableQty, 0).toLocaleString('en-IN')}</b><span>In-house stock</span></article>
          <article className="ck-stat"><small>Rental items</small><b>{items.filter((item) => item.ownership === 'RENTAL').length}</b><span>Vendor-linked options</span></article>
        </section>

        {message ? <div className="ck-msg">{message}</div> : null}
        {error ? <div className="ck-msg error">{error}</div> : null}

        <div className="ck-layout">
          <section className="ck-panel">
            <div className="ck-toolbar">
              <input className="ck-input" value={query} placeholder="Search plate, bowl, glass…" onChange={(event) => setQuery(event.target.value)} />
              <select className="ck-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="ALL">All categories</option>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="ck-empty">Loading crockery…</div>
            ) : filtered.length ? (
              <div className="ck-grid">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    className={selectedId === item.id ? 'ck-card active' : 'ck-card'}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="ck-badge">{item.ownership === 'IN_HOUSE' ? 'OWN' : 'RENTAL'}</span>
                    <div className="ck-photo">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} />
                      ) : (
                        <div className="ck-fallback">
                          <b>{item.name.slice(0, 2).toUpperCase() || 'CK'}</b>
                          <small>Add photo</small>
                        </div>
                      )}
                    </div>
                    <div className="ck-card-body">
                      <b>{item.name || 'Unnamed item'}</b>
                      <span>{item.category}{item.sizeType ? ` · ${item.sizeType}` : ''}</span>
                      <small>Available {item.availableQty} {item.unit}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="ck-empty">No crockery items found.</div>
            )}
          </section>

          <aside className="ck-panel">
            {selected ? (
              <div className="ck-editor">
                <div className="ck-editor-head">
                  <div>
                    <h2>{selected.name || 'New crockery item'}</h2>
                    <p>Photo, stock, vendor and automatic quantity rule.</p>
                  </div>
                  <label style={{display:'flex',alignItems:'center',gap:6,color:'#9aa6b4',fontSize:9}}>
                    <input type="checkbox" checked={selected.active} onChange={(event) => updateItem(selected.id, { active: event.target.checked })} />
                    Active
                  </label>
                </div>

                <div className="ck-photo-large">
                  {selected.photoUrl ? (
                    <img src={selected.photoUrl} alt={selected.name || 'Crockery'} />
                  ) : (
                    <div className="ck-fallback">
                      <b>{selected.name.slice(0, 2).toUpperCase() || 'CK'}</b>
                      <small>Add photo</small>
                    </div>
                  )}
                </div>

                <div className="ck-photo-actions">
                  <label className="ck-upload">
                    Upload Photo
                    <input type="file" accept="image/*" onChange={uploadPhoto} />
                  </label>
                  {selected.photoUrl ? (
                    <button className="ck-button" type="button" onClick={() => updateItem(selected.id, { photoUrl: '' })}>
                      Remove Photo
                    </button>
                  ) : null}
                </div>

                <div className="ck-form">
                  <label className="ck-field full"><span>Item Name</span><input className="ck-input" value={selected.name} onChange={(event) => updateItem(selected.id, { name: event.target.value })} /></label>
                  <label className="ck-field"><span>Category</span><select className="ck-select" value={selected.category} onChange={(event) => updateItem(selected.id, { category: event.target.value })}>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="ck-field"><span>Size / Type</span><input className="ck-input" value={selected.sizeType} placeholder="12 inch / premium white" onChange={(event) => updateItem(selected.id, { sizeType: event.target.value })} /></label>
                  <label className="ck-field"><span>Ownership</span><select className="ck-select" value={selected.ownership} onChange={(event) => updateItem(selected.id, { ownership: event.target.value as CrockeryItem['ownership'] })}><option value="IN_HOUSE">In-house</option><option value="RENTAL">Rental / Vendor</option></select></label>
                  <label className="ck-field"><span>Available Qty</span><input className="ck-input" type="number" min="0" value={selected.availableQty} onChange={(event) => updateItem(selected.id, { availableQty: Math.max(0, Math.round(Number(event.target.value) || 0)) })} /></label>
                  <label className="ck-field"><span>Unit</span><input className="ck-input" value={selected.unit} onChange={(event) => updateItem(selected.id, { unit: event.target.value })} /></label>
                  <label className="ck-field"><span>Default Rate</span><input className="ck-input" type="number" min="0" value={selected.defaultRate} onChange={(event) => updateItem(selected.id, { defaultRate: Math.max(0, Number(event.target.value) || 0) })} /></label>
                  <label className="ck-field"><span>Units / Guest</span><input className="ck-input" type="number" min="0" step="0.1" value={selected.unitsPerGuest} onChange={(event) => updateItem(selected.id, { unitsPerGuest: Math.max(0, Number(event.target.value) || 0) })} /></label>
                  <label className="ck-field"><span>Buffer %</span><input className="ck-input" type="number" min="0" max="100" value={selected.bufferPercent} onChange={(event) => updateItem(selected.id, { bufferPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label>

                  <label className="ck-field full">
                    <span>Rental Vendor</span>
                    <select
                      className="ck-select"
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

                  <label className="ck-field full"><span>Photo URL</span><input className="ck-input" value={selected.photoUrl.startsWith('data:') ? '' : selected.photoUrl} placeholder="Optional https:// image URL" onChange={(event) => updateItem(selected.id, { photoUrl: event.target.value })} /></label>
                  <label className="ck-field full"><span>Notes</span><textarea className="ck-textarea" value={selected.notes} onChange={(event) => updateItem(selected.id, { notes: event.target.value })} /></label>
                </div>

                <div className="ck-foot">
                  <button className="ck-button" type="button" onClick={() => removeItem(selected.id)}>Remove</button>
                  <button className="ck-button primary" type="button" disabled={saving} onClick={() => void save()}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="ck-empty">Add an item to start your crockery library.</div>
            )}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
