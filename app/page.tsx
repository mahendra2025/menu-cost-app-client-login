import type {
  Metadata,
} from 'next';

import Link from 'next/link';

import MarketingEstimator
  from './components/MarketingEstimator';

export const metadata: Metadata = {
  metadataBase:
    new URL(
      'https://menu-costing.com',
    ),

  title: {
    default:
      'Menu Cost — Catering Menu Costing Software for India',
    template:
      '%s | Menu Cost',
  },

  description:
    'Calculate catering food cost before you quote. Upload a menu, detect Indian dishes, use your own ingredient rates, add manpower and event expenses, and review the final cost.',

  keywords: [
    'catering costing software',
    'menu costing software',
    'catering food cost calculator',
    'Indian catering software',
    'wedding catering costing',
    'caterer costing app',
    'catering quotation software',
  ],

  alternates: {
    canonical:
      '/',
  },

  openGraph: {
    title:
      'Menu Cost — Know Your Catering Cost Before You Quote',
    description:
      'Upload a catering menu, detect dishes, use your own ingredient rates and calculate the event cost before you send the quote.',
    url:
      'https://menu-costing.com',
    siteName:
      'Menu Cost',
    type:
      'website',
  },

  twitter: {
    card:
      'summary_large_image',
    title:
      'Menu Cost — Catering Menu Costing Software',
    description:
      'Know your catering cost before you quote.',
  },
};

const outcomes = [
  {
    icon: '01',
    title:
      'Know the food cost first',
    text:
      'Review dish rates and event food cost before deciding the selling price.',
  },
  {
    icon: '02',
    title:
      'Use your own purchase rates',
    text:
      'Your ingredient-rate overrides stay specific to your account.',
  },
  {
    icon: '03',
    title:
      'Handle real Indian menus',
    text:
      'Work with wedding and event menus across days, functions and guest counts.',
  },
  {
    icon: '04',
    title:
      'See the full event cost',
    text:
      'Combine food, manpower and extra event expenses in one costing workflow.',
  },
];

const workflow = [
  {
    no: '01',
    title:
      'Upload or paste the menu',
    text:
      'Start from a PDF, menu photo or pasted text instead of rebuilding the menu line by line.',
  },
  {
    no: '02',
    title:
      'Review detected dishes',
    text:
      'Menu Cost matches catalog dishes and surfaces new dishes that need a manual rate.',
  },
  {
    no: '03',
    title:
      'Apply your business rates',
    text:
      'Your own ingredient prices can drive the dish costs used in your account.',
  },
  {
    no: '04',
    title:
      'Finish the event costing',
    text:
      'Add manpower and extra costs, then review the final amount before you quote.',
  },
];

const useCases = [
  'Wedding caterers',
  'Industrial caterers',
  'Event caterers',
  'Banquet & resort catering',
];

const comparison = [
  [
    'Menu input',
    'Retype dishes manually',
    'PDF, photo or pasted menu',
  ],
  [
    'Dish costing',
    'Separate sheets and formulas',
    'Central dish + rate workflow',
  ],
  [
    'Ingredient rates',
    'Hard to keep consistent',
    'Your account-specific rates',
  ],
  [
    'Multi-function events',
    'Many tabs / duplicate rows',
    'Days, meals and guest counts',
  ],
  [
    'Manpower & extras',
    'Usually tracked elsewhere',
    'Part of the same workflow',
  ],
  [
    'Final review',
    'Manual total checking',
    'Structured final costing',
  ],
];

const faqs = [
  [
    'Do I need a card to create an account?',
    'No. You can create your Menu Cost account without entering payment details.',
  ],
  [
    'Can I use my own ingredient rates?',
    'Yes. Ingredient-rate overrides are account-specific, so your rates do not change another caterer’s rates.',
  ],
  [
    'Can I upload a wedding menu PDF?',
    'Yes. The event workflow supports PDF input, menu photos and pasted menu text.',
  ],
  [
    'What menu languages are supported?',
    'The menu workflow is designed for English, Roman Hindi, Hindi and Gujarati dish names and aliases.',
  ],
  [
    'Can I cost a multi-day wedding?',
    'Yes. Menu items can be organized by day, meal or function with different guest counts.',
  ],
  [
    'Does it include manpower and extra event costs?',
    'Yes. The app includes manpower, extra-cost and final-costing stages so you can review more than food alone.',
  ],
  [
    'How much is Menu Cost Pro?',
    'Menu Cost Pro is currently ₹999 per month.',
  ],
];

function Arrow() {
  return (
    <span
      className="mc-arrow"
      aria-hidden="true"
    >
      →
    </span>
  );
}

function Check() {
  return (
    <span
      className="mc-check"
      aria-hidden="true"
    >
      ✓
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="mc-site">
      <style>{`
        .mc-site {
          --bg:#07090d;
          --bg2:#0b0f15;
          --surface:#10151d;
          --surface2:#151b25;
          --line:rgba(255,255,255,.09);
          --text:#f6f8fb;
          --muted:#98a3b3;
          --blue:#4a9cff;
          --blue2:#1677ee;
          --green:#45db8a;
          --orange:#ffb24a;
          min-height:100vh;
          overflow:hidden;
          color:var(--text);
          background:
            radial-gradient(circle at 7% 0%,rgba(74,156,255,.17),transparent 30rem),
            radial-gradient(circle at 96% 4%,rgba(100,77,255,.10),transparent 28rem),
            linear-gradient(180deg,#0b0e13 0%,#07090d 100%);
          font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;
        }

        .mc-site * {
          box-sizing:border-box;
        }

        .mc-site a {
          color:inherit;
          text-decoration:none;
        }

        .mc-wrap {
          width:min(1180px,calc(100% - 40px));
          margin:0 auto;
        }

        .mc-nav {
          position:sticky;
          top:0;
          z-index:60;
          border-bottom:1px solid rgba(255,255,255,.06);
          background:rgba(7,9,13,.78);
          backdrop-filter:blur(22px) saturate(140%);
          -webkit-backdrop-filter:blur(22px) saturate(140%);
        }

        .mc-nav-inner {
          display:flex;
          min-height:72px;
          align-items:center;
          justify-content:space-between;
          gap:24px;
        }

        .mc-brand {
          display:flex;
          align-items:center;
          gap:11px;
          font-weight:900;
          letter-spacing:-.035em;
        }

        .mc-brand-mark {
          display:grid;
          width:40px;
          height:40px;
          place-items:center;
          border:1px solid rgba(255,255,255,.10);
          border-radius:13px;
          background:linear-gradient(145deg,#1c2431,#126fde);
          box-shadow:0 12px 28px rgba(18,111,222,.28);
          font-size:12px;
        }

        .mc-brand-copy {
          display:grid;
          gap:1px;
        }

        .mc-brand-copy b {
          font-size:15px;
        }

        .mc-brand-copy small {
          color:#7f8a99;
          font-size:9px;
          font-weight:750;
          letter-spacing:.03em;
          text-transform:uppercase;
        }

        .mc-nav-links {
          display:flex;
          align-items:center;
          gap:26px;
          color:#9ba6b5;
          font-size:13px;
          font-weight:750;
        }

        .mc-nav-links a:hover {
          color:#fff;
        }

        .mc-nav-actions {
          display:flex;
          gap:8px;
        }

        .mc-button {
          display:inline-flex;
          min-height:46px;
          align-items:center;
          justify-content:center;
          gap:9px;
          padding:0 18px;
          border:1px solid transparent;
          border-radius:999px;
          font-size:13px;
          font-weight:850;
          transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease;
        }

        .mc-button:hover {
          transform:translateY(-1px);
        }

        .mc-button-primary {
          color:#fff;
          background:linear-gradient(180deg,#3190ff,#1478f2);
          box-shadow:0 12px 28px rgba(20,120,242,.25);
        }

        .mc-button-primary:hover {
          background:linear-gradient(180deg,#4b9eff,#197bea);
          box-shadow:0 15px 34px rgba(20,120,242,.31);
        }

        .mc-button-secondary {
          color:#e9edf3;
          border-color:var(--line);
          background:rgba(255,255,255,.045);
        }

        .mc-button-secondary:hover {
          border-color:rgba(255,255,255,.16);
          background:rgba(255,255,255,.075);
        }

        .mc-arrow {
          font-size:17px;
          line-height:1;
        }

        .mc-hero {
          position:relative;
          padding:90px 0 54px;
        }

        .mc-hero-grid {
          display:grid;
          grid-template-columns:minmax(0,1.03fr) minmax(460px,.97fr);
          gap:62px;
          align-items:center;
        }

        .mc-eyebrow {
          display:inline-flex;
          align-items:center;
          gap:9px;
          padding:8px 12px;
          border:1px solid rgba(74,156,255,.20);
          border-radius:999px;
          color:#9bc8ff;
          background:rgba(74,156,255,.09);
          font-size:11px;
          font-weight:850;
          letter-spacing:.025em;
        }

        .mc-eyebrow i {
          width:7px;
          height:7px;
          border-radius:50%;
          background:var(--green);
          box-shadow:0 0 0 4px rgba(69,219,138,.11);
        }

        .mc-hero h1 {
          max-width:760px;
          margin:20px 0 0;
          font-size:clamp(48px,6.6vw,82px);
          line-height:.95;
          letter-spacing:-.072em;
          font-weight:930;
        }

        .mc-hero h1 span {
          color:var(--blue);
        }

        .mc-hero-sub {
          max-width:650px;
          margin:25px 0 0;
          color:#9ba6b5;
          font-size:clamp(17px,1.6vw,20px);
          line-height:1.62;
        }

        .mc-hero-actions {
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin-top:29px;
        }

        .mc-hero-actions .mc-button {
          min-height:54px;
          padding:0 24px;
          font-size:14px;
        }

        .mc-trust-row {
          display:flex;
          flex-wrap:wrap;
          gap:9px 18px;
          margin-top:23px;
          color:#7f8a99;
          font-size:11px;
          font-weight:730;
        }

        .mc-trust-row span {
          display:inline-flex;
          align-items:center;
          gap:7px;
        }

        .mc-trust-row i {
          display:grid;
          width:17px;
          height:17px;
          place-items:center;
          border-radius:50%;
          color:#67e49b;
          background:rgba(69,219,138,.10);
          font-size:9px;
          font-style:normal;
          font-weight:900;
        }

        .mc-product-shell {
          position:relative;
        }

        .mc-product-glow {
          position:absolute;
          inset:12% 6%;
          border-radius:50%;
          background:rgba(48,133,255,.24);
          filter:blur(75px);
        }

        .mc-product {
          position:relative;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.11);
          border-radius:27px;
          background:#0c1016;
          box-shadow:0 36px 90px rgba(0,0,0,.52);
          transform:perspective(1200px) rotateY(-3deg) rotateX(1.5deg);
        }

        .mc-product-bar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:13px 15px;
          border-bottom:1px solid var(--line);
          color:#7d8998;
          background:#11161e;
          font-size:9px;
          font-weight:750;
        }

        .mc-dots {
          display:flex;
          gap:5px;
        }

        .mc-dots i {
          width:7px;
          height:7px;
          border-radius:50%;
          background:#3a424e;
        }

        .mc-product-main {
          display:grid;
          grid-template-columns:118px 1fr;
          min-height:430px;
        }

        .mc-product-side {
          padding:18px 10px;
          border-right:1px solid rgba(255,255,255,.07);
          background:#0a0d12;
        }

        .mc-side-brand {
          display:flex;
          align-items:center;
          gap:7px;
          margin-bottom:22px;
          color:#e7ebf1;
          font-size:9px;
          font-weight:850;
        }

        .mc-side-brand b {
          display:grid;
          width:26px;
          height:26px;
          place-items:center;
          border-radius:8px;
          background:#1478f2;
        }

        .mc-side-item {
          margin:4px 0;
          padding:9px 8px;
          border-radius:9px;
          color:#697585;
          font-size:8px;
          font-weight:750;
        }

        .mc-side-item.active {
          color:#fff;
          background:rgba(74,156,255,.13);
        }

        .mc-product-content {
          padding:17px;
          background:
            radial-gradient(circle at 90% 0%,rgba(74,156,255,.08),transparent 16rem),
            #0f1319;
        }

        .mc-product-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }

        .mc-product-head small {
          display:block;
          color:#667281;
          font-size:7px;
          font-weight:780;
          text-transform:uppercase;
        }

        .mc-product-head h3 {
          margin:4px 0 0;
          font-size:17px;
          letter-spacing:-.035em;
        }

        .mc-ready {
          padding:6px 8px;
          border-radius:999px;
          color:#69df9c;
          background:rgba(61,220,132,.10);
          font-size:7px;
          font-weight:850;
        }

        .mc-product-metrics {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:7px;
          margin:16px 0 9px;
        }

        .mc-product-metric {
          padding:10px;
          border:1px solid #262d37;
          border-radius:11px;
          background:#151a22;
        }

        .mc-product-metric small {
          display:block;
          color:#6f7a89;
          font-size:6px;
          font-weight:800;
          text-transform:uppercase;
        }

        .mc-product-metric strong {
          display:block;
          margin-top:5px;
          font-size:14px;
        }

        .mc-analysis {
          padding:12px;
          border:1px solid #28313d;
          border-radius:13px;
          background:#11161e;
        }

        .mc-analysis-top {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:9px;
        }

        .mc-analysis-top b {
          font-size:9px;
        }

        .mc-analysis-top span {
          padding:4px 7px;
          border-radius:999px;
          color:#89bfff;
          background:rgba(74,156,255,.11);
          font-size:6px;
          font-weight:850;
        }

        .mc-analysis-row {
          display:grid;
          grid-template-columns:1.25fr .65fr .55fr;
          gap:6px;
          align-items:center;
          padding:8px 2px;
          border-top:1px solid rgba(255,255,255,.06);
          color:#8d98a7;
          font-size:7px;
        }

        .mc-analysis-row b {
          color:#e6ebf1;
          font-size:8px;
        }

        .mc-rate-ok {
          color:#62d996;
        }

        .mc-product-total {
          display:grid;
          grid-template-columns:1.15fr .85fr;
          gap:8px;
          margin-top:9px;
        }

        .mc-total-card {
          padding:12px;
          border-radius:13px;
          background:linear-gradient(135deg,#172235,#173d69);
        }

        .mc-total-card small {
          display:block;
          color:#89a3c1;
          font-size:6px;
        }

        .mc-total-card strong {
          display:block;
          margin-top:4px;
          font-size:21px;
          letter-spacing:-.04em;
        }

        .mc-total-card span {
          display:block;
          margin-top:3px;
          color:#8cc3ff;
          font-size:6px;
        }

        .mc-coverage {
          display:grid;
          place-items:center;
          padding:10px;
          border:1px solid #24384e;
          border-radius:13px;
          background:#111a25;
          text-align:center;
        }

        .mc-coverage b {
          color:#80baff;
          font-size:9px;
        }

        .mc-coverage small {
          margin-top:4px;
          color:#708092;
          font-size:6px;
        }

        .mc-proof-strip {
          padding:10px 0 70px;
        }

        .mc-proof-box {
          display:grid;
          grid-template-columns:auto 1fr;
          gap:24px;
          align-items:center;
          padding:18px 20px;
          border:1px solid var(--line);
          border-radius:18px;
          background:rgba(255,255,255,.025);
        }

        .mc-proof-box > b {
          color:#d9dee6;
          font-size:12px;
        }

        .mc-usecases {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:8px;
        }

        .mc-usecases span {
          display:grid;
          min-height:42px;
          place-items:center;
          padding:8px;
          border:1px solid rgba(255,255,255,.06);
          border-radius:11px;
          color:#98a3b3;
          background:#0f1319;
          font-size:11px;
          font-weight:750;
          text-align:center;
        }

        .mc-section {
          padding:94px 0;
        }

        .mc-section-soft {
          border-top:1px solid rgba(255,255,255,.055);
          border-bottom:1px solid rgba(255,255,255,.055);
          background:
            linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,.008));
        }

        .mc-section-head {
          max-width:760px;
          margin-bottom:43px;
        }

        .mc-section-head.center {
          margin-right:auto;
          margin-left:auto;
          text-align:center;
        }

        .mc-kicker {
          color:#8bc0ff;
          font-size:10px;
          font-weight:900;
          letter-spacing:.11em;
          text-transform:uppercase;
        }

        .mc-section-head h2,
        .mc-estimator-head h3 {
          margin:10px 0 0;
          font-size:clamp(34px,5vw,58px);
          line-height:1.02;
          letter-spacing:-.055em;
        }

        .mc-section-head p {
          max-width:680px;
          margin:16px 0 0;
          color:var(--muted);
          font-size:16px;
          line-height:1.65;
        }

        .mc-section-head.center p {
          margin-right:auto;
          margin-left:auto;
        }

        .mc-outcomes {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:12px;
        }

        .mc-outcome {
          min-height:235px;
          padding:23px;
          border:1px solid var(--line);
          border-radius:20px;
          background:linear-gradient(180deg,#11161e,#0d1117);
        }

        .mc-outcome-icon {
          display:grid;
          width:38px;
          height:38px;
          place-items:center;
          border:1px solid rgba(74,156,255,.20);
          border-radius:12px;
          color:#8bc0ff;
          background:rgba(74,156,255,.09);
          font-size:9px;
          font-weight:900;
        }

        .mc-outcome h3 {
          margin:28px 0 8px;
          font-size:18px;
          letter-spacing:-.03em;
        }

        .mc-outcome p {
          margin:0;
          color:#8d98a7;
          font-size:12px;
          line-height:1.6;
        }

        .mc-loss-grid {
          display:grid;
          grid-template-columns:.88fr 1.12fr;
          gap:36px;
          align-items:center;
        }

        .mc-loss-copy h2 {
          margin:10px 0 0;
          font-size:clamp(36px,5vw,60px);
          line-height:1;
          letter-spacing:-.06em;
        }

        .mc-loss-copy p {
          margin:18px 0 0;
          color:var(--muted);
          font-size:15px;
          line-height:1.7;
        }

        .mc-loss-points {
          display:grid;
          gap:10px;
          margin-top:24px;
        }

        .mc-loss-points span {
          display:flex;
          align-items:flex-start;
          gap:10px;
          color:#c5ccd6;
          font-size:12px;
          font-weight:720;
          line-height:1.5;
        }

        .mc-check {
          display:grid;
          width:20px;
          height:20px;
          flex:0 0 20px;
          place-items:center;
          border-radius:50%;
          color:#6ce09e;
          background:rgba(61,220,132,.10);
          font-size:10px;
          font-weight:900;
        }

        .mc-estimator {
          padding:24px;
          border:1px solid rgba(74,156,255,.16);
          border-radius:24px;
          background:
            radial-gradient(circle at 90% 0%,rgba(74,156,255,.10),transparent 20rem),
            #10151d;
          box-shadow:0 24px 70px rgba(0,0,0,.28);
        }

        .mc-estimator-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:20px;
        }

        .mc-estimator-head h3 {
          max-width:560px;
          font-size:28px;
        }

        .mc-estimator-head p {
          max-width:560px;
          margin:8px 0 0;
          color:#8d98a7;
          font-size:12px;
          line-height:1.55;
        }

        .mc-live-chip {
          flex:0 0 auto;
          padding:7px 10px;
          border:1px solid rgba(69,219,138,.16);
          border-radius:999px;
          color:#69df9c;
          background:rgba(61,220,132,.08);
          font-size:9px;
          font-weight:850;
        }

        .mc-estimator-inputs {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:9px;
          margin-top:22px;
        }

        .mc-estimator-inputs label {
          display:grid;
          gap:7px;
        }

        .mc-estimator-inputs label > span {
          color:#929baa;
          font-size:9px;
          font-weight:800;
        }

        .mc-estimator-inputs input {
          width:100%;
          min-height:47px;
          border:1px solid #303743;
          border-radius:11px;
          outline:0;
          color:#f5f7fa;
          background:#151a22;
          padding:0 12px;
          font:inherit;
          font-size:13px;
          font-weight:800;
        }

        .mc-estimator-inputs input:focus {
          border-color:rgba(74,156,255,.62);
          box-shadow:0 0 0 4px rgba(74,156,255,.09);
        }

        .mc-money-input {
          position:relative;
        }

        .mc-money-input i {
          position:absolute;
          top:50%;
          left:12px;
          z-index:1;
          color:#8591a1;
          font-style:normal;
          font-size:11px;
          transform:translateY(-50%);
        }

        .mc-money-input input {
          padding-left:27px;
        }

        .mc-estimator-results {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:8px;
          margin-top:9px;
        }

        .mc-estimator-results > div {
          padding:13px;
          border:1px solid #282f39;
          border-radius:12px;
          background:#0e1218;
        }

        .mc-estimator-results span {
          display:block;
          color:#6f7a89;
          font-size:8px;
          font-weight:800;
          text-transform:uppercase;
        }

        .mc-estimator-results strong {
          display:block;
          margin-top:6px;
          font-size:16px;
          letter-spacing:-.025em;
        }

        .mc-estimator-warning {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          margin-top:9px;
          padding:13px 14px;
          border:1px solid rgba(255,178,74,.18);
          border-radius:12px;
          color:#ffcb83;
          background:rgba(255,178,74,.07);
          font-size:10px;
          font-weight:760;
        }

        .mc-estimator-warning strong {
          color:#ffd69d;
          font-size:12px;
        }

        .mc-workflow {
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:10px;
          counter-reset:flow;
        }

        .mc-flow-card {
          position:relative;
          min-height:260px;
          padding:22px;
          overflow:hidden;
          border:1px solid var(--line);
          border-radius:20px;
          background:#10151d;
        }

        .mc-flow-card::after {
          content:"";
          position:absolute;
          right:-45px;
          bottom:-45px;
          width:130px;
          height:130px;
          border-radius:50%;
          background:rgba(74,156,255,.055);
        }

        .mc-flow-no {
          color:#5e9fe9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.08em;
        }

        .mc-flow-card h3 {
          margin:60px 0 9px;
          font-size:19px;
          letter-spacing:-.035em;
        }

        .mc-flow-card p {
          margin:0;
          color:#8d98a7;
          font-size:12px;
          line-height:1.6;
        }

        .mc-result-grid {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:36px;
          align-items:center;
        }

        .mc-result-screen {
          overflow:hidden;
          border:1px solid #2a3340;
          border-radius:24px;
          background:#10151d;
          box-shadow:0 30px 70px rgba(0,0,0,.34);
        }

        .mc-result-head {
          padding:21px;
          border-bottom:1px solid #252d37;
          background:
            linear-gradient(145deg,rgba(74,156,255,.10),rgba(16,21,29,.95));
        }

        .mc-result-head span {
          color:#65df99;
          font-size:9px;
          font-weight:900;
          letter-spacing:.09em;
          text-transform:uppercase;
        }

        .mc-result-head h3 {
          margin:8px 0 0;
          font-size:25px;
          letter-spacing:-.045em;
        }

        .mc-result-metrics {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:1px;
          background:#252d37;
        }

        .mc-result-metrics > div {
          padding:18px;
          background:#11161e;
        }

        .mc-result-metrics small {
          display:block;
          color:#717d8d;
          font-size:8px;
          font-weight:800;
          text-transform:uppercase;
        }

        .mc-result-metrics strong {
          display:block;
          margin-top:6px;
          font-size:23px;
          letter-spacing:-.04em;
        }

        .mc-result-foot {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:16px 18px;
          color:#8d98a7;
          font-size:10px;
        }

        .mc-result-foot b {
          color:#7db7ff;
        }

        .mc-result-copy h2 {
          margin:10px 0 0;
          font-size:clamp(36px,4.5vw,58px);
          line-height:1;
          letter-spacing:-.06em;
        }

        .mc-result-copy p {
          margin:18px 0 0;
          color:#929baa;
          font-size:15px;
          line-height:1.68;
        }

        .mc-result-list {
          display:grid;
          gap:11px;
          margin-top:24px;
        }

        .mc-result-list div {
          display:grid;
          grid-template-columns:22px 1fr;
          gap:10px;
          align-items:start;
          color:#c5ccd6;
          font-size:12px;
          line-height:1.5;
        }

        .mc-compare-wrap {
          overflow:hidden;
          border:1px solid var(--line);
          border-radius:22px;
          background:#0f1319;
        }

        .mc-compare {
          width:100%;
          border-collapse:collapse;
        }

        .mc-compare th,
        .mc-compare td {
          padding:15px 18px;
          border-bottom:1px solid rgba(255,255,255,.065);
          text-align:left;
        }

        .mc-compare th {
          color:#747f8f;
          background:#11161e;
          font-size:9px;
          font-weight:900;
          letter-spacing:.06em;
          text-transform:uppercase;
        }

        .mc-compare th:first-child {
          width:24%;
        }

        .mc-compare th:nth-child(2),
        .mc-compare td:nth-child(2) {
          color:#8d98a7;
        }

        .mc-compare th:nth-child(3),
        .mc-compare td:nth-child(3) {
          color:#e7ecf2;
        }

        .mc-compare td {
          color:#bcc5d0;
          background:#0f1319;
          font-size:12px;
        }

        .mc-compare td:first-child {
          color:#f0f3f7;
          font-weight:800;
        }

        .mc-compare tr:last-child td {
          border-bottom:0;
        }

        .mc-pricing-shell {
          display:grid;
          grid-template-columns:minmax(0,.9fr) minmax(420px,1.1fr);
          gap:44px;
          align-items:center;
        }

        .mc-pricing-copy h2 {
          margin:10px 0 0;
          font-size:clamp(38px,5vw,62px);
          line-height:.98;
          letter-spacing:-.06em;
        }

        .mc-pricing-copy p {
          margin:18px 0 0;
          color:#929baa;
          font-size:15px;
          line-height:1.68;
        }

        .mc-price-card {
          padding:26px;
          border:1px solid rgba(74,156,255,.23);
          border-radius:25px;
          background:
            radial-gradient(circle at 100% 0%,rgba(74,156,255,.13),transparent 19rem),
            #10151d;
          box-shadow:0 30px 75px rgba(0,0,0,.30);
        }

        .mc-price-top {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:18px;
        }

        .mc-price-top span {
          color:#90c3ff;
          font-size:10px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .mc-price-top h3 {
          margin:6px 0 0;
          font-size:25px;
          letter-spacing:-.04em;
        }

        .mc-price {
          text-align:right;
        }

        .mc-price strong {
          display:block;
          font-size:35px;
          letter-spacing:-.055em;
        }

        .mc-price small {
          color:#7c8796;
          font-size:9px;
          font-weight:750;
        }

        .mc-price-list {
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:9px;
          margin:24px 0;
        }

        .mc-price-list span {
          display:flex;
          align-items:flex-start;
          gap:8px;
          padding:10px 11px;
          border:1px solid rgba(255,255,255,.07);
          border-radius:11px;
          color:#b8c0cc;
          background:rgba(255,255,255,.025);
          font-size:10px;
          line-height:1.45;
        }

        .mc-price-card .mc-button {
          width:100%;
          min-height:52px;
        }

        .mc-no-card {
          margin:11px 0 0;
          color:#738091;
          font-size:9px;
          text-align:center;
        }

        .mc-faq {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:9px;
        }

        .mc-faq details {
          padding:18px 19px;
          border:1px solid var(--line);
          border-radius:15px;
          background:#10151d;
        }

        .mc-faq summary {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          cursor:pointer;
          list-style:none;
          font-size:12px;
          font-weight:850;
        }

        .mc-faq summary::-webkit-details-marker {
          display:none;
        }

        .mc-faq summary::after {
          content:"+";
          color:#7db7ff;
          font-size:18px;
          font-weight:500;
        }

        .mc-faq details[open] summary::after {
          content:"−";
        }

        .mc-faq p {
          margin:11px 0 0;
          color:#8994a3;
          font-size:11px;
          line-height:1.6;
        }

        .mc-final {
          padding:105px 0;
        }

        .mc-final-card {
          position:relative;
          overflow:hidden;
          padding:62px 36px;
          border:1px solid rgba(74,156,255,.20);
          border-radius:30px;
          background:
            radial-gradient(circle at 20% 0%,rgba(74,156,255,.19),transparent 25rem),
            radial-gradient(circle at 100% 100%,rgba(105,80,255,.10),transparent 22rem),
            #10151d;
          text-align:center;
          box-shadow:0 35px 90px rgba(0,0,0,.32);
        }

        .mc-final-card h2 {
          max-width:850px;
          margin:12px auto 0;
          font-size:clamp(42px,6.5vw,72px);
          line-height:.98;
          letter-spacing:-.065em;
        }

        .mc-final-card p {
          max-width:650px;
          margin:18px auto 0;
          color:#9aa5b4;
          font-size:15px;
          line-height:1.65;
        }

        .mc-final-actions {
          display:flex;
          justify-content:center;
          gap:9px;
          margin-top:27px;
        }

        .mc-final-actions .mc-button {
          min-height:53px;
          padding:0 24px;
        }

        .mc-footer {
          padding:28px 0 40px;
          border-top:1px solid rgba(255,255,255,.055);
        }

        .mc-footer-inner {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
          color:#697585;
          font-size:10px;
        }

        .mc-footer-links {
          display:flex;
          gap:16px;
        }

        .mc-mobile-cta {
          display:none;
        }

        @media (max-width:1000px) {
          .mc-hero-grid,
          .mc-loss-grid,
          .mc-result-grid,
          .mc-pricing-shell {
            grid-template-columns:1fr;
          }

          .mc-hero-grid {
            gap:48px;
          }

          .mc-product-shell {
            width:min(650px,100%);
            margin:0 auto;
          }

          .mc-outcomes,
          .mc-workflow {
            grid-template-columns:repeat(2,1fr);
          }

          .mc-pricing-shell {
            gap:30px;
          }
        }

        @media (max-width:760px) {
          .mc-wrap {
            width:min(100% - 28px,1180px);
          }

          .mc-nav-inner {
            min-height:64px;
          }

          .mc-nav-links {
            display:none;
          }

          .mc-nav-actions .mc-button-secondary {
            display:none;
          }

          .mc-brand-copy small {
            display:none;
          }

          .mc-hero {
            padding:62px 0 38px;
          }

          .mc-hero h1 {
            font-size:clamp(44px,14vw,64px);
          }

          .mc-hero-sub {
            font-size:16px;
          }

          .mc-hero-actions {
            display:grid;
          }

          .mc-hero-actions .mc-button {
            width:100%;
          }

          .mc-product {
            transform:none;
          }

          .mc-product-main {
            grid-template-columns:90px 1fr;
            min-height:390px;
          }

          .mc-product-side {
            padding-inline:8px;
          }

          .mc-side-item {
            font-size:7px;
          }

          .mc-product-content {
            padding:12px;
          }

          .mc-product-metrics {
            grid-template-columns:1fr 1fr;
          }

          .mc-product-metric:last-child {
            grid-column:1 / -1;
          }

          .mc-proof-box {
            grid-template-columns:1fr;
          }

          .mc-usecases {
            grid-template-columns:repeat(2,1fr);
          }

          .mc-section {
            padding:72px 0;
          }

          .mc-outcomes,
          .mc-workflow,
          .mc-faq,
          .mc-price-list {
            grid-template-columns:1fr;
          }

          .mc-outcome,
          .mc-flow-card {
            min-height:0;
          }

          .mc-flow-card h3 {
            margin-top:35px;
          }

          .mc-estimator-head {
            display:grid;
          }

          .mc-live-chip {
            justify-self:start;
          }

          .mc-estimator-inputs,
          .mc-estimator-results {
            grid-template-columns:1fr 1fr;
          }

          .mc-estimator-inputs label:first-child {
            grid-column:1 / -1;
          }

          .mc-estimator-warning {
            display:grid;
          }

          .mc-compare-wrap {
            overflow-x:auto;
          }

          .mc-compare {
            min-width:680px;
          }

          .mc-price-card {
            padding:21px;
          }

          .mc-final-card {
            padding:46px 20px;
            border-radius:24px;
          }

          .mc-final-actions {
            display:grid;
          }

          .mc-footer-inner {
            align-items:flex-start;
            flex-direction:column;
          }

          .mc-mobile-cta {
            position:fixed;
            right:10px;
            bottom:max(10px,env(safe-area-inset-bottom,0px));
            left:10px;
            z-index:70;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            padding:9px 9px 9px 14px;
            border:1px solid rgba(255,255,255,.10);
            border-radius:18px;
            background:rgba(12,16,22,.95);
            box-shadow:0 18px 50px rgba(0,0,0,.45);
            backdrop-filter:blur(20px);
          }

          .mc-mobile-cta span {
            display:grid;
            gap:1px;
            font-size:10px;
            font-weight:800;
          }

          .mc-mobile-cta small {
            color:#768293;
            font-size:8px;
            font-weight:700;
          }

          .mc-mobile-cta .mc-button {
            min-height:42px;
            padding:0 15px;
            font-size:11px;
          }

          .mc-footer {
            padding-bottom:100px;
          }
        }

        @media (max-width:430px) {
          .mc-product-main {
            grid-template-columns:72px 1fr;
          }

          .mc-side-brand span {
            display:none;
          }

          .mc-product-total {
            grid-template-columns:1fr;
          }

          .mc-estimator-inputs,
          .mc-estimator-results {
            grid-template-columns:1fr;
          }

          .mc-estimator-inputs label:first-child {
            grid-column:auto;
          }

          .mc-usecases {
            grid-template-columns:1fr;
          }
        }

        @media (prefers-reduced-motion:reduce) {
          .mc-button {
            transition:none;
          }

          .mc-button:hover {
            transform:none;
          }
        }
      `}</style>

      <nav className="mc-nav">
        <div className="mc-wrap mc-nav-inner">
          <Link
            href="/"
            className="mc-brand"
            aria-label="Menu Cost home"
          >
            <span className="mc-brand-mark">
              MC
            </span>

            <span className="mc-brand-copy">
              <b>
                Menu Cost
              </b>

              <small>
                For Indian caterers
              </small>
            </span>
          </Link>

          <div className="mc-nav-links">
            <a href="#how">
              How it works
            </a>

            <a href="#why">
              Why Menu Cost
            </a>

            <a href="#pricing">
              Pricing
            </a>

            <a href="#faq">
              FAQ
            </a>
          </div>

          <div className="mc-nav-actions">
            <Link
              href="/login"
              className="mc-button mc-button-secondary"
            >
              Sign in
            </Link>

            <Link
              href="/signup"
              className="mc-button mc-button-primary"
            >
              Start Free
              <Arrow />
            </Link>
          </div>
        </div>
      </nav>

      <section className="mc-hero">
        <div className="mc-wrap mc-hero-grid">
          <div>
            <span className="mc-eyebrow">
              <i aria-hidden="true" />
              Catering costing software built for India
            </span>

            <h1>
              Know your catering cost
              <span>
                {' '}before you quote.
              </span>
            </h1>

            <p className="mc-hero-sub">
              Upload the event menu, review detected dishes, use your own ingredient rates, add manpower and event expenses, then see the final cost before you send the price to the client.
            </p>

            <div className="mc-hero-actions">
              <Link
                href="/signup"
                className="mc-button mc-button-primary"
              >
                Calculate My First Menu
                <Arrow />
              </Link>

              <a
                href="#how"
                className="mc-button mc-button-secondary"
              >
                See How It Works
              </a>
            </div>

            <div className="mc-trust-row">
              <span>
                <i>✓</i>
                No payment required to create account
              </span>

              <span>
                <i>✓</i>
                Your ingredient rates stay account-specific
              </span>

              <span>
                <i>✓</i>
                English · Roman Hindi · Hindi · Gujarati
              </span>
            </div>
          </div>

          <div
            className="mc-product-shell"
            aria-label="Menu Cost product preview"
          >
            <div className="mc-product-glow" />

            <div className="mc-product">
              <div className="mc-product-bar">
                <div className="mc-dots">
                  <i />
                  <i />
                  <i />
                </div>

                <span>
                  menu-costing.com / event
                </span>

                <span>
                  Secure workspace
                </span>
              </div>

              <div className="mc-product-main">
                <aside className="mc-product-side">
                  <div className="mc-side-brand">
                    <b>
                      MC
                    </b>
                    <span>
                      Menu Cost
                    </span>
                  </div>

                  <div className="mc-side-item active">
                    Event
                  </div>

                  <div className="mc-side-item">
                    Manpower
                  </div>

                  <div className="mc-side-item">
                    Extras
                  </div>

                  <div className="mc-side-item">
                    Cost
                  </div>

                  <div className="mc-side-item">
                    Final
                  </div>
                </aside>

                <div className="mc-product-content">
                  <div className="mc-product-head">
                    <div>
                      <small>
                        Menu analysis
                      </small>

                      <h3>
                        Wedding Dinner
                      </h3>
                    </div>

                    <span className="mc-ready">
                      ✓ Ready
                    </span>
                  </div>

                  <div className="mc-product-metrics">
                    <div className="mc-product-metric">
                      <small>
                        Dishes
                      </small>

                      <strong>
                        24
                      </strong>
                    </div>

                    <div className="mc-product-metric">
                      <small>
                        Guests
                      </small>

                      <strong>
                        500
                      </strong>
                    </div>

                    <div className="mc-product-metric">
                      <small>
                        Food / cover
                      </small>

                      <strong>
                        ₹286
                      </strong>
                    </div>
                  </div>

                  <div className="mc-analysis">
                    <div className="mc-analysis-top">
                      <b>
                        Detected dishes
                      </b>

                      <span>
                        Your rates
                      </span>
                    </div>

                    {[
                      [
                        'Paneer Tikka',
                        'Starter',
                        '₹42',
                      ],
                      [
                        'Paneer Butter Masala',
                        'Paneer',
                        '₹58',
                      ],
                      [
                        'Dal Fry',
                        'Dal',
                        '₹24',
                      ],
                      [
                        'Gulab Jamun',
                        'Sweet',
                        '₹18',
                      ],
                    ].map(
                      (row) => (
                        <div
                          className="mc-analysis-row"
                          key={row[0]}
                        >
                          <b>
                            {row[0]}
                          </b>

                          <span>
                            {row[1]}
                          </span>

                          <span className="mc-rate-ok">
                            {row[2]}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mc-product-total">
                    <div className="mc-total-card">
                      <small>
                        Estimated food cost
                      </small>

                      <strong>
                        ₹1,43,000
                      </strong>

                      <span>
                        500 covers × ₹286
                      </span>
                    </div>

                    <div className="mc-coverage">
                      <b>
                        24 / 24 ready
                      </b>

                      <small>
                        Rate coverage
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mc-proof-strip">
        <div className="mc-wrap">
          <div className="mc-proof-box">
            <b>
              Designed around real catering workflows
            </b>

            <div className="mc-usecases">
              {useCases.map(
                (item) => (
                  <span key={item}>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="mc-section mc-section-soft"
        id="why"
      >
        <div className="mc-wrap">
          <div className="mc-section-head center">
            <span className="mc-kicker">
              The outcome
            </span>

            <h2>
              Stop guessing the number that decides your margin.
            </h2>

            <p>
              Menu Cost is built around the question a caterer needs answered before quoting: “What will this event actually cost me?”
            </p>
          </div>

          <div className="mc-outcomes">
            {outcomes.map(
              (item) => (
                <article
                  className="mc-outcome"
                  key={item.title}
                >
                  <span className="mc-outcome-icon">
                    {item.icon}
                  </span>

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.text}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mc-section">
        <div className="mc-wrap mc-loss-grid">
          <div className="mc-loss-copy">
            <span className="mc-kicker">
              Cost leakage
            </span>

            <h2>
              A ₹20 mistake is not a ₹20 problem.
            </h2>

            <p>
              On a large event, a small per-plate miss multiplies across every guest. That is why the costing should happen before the quotation — not after the event.
            </p>

            <div className="mc-loss-points">
              <span>
                <Check />
                Compare selling price with estimated event cost.
              </span>

              <span>
                <Check />
                Keep manpower and extra expenses in the same workflow.
              </span>

              <span>
                <Check />
                Review missing rates before finalizing the number.
              </span>
            </div>
          </div>

          <MarketingEstimator />
        </div>
      </section>

      <section
        className="mc-section mc-section-soft"
        id="how"
      >
        <div className="mc-wrap">
          <div className="mc-section-head">
            <span className="mc-kicker">
              How it works
            </span>

            <h2>
              From menu to costing in one workflow.
            </h2>

            <p>
              Start with the material you already receive from clients instead of rebuilding the event from scratch.
            </p>
          </div>

          <div className="mc-workflow">
            {workflow.map(
              (item) => (
                <article
                  className="mc-flow-card"
                  key={item.no}
                >
                  <span className="mc-flow-no">
                    STEP {item.no}
                  </span>

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.text}
                  </p>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mc-section">
        <div className="mc-wrap mc-result-grid">
          <div className="mc-result-screen">
            <div className="mc-result-head">
              <span>
                ✓ Menu analysis complete
              </span>

              <h3>
                Your menu already has a cost signal.
              </h3>
            </div>

            <div className="mc-result-metrics">
              <div>
                <small>
                  Dishes detected
                </small>

                <strong>
                  24
                </strong>
              </div>

              <div>
                <small>
                  Meal functions
                </small>

                <strong>
                  4
                </strong>
              </div>

              <div>
                <small>
                  Est. food / cover
                </small>

                <strong>
                  ₹286
                </strong>
              </div>

              <div>
                <small>
                  Est. food total
                </small>

                <strong>
                  ₹1.43L
                </strong>
              </div>
            </div>

            <div className="mc-result-foot">
              <span>
                Rate coverage
              </span>

              <b>
                24 / 24 dishes ready
              </b>
            </div>
          </div>

          <div className="mc-result-copy">
            <span className="mc-kicker">
              See value early
            </span>

            <h2>
              Get a useful cost signal before doing the rest of the setup.
            </h2>

            <p>
              After menu detection, the app can surface the dishes, functions, guest covers and estimated food-cost signal so you know where the event stands before continuing.
            </p>

            <div className="mc-result-list">
              <div>
                <Check />
                <span>
                  See how many detected dishes already have rates.
                </span>
              </div>

              <div>
                <Check />
                <span>
                  Identify new or missing-rate dishes before final costing.
                </span>
              </div>

              <div>
                <Check />
                <span>
                  Continue into manpower, extra costs and final costing.
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop:
                  25,
              }}
            >
              <Link
                href="/signup"
                className="mc-button mc-button-primary"
              >
                Try It With My Menu
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mc-section mc-section-soft">
        <div className="mc-wrap">
          <div className="mc-section-head center">
            <span className="mc-kicker">
              Built for costing, not spreadsheets
            </span>

            <h2>
              One event. One workflow. Fewer disconnected calculations.
            </h2>

            <p>
              Spreadsheets can calculate anything, but catering costing becomes harder when menu, rates, functions and event expenses live in different places.
            </p>
          </div>

          <div className="mc-compare-wrap">
            <table className="mc-compare">
              <thead>
                <tr>
                  <th>
                    Workflow
                  </th>

                  <th>
                    Spreadsheet
                  </th>

                  <th>
                    Menu Cost
                  </th>
                </tr>
              </thead>

              <tbody>
                {comparison.map(
                  (row) => (
                    <tr key={row[0]}>
                      <td>
                        {row[0]}
                      </td>

                      <td>
                        {row[1]}
                      </td>

                      <td>
                        ✓ {row[2]}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        className="mc-section"
        id="pricing"
      >
        <div className="mc-wrap mc-pricing-shell">
          <div className="mc-pricing-copy">
            <span className="mc-kicker">
              Simple pricing
            </span>

            <h2>
              Start with the product. Upgrade when you need Pro.
            </h2>

            <p>
              Create your account without entering payment details. Menu Cost Pro is currently ₹999 per month.
            </p>
          </div>

          <div className="mc-price-card">
            <div className="mc-price-top">
              <div>
                <span>
                  Menu Cost Pro
                </span>

                <h3>
                  Catering costing workspace
                </h3>
              </div>

              <div className="mc-price">
                <strong>
                  ₹999
                </strong>

                <small>
                  per month
                </small>
              </div>
            </div>

            <div className="mc-price-list">
              {[
                'Menu upload & dish detection',
                'Your ingredient-rate overrides',
                'Event & function guest counts',
                'Manpower costing',
                'Extra event costs',
                'Final costing & PDF workflow',
              ].map(
                (item) => (
                  <span key={item}>
                    <Check />
                    {item}
                  </span>
                ),
              )}
            </div>

            <Link
              href="/signup"
              className="mc-button mc-button-primary"
            >
              Create Free Account
              <Arrow />
            </Link>

            <p className="mc-no-card">
              No payment details required to create your account.
            </p>
          </div>
        </div>
      </section>

      <section
        className="mc-section mc-section-soft"
        id="faq"
      >
        <div className="mc-wrap">
          <div className="mc-section-head center">
            <span className="mc-kicker">
              Questions before you start
            </span>

            <h2>
              Everything you need to know before trying Menu Cost.
            </h2>
          </div>

          <div className="mc-faq">
            {faqs.map(
              ([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                  </summary>

                  <p>
                    {answer}
                  </p>
                </details>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mc-final">
        <div className="mc-wrap">
          <div className="mc-final-card">
            <span className="mc-kicker">
              Your next quote can be costed first
            </span>

            <h2>
              Upload the menu. Know the cost. Then decide the price.
            </h2>

            <p>
              Start with a real event menu and see how Menu Cost fits your catering workflow.
            </p>

            <div className="mc-final-actions">
              <Link
                href="/signup"
                className="mc-button mc-button-primary"
              >
                Start Free
                <Arrow />
              </Link>

              <Link
                href="/login"
                className="mc-button mc-button-secondary"
              >
                I Already Have an Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mc-footer">
        <div className="mc-wrap mc-footer-inner">
          <div className="mc-brand">
            <span className="mc-brand-mark">
              MC
            </span>

            <span className="mc-brand-copy">
              <b>
                Menu Cost
              </b>

              <small>
                Catering costing software
              </small>
            </span>
          </div>

          <span>
            Know your catering cost before you quote.
          </span>

          <div className="mc-footer-links">
            <Link href="/login">
              Sign in
            </Link>

            <Link href="/signup">
              Start free
            </Link>
          </div>
        </div>
      </footer>

      <div className="mc-mobile-cta">
        <span>
          Cost your next menu
          <small>
            No payment required to create account
          </small>
        </span>

        <Link
          href="/signup"
          className="mc-button mc-button-primary"
        >
          Start Free
        </Link>
      </div>
    </main>
  );
}
