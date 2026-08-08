import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Menu Cost — Catering Menu Costing Software',
  description:
    'Calculate catering menu costs using your ingredient rates, portions, manpower and event expenses.',
};

const steps = [
  {
    no: '01',
    title: 'Add your menu',
    text: 'Paste or upload the event menu and organize every day, meal and guest count.',
  },
  {
    no: '02',
    title: 'Detect the dishes',
    text: 'Review Indian dishes from English, Roman, Hindi and Gujarati menu text.',
  },
  {
    no: '03',
    title: 'Use your rates',
    text: 'Use your own ingredient purchase rates without affecting another caterer.',
  },
  {
    no: '04',
    title: 'Know the real cost',
    text: 'Combine food, manpower and extra costs before you quote the client.',
  },
];

const features = [
  [
    'Your Ingredient Rates',
    'Keep personal ingredient rates while the Admin Ingredient Master stays as the default.',
  ],
  [
    'Wedding Menu Costing',
    'Separate days, meals, functions and guest counts for complex wedding events.',
  ],
  [
    'Portion Control',
    'Use automatic allocation or adjust individual dish portions when required.',
  ],
  [
    'Manpower Planning',
    'Add waiters, captains, cooks, helpers and other event manpower costs.',
  ],
  [
    'Extra Costs',
    'Keep transport, disposable and other event costs together with food costing.',
  ],
  [
    'Final Costing',
    'Review the complete event cost before finalizing your selling price.',
  ],
];

const faqs = [
  [
    'Can I use my own ingredient rates?',
    'Yes. Every client can keep their own ingredient-rate overrides. Your changes affect only your account.',
  ],
  [
    'Can I cost multi-day wedding menus?',
    'Yes. Menu Cost supports separate days, meals, functions and guest counts.',
  ],
  [
    'Which menu languages are supported?',
    'The menu workflow supports English, Roman, Hindi and Gujarati dish names and aliases.',
  ],
  [
    'Can I adjust dish portions?',
    'Yes. You can use automatic portion allocation or a custom percentage.',
  ],
  [
    'How much is Menu Cost Pro?',
    'The current Pro plan is ₹999 per month.',
  ],
];

function Check() {
  return (
    <span className="lp-check" aria-hidden="true">
      ✓
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="lp">
      <style>{`
        .lp {
          --ink:#0b1220;
          --muted:#657187;
          --blue:#0878f9;
          --blue2:#055fc9;
          --line:rgba(15,23,42,.09);
          min-height:100vh;
          background:
            radial-gradient(circle at 8% 0%,rgba(8,120,249,.14),transparent 28rem),
            radial-gradient(circle at 94% 4%,rgba(99,102,241,.10),transparent 25rem),
            #fbfcfe;
          color:var(--ink);
          font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
        }

        .lp * { box-sizing:border-box; }

        .lp-wrap {
          width:min(1160px,calc(100% - 40px));
          margin:auto;
        }

        .lp-nav {
          position:sticky;
          top:0;
          z-index:30;
          border-bottom:1px solid rgba(15,23,42,.05);
          background:rgba(251,252,254,.86);
          backdrop-filter:blur(20px);
        }

        .lp-nav-in {
          height:72px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
        }

        .lp-brand {
          display:flex;
          align-items:center;
          gap:10px;
          font-weight:900;
          letter-spacing:-.03em;
        }

        .lp-logo {
          display:grid;
          place-items:center;
          width:39px;
          height:39px;
          border-radius:12px;
          color:#fff;
          background:linear-gradient(145deg,#111827,#0878f9);
          box-shadow:0 10px 24px rgba(8,120,249,.25);
          font-size:13px;
        }

        .lp-links {
          display:flex;
          gap:28px;
          color:#526075;
          font-size:14px;
          font-weight:750;
        }

        .lp-actions {
          display:flex;
          gap:9px;
        }

        .lp-btn {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:47px;
          padding:0 20px;
          border-radius:999px;
          font-size:14px;
          font-weight:850;
          transition:.2s;
        }

        .lp-btn:hover { transform:translateY(-1px); }

        .lp-primary {
          color:#fff;
          background:var(--blue);
          box-shadow:0 12px 28px rgba(8,120,249,.23);
        }

        .lp-primary:hover { background:var(--blue2); }

        .lp-secondary {
          background:#fff;
          border:1px solid var(--line);
          box-shadow:0 7px 20px rgba(15,23,42,.05);
        }

        .lp-hero {
          padding:90px 0 70px;
        }

        .lp-hero-grid {
          display:grid;
          grid-template-columns:1.03fr .97fr;
          gap:64px;
          align-items:center;
        }

        .lp-pill {
          display:inline-flex;
          align-items:center;
          gap:9px;
          padding:8px 13px;
          border-radius:999px;
          background:#eef6ff;
          border:1px solid rgba(8,120,249,.14);
          color:#075aa9;
          font-size:12px;
          font-weight:850;
        }

        .lp-live {
          width:7px;
          height:7px;
          border-radius:50%;
          background:#22c55e;
          box-shadow:0 0 0 4px rgba(34,197,94,.12);
        }

        .lp-hero h1 {
          max-width:730px;
          margin:20px 0 0;
          font-size:clamp(46px,6.3vw,78px);
          line-height:.98;
          letter-spacing:-.065em;
          font-weight:920;
        }

        .lp-hero h1 span { color:var(--blue); }

        .lp-sub {
          max-width:650px;
          margin:26px 0 0;
          color:#536174;
          font-size:clamp(17px,1.7vw,20px);
          line-height:1.65;
        }

        .lp-hero-buttons {
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin-top:30px;
        }

        .lp-hero-buttons .lp-btn {
          min-height:53px;
          padding:0 24px;
          font-size:15px;
        }

        .lp-points {
          display:flex;
          flex-wrap:wrap;
          gap:12px 22px;
          margin-top:25px;
          color:#64748b;
          font-size:13px;
          font-weight:720;
        }

        .lp-points span {
          display:flex;
          align-items:center;
          gap:7px;
        }

        .lp-points i {
          width:7px;
          height:7px;
          border-radius:50%;
          background:#22c55e;
        }

        .demo-wrap { position:relative; }

        .demo-glow {
          position:absolute;
          inset:15%;
          border-radius:50%;
          background:rgba(8,120,249,.24);
          filter:blur(65px);
        }

        .demo {
          position:relative;
          overflow:hidden;
          border:1px solid rgba(15,23,42,.10);
          border-radius:28px;
          background:#fff;
          box-shadow:0 38px 90px rgba(15,23,42,.17);
        }

        .demo-bar {
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:14px 17px;
          border-bottom:1px solid var(--line);
          background:#fafbfd;
          color:#7b8799;
          font-size:10px;
          font-weight:750;
        }

        .demo-dots { display:flex;gap:5px; }

        .demo-dots i {
          width:8px;
          height:8px;
          border-radius:50%;
          background:#cbd5e1;
        }

        .demo-main {
          display:grid;
          grid-template-columns:115px 1fr;
          min-height:420px;
        }

        .demo-side {
          padding:18px 10px;
          background:#101827;
          color:#fff;
        }

        .demo-side-logo {
          display:flex;
          align-items:center;
          gap:7px;
          margin:0 4px 22px;
          font-size:10px;
          font-weight:850;
        }

        .demo-side-logo b {
          display:grid;
          place-items:center;
          width:25px;
          height:25px;
          border-radius:8px;
          background:#0878f9;
        }

        .demo-nav {
          padding:9px 8px;
          margin:4px 0;
          border-radius:9px;
          color:#8ea0b7;
          font-size:9px;
          font-weight:750;
        }

        .demo-nav.active {
          color:white;
          background:rgba(255,255,255,.1);
        }

        .demo-content {
          padding:18px;
          background:#f7f9fc;
        }

        .demo-head {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }

        .demo-head h3 {
          margin:0;
          font-size:17px;
          letter-spacing:-.03em;
        }

        .demo-head small {
          color:#8794a7;
          font-size:8px;
        }

        .demo-status {
          padding:6px 8px;
          border-radius:999px;
          background:#dcfce7;
          color:#166534;
          font-size:7px;
          font-weight:850;
        }

        .demo-stats {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:7px;
          margin:16px 0 10px;
        }

        .demo-stat {
          padding:10px;
          border-radius:11px;
          border:1px solid #e7ebf0;
          background:white;
        }

        .demo-stat small {
          display:block;
          color:#96a2b2;
          font-size:6px;
          font-weight:800;
        }

        .demo-stat b {
          display:block;
          margin-top:5px;
          font-size:14px;
        }

        .demo-table {
          padding:11px;
          border:1px solid #e7ebf0;
          border-radius:13px;
          background:white;
        }

        .demo-table-title {
          display:flex;
          justify-content:space-between;
          margin-bottom:7px;
          font-size:9px;
          font-weight:850;
        }

        .demo-table-title span {
          padding:3px 6px;
          border-radius:999px;
          color:#1d4ed8;
          background:#eff6ff;
          font-size:6px;
        }

        .demo-row {
          display:grid;
          grid-template-columns:1.3fr .6fr .45fr .55fr;
          gap:5px;
          padding:8px 3px;
          border-top:1px solid #f0f2f5;
          font-size:7px;
        }

        .demo-row b { font-size:8px; }

        .demo-custom {
          color:#16803c;
          font-weight:800;
        }

        .demo-bottom {
          display:grid;
          grid-template-columns:1.25fr .75fr;
          gap:7px;
          margin-top:8px;
        }

        .demo-total {
          padding:12px;
          border-radius:12px;
          color:#fff;
          background:linear-gradient(135deg,#101827,#1e466d);
        }

        .demo-total small {
          display:block;
          opacity:.65;
          font-size:6px;
        }

        .demo-total strong {
          display:block;
          margin-top:4px;
          font-size:19px;
        }

        .demo-total span {
          display:block;
          margin-top:3px;
          color:#9dccff;
          font-size:6px;
        }

        .demo-ready {
          display:grid;
          place-items:center;
          padding:10px;
          border-radius:12px;
          text-align:center;
          background:#eef6ff;
          border:1px solid #d9eaff;
        }

        .demo-ready b {
          color:#1d4ed8;
          font-size:9px;
        }

        .demo-ready small {
          margin-top:3px;
          color:#728094;
          font-size:6px;
        }

        .lp-audience { padding:5px 0 75px; }

        .audience-box {
          display:grid;
          grid-template-columns:auto 1fr;
          align-items:center;
          gap:28px;
          padding:20px 24px;
          border:1px solid var(--line);
          border-radius:20px;
          background:rgba(255,255,255,.78);
        }

        .audience-box > b { font-size:13px; }

        .audience-items {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:9px;
        }

        .audience-items span {
          display:grid;
          place-items:center;
          min-height:44px;
          padding:8px;
          border-radius:12px;
          background:#f7f9fc;
          color:#536174;
          font-size:12px;
          font-weight:800;
          text-align:center;
        }

        .lp-section { padding:92px 0; }

        .lp-soft {
          background:linear-gradient(180deg,#f4f9ff,#fbfcfe);
          border-top:1px solid rgba(15,23,42,.05);
          border-bottom:1px solid rgba(15,23,42,.05);
        }

        .lp-heading {
          max-width:740px;
          margin-bottom:43px;
        }

        .lp-heading.center {
          margin-left:auto;
          margin-right:auto;
          text-align:center;
        }

        .lp-eyebrow {
          margin:0 0 10px;
          color:#075aa9;
          font-size:12px;
          font-weight:850;
          text-transform:uppercase;
          letter-spacing:.11em;
        }

        .lp-heading h2,
        .pricing-copy h2 {
          margin:0;
          font-size:clamp(34px,4.5vw,54px);
          line-height:1.03;
          letter-spacing:-.055em;
        }

        .lp-heading > p:last-child,
        .pricing-copy > p:last-child {
          margin:17px 0 0;
          color:var(--muted);
          font-size:17px;
          line-height:1.65;
        }

        .step-grid {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:14px;
        }

        .step {
          min-height:245px;
          padding:24px;
          border:1px solid var(--line);
          border-radius:22px;
          background:white;
          box-shadow:0 12px 34px rgba(15,23,42,.05);
        }

        .step-no {
          display:grid;
          place-items:center;
          width:42px;
          height:42px;
          margin-bottom:38px;
          border-radius:13px;
          color:#075aa9;
          background:#edf6ff;
          font-size:11px;
          font-weight:900;
        }

        .step h3,.feature h3 {
          margin:0;
          font-size:18px;
          letter-spacing:-.025em;
        }

        .step p,.feature p {
          margin:10px 0 0;
          color:var(--muted);
          font-size:14px;
          line-height:1.6;
        }

        .feature-grid {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:14px;
        }

        .feature {
          padding:25px;
          border:1px solid var(--line);
          border-radius:22px;
          background:rgba(255,255,255,.87);
        }

        .feature-icon {
          display:grid;
          place-items:center;
          width:40px;
          height:40px;
          margin-bottom:26px;
          border-radius:12px;
          color:#075aa9;
          background:#edf6ff;
          font-size:17px;
          font-weight:900;
        }

        .pricing-grid {
          display:grid;
          grid-template-columns:.9fr 1.1fr;
          gap:32px;
          align-items:center;
        }

        .price-card {
          padding:34px;
          border-radius:28px;
          border:1px solid rgba(8,120,249,.18);
          background:linear-gradient(160deg,#fff,#f5faff);
          box-shadow:0 30px 80px rgba(15,23,42,.10);
        }

        .price-label {
          color:#075aa9;
          font-size:12px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.1em;
        }

        .price {
          display:flex;
          align-items:flex-end;
          gap:8px;
          margin:14px 0 22px;
        }

        .price strong {
          font-size:54px;
          line-height:1;
          letter-spacing:-.06em;
        }

        .price span {
          padding-bottom:7px;
          color:var(--muted);
          font-size:14px;
          font-weight:700;
        }

        .price-list {
          display:grid;
          gap:13px;
          margin:24px 0 28px;
        }

        .price-list > span {
          display:flex;
          align-items:center;
          gap:10px;
          color:#4b596d;
          font-size:14px;
          font-weight:700;
        }

        .lp-check {
          display:grid;
          place-items:center;
          width:22px;
          height:22px;
          flex:0 0 22px;
          border-radius:50%;
          background:#dcfce7;
          color:#16803c;
          font-size:12px;
          font-weight:900;
        }

        .price-note {
          margin:13px 0 0;
          color:#748196;
          font-size:12px;
          line-height:1.5;
        }

        .faq {
          max-width:830px;
          margin:auto;
        }

        .faq details {
          border-bottom:1px solid var(--line);
        }

        .faq summary {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          padding:23px 2px;
          cursor:pointer;
          list-style:none;
          font-size:16px;
          font-weight:820;
        }

        .faq summary::-webkit-details-marker { display:none; }

        .faq summary:after {
          content:'+';
          display:grid;
          place-items:center;
          width:29px;
          height:29px;
          flex:0 0 29px;
          border-radius:50%;
          background:#f0f3f7;
          color:#536174;
          font-size:19px;
          font-weight:500;
        }

        .faq details[open] summary:after { content:'−'; }

        .faq p {
          margin:-5px 0 23px;
          padding-right:55px;
          color:var(--muted);
          font-size:15px;
          line-height:1.7;
        }

        .cta-section { padding:30px 0 90px; }

        .cta {
          position:relative;
          overflow:hidden;
          padding:60px;
          border-radius:32px;
          background:linear-gradient(135deg,#0b1220,#14324f 58%,#075cb9);
          color:#fff;
          box-shadow:0 32px 80px rgba(15,23,42,.20);
        }

        .cta:after {
          content:'';
          position:absolute;
          width:430px;
          height:430px;
          right:-160px;
          top:-220px;
          border-radius:50%;
          background:rgba(59,130,246,.28);
        }

        .cta-in {
          position:relative;
          z-index:2;
          max-width:760px;
        }

        .cta h2 {
          margin:0;
          font-size:clamp(36px,5vw,58px);
          line-height:1.02;
          letter-spacing:-.055em;
        }

        .cta p {
          max-width:640px;
          margin:17px 0 26px;
          color:#cbd5e1;
          font-size:17px;
          line-height:1.65;
        }

        .cta .lp-primary {
          background:white;
          color:#101827;
          box-shadow:none;
        }

        .cta .lp-secondary {
          color:white;
          background:rgba(255,255,255,.08);
          border-color:rgba(255,255,255,.18);
        }

        .footer {
          padding:28px 0 42px;
          border-top:1px solid rgba(15,23,42,.06);
        }

        .footer-in {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          color:#748196;
          font-size:12px;
        }

        .footer-links {
          display:flex;
          gap:18px;
          font-weight:750;
        }

        @media(max-width:980px) {
          .lp-links { display:none; }
          .lp-hero-grid,.pricing-grid { grid-template-columns:1fr; }
          .demo-wrap { max-width:720px;margin:15px auto 0; }
          .step-grid { grid-template-columns:repeat(2,1fr); }
          .feature-grid { grid-template-columns:repeat(2,1fr); }
          .audience-box { grid-template-columns:1fr;text-align:center; }
        }

        @media(max-width:680px) {
          .lp-wrap { width:calc(100% - 28px); }
          .lp-nav-in { height:64px; }
          .lp-brand > span:last-child { display:none; }
          .lp-actions .lp-secondary { display:none; }

          .lp-hero {
            padding:55px 0 45px;
          }

          .lp-hero h1 {
            font-size:clamp(42px,14vw,62px);
          }

          .lp-sub { font-size:17px; }

          .lp-hero-buttons {
            display:grid;
          }

          .lp-hero-buttons .lp-btn {
            width:100%;
          }

          .demo-main { grid-template-columns:76px 1fr; }

          .demo-side { padding:14px 6px; }

          .demo-side-logo span { display:none; }

          .demo-nav {
            font-size:0;
            height:32px;
          }

          .demo-content { padding:10px; }

          .demo-stats { gap:4px; }

          .demo-stat { padding:7px; }

          .demo-stat b { font-size:11px; }

          .demo-row {
            grid-template-columns:1.3fr .7fr .5fr;
          }

          .demo-row > :last-child { display:none; }

          .demo-bottom { grid-template-columns:1fr; }

          .demo-ready { display:none; }

          .audience-items {
            grid-template-columns:repeat(2,1fr);
          }

          .lp-section { padding:70px 0; }

          .step-grid,.feature-grid {
            grid-template-columns:1fr;
          }

          .step { min-height:0; }

          .step-no { margin-bottom:28px; }

          .price-card { padding:26px 22px; }

          .cta {
            padding:40px 25px;
            border-radius:26px;
          }

          .footer-in {
            align-items:flex-start;
            flex-direction:column;
          }
        }
      `}</style>

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-brand">
            <span className="lp-logo">MC</span>
            <span>Menu Cost</span>
          </Link>

          <nav className="lp-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="lp-actions">
            <a href="#how" className="lp-btn lp-secondary">
              See product
            </a>

            <Link href="/login" className="lp-btn lp-primary">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <div className="lp-pill">
              <span className="lp-live" />
              Built for Indian caterers
            </div>

            <h1>
              Know your menu cost{' '}
              <span>before you quote.</span>
            </h1>

            <p className="lp-sub">
              Turn a wedding or event menu into a clear
              costing workflow with dish detection, your
              ingredient rates, portions, manpower,
              extras and final event cost.
            </p>

            <div className="lp-hero-buttons">
              <a href="#how" className="lp-btn lp-primary">
                See how it works
              </a>

              <Link href="/login" className="lp-btn lp-secondary">
                Open Menu Cost
              </Link>
            </div>

            <div className="lp-points">
              <span>
                <i />
                Indian menu workflow
              </span>

              <span>
                <i />
                Personal ingredient rates
              </span>

              <span>
                <i />
                Multi-function costing
              </span>
            </div>
          </div>

          <div className="demo-wrap">
            <div className="demo-glow" />

            <div className="demo">
              <div className="demo-bar">
                <div className="demo-dots">
                  <i />
                  <i />
                  <i />
                </div>

                <span>
                  Product preview · Sample data
                </span>
              </div>

              <div className="demo-main">
                <aside className="demo-side">
                  <div className="demo-side-logo">
                    <b>MC</b>
                    <span>Menu Cost</span>
                  </div>

                  {[
                    'Event',
                    'Manpower',
                    'Extras',
                    'Cost',
                    'Final',
                  ].map((item) => (
                    <div
                      key={item}
                      className={`demo-nav ${
                        item === 'Cost' ? 'active' : ''
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </aside>

                <div className="demo-content">
                  <div className="demo-head">
                    <div>
                      <h3>Menu Costing</h3>
                      <small>
                        Wedding · Day 2 · Dinner · 250 guests
                      </small>
                    </div>

                    <span className="demo-status">
                      Rates ready
                    </span>
                  </div>

                  <div className="demo-stats">
                    <div className="demo-stat">
                      <small>DISHES</small>
                      <b>18</b>
                    </div>

                    <div className="demo-stat">
                      <small>FOOD / PLATE</small>
                      <b>₹286</b>
                    </div>

                    <div className="demo-stat">
                      <small>MEAL COST</small>
                      <b>₹71.5K</b>
                    </div>
                  </div>

                  <div className="demo-table">
                    <div className="demo-table-title">
                      <b>Ingredient rates</b>
                      <span>My rates</span>
                    </div>

                    {[
                      ['Paneer', '₹320', 'kg', 'Custom'],
                      ['Tomato', '₹40', 'kg', 'Custom'],
                      ['Basmati Rice', '₹110', 'kg', 'Default'],
                      ['Fresh Cream', '₹220', 'kg', 'Default'],
                    ].map(([name, rate, unit, state]) => (
                      <div className="demo-row" key={name}>
                        <b>{name}</b>
                        <span>{rate}</span>
                        <span>{unit}</span>
                        <span
                          className={
                            state === 'Custom'
                              ? 'demo-custom'
                              : ''
                          }
                        >
                          {state}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="demo-bottom">
                    <div className="demo-total">
                      <small>AVERAGE FINAL / COVER</small>
                      <strong>₹348</strong>
                      <span>
                        Food + manpower + extras
                      </span>
                    </div>

                    <div className="demo-ready">
                      <b>Ready to review</b>
                      <small>
                        Final costing prepared
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-audience">
        <div className="lp-wrap audience-box">
          <b>One focused workflow for</b>

          <div className="audience-items">
            <span>Wedding Caterers</span>
            <span>Event Caterers</span>
            <span>Industrial Caterers</span>
            <span>Food Contractors</span>
          </div>
        </div>
      </section>

      <section
        id="how"
        className="lp-section lp-soft"
      >
        <div className="lp-wrap">
          <div className="lp-heading center">
            <p className="lp-eyebrow">
              How it works
            </p>

            <h2>
              From raw menu to cost clarity.
            </h2>

            <p>
              Keep the workflow simple enough for real
              catering operations while giving you control
              over the numbers that matter.
            </p>
          </div>

          <div className="step-grid">
            {steps.map((step) => (
              <article className="step" key={step.no}>
                <div className="step-no">
                  {step.no}
                </div>

                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="lp-section"
      >
        <div className="lp-wrap">
          <div className="lp-heading">
            <p className="lp-eyebrow">
              Built around catering work
            </p>

            <h2>
              Less spreadsheet work.
              More control before you quote.
            </h2>

            <p>
              Keep the important parts of event costing
              connected instead of spreading them across
              notes, calculators and sheets.
            </p>
          </div>

          <div className="feature-grid">
            {features.map(([title, text]) => (
              <article className="feature" key={title}>
                <div className="feature-icon">✓</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="lp-section lp-soft"
      >
        <div className="lp-wrap pricing-grid">
          <div className="pricing-copy">
            <p className="lp-eyebrow">
              Simple pricing
            </p>

            <h2>
              One tool for your everyday menu costing.
            </h2>

            <p>
              Use your ingredient rates, review dishes and
              portions, add operating costs and keep your
              event costing organized in one account.
            </p>
          </div>

          <div className="price-card">
            <div className="price-label">
              Monthly Pro
            </div>

            <div className="price">
              <strong>₹999</strong>
              <span>/ month</span>
            </div>

            <div className="price-list">
              {[
                'Menu detection workflow',
                'Personal ingredient-rate overrides',
                'Function-wise menu costing',
                'Manpower and extra costs',
                'Final event costing',
                'Profile and account controls',
              ].map((item) => (
                <span key={item}>
                  <Check />
                  {item}
                </span>
              ))}
            </div>

            <Link
              href="/login"
              className="lp-btn lp-primary"
              style={{ width: '100%' }}
            >
              Open Menu Cost
            </Link>

            <p className="price-note">
              Account access is currently activated and
              managed through Menu Cost administration.
            </p>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="lp-section"
      >
        <div className="lp-wrap">
          <div className="lp-heading center">
            <p className="lp-eyebrow">
              Questions
            </p>

            <h2>
              What caterers usually want to know.
            </h2>
          </div>

          <div className="faq">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                </summary>

                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="lp-wrap">
          <div className="cta">
            <div className="cta-in">
              <h2>
                Price the menu with numbers you trust.
              </h2>

              <p>
                Move from event menu to final costing in one
                focused catering workflow instead of rebuilding
                the calculation every time.
              </p>

              <div className="lp-hero-buttons">
                <Link
                  href="/login"
                  className="lp-btn lp-primary"
                >
                  Open Menu Cost
                </Link>

                <a
                  href="#how"
                  className="lp-btn lp-secondary"
                >
                  Review the workflow
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="lp-wrap footer-in">
          <div className="lp-brand">
            <span className="lp-logo">MC</span>
            <span>Menu Cost</span>
          </div>

          <div className="footer-links">
            <a href="#features">
              Features
            </a>

            <a href="#pricing">
              Pricing
            </a>

            <Link href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
