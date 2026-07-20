import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell landing-page">
      <section className="landing-card">
        <div className="landing-copy">
          <div className="app-mark">MC</div>
          <p className="eyebrow">Menu Cost for caterers</p>
          <h1>From wedding menu to profitable quotation.</h1>
          <p>Organize dishes by function, plan manpower, calculate every cost and create a professional estimate in one focused workflow.</p>
          <div className="action-row">
            <Link href="/login" className="primary-button">Open Menu Cost</Link>
            <span className="landing-note">Your work saves automatically in your browser.</span>
          </div>
        </div>
        <div className="landing-preview" aria-label="Menu Cost workflow">
          <div className="landing-preview-head"><span>Wedding estimate</span><b>Ready to price</b></div>
          {['Event details', 'Function-wise menu', 'Manpower plan', 'Final quotation'].map((label, index) => (
            <div className="landing-step" key={label}>
              <span>{index + 1}</span>
              <b>{label}</b>
              <small>{index < 3 ? 'Complete' : 'Next'}</small>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
