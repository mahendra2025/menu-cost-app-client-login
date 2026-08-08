'use client';

import Link from 'next/link';

export default function FreeLimitPaywall({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="mc-paywall-backdrop no-print">
      <section className="mc-paywall" role="dialog" aria-modal="true">
        <span className="mc-paywall-badge">5 / 5 FREE COSTINGS USED</span>
        <h2>Keep costing with Pro.</h2>
        <p>Your completed costings remain saved. Upgrade to Menu Costing Pro to start unlimited new costings.</p>
        <div className="mc-paywall-price"><strong>₹999</strong><span>/ month</span></div>
        <div className="mc-paywall-points"><span>✓ Unlimited costings</span><span>✓ Menu detection</span><span>✓ Your ingredient rates</span><span>✓ Saved costing history</span></div>
        <div className="mc-paywall-actions">
          <Link className="primary-button" href="/app/profile?upgrade=1">Upgrade to Pro</Link>
          <button className="ghost-button" type="button" onClick={onClose}>Not now</button>
        </div>
      </section>
      <style>{`.mc-paywall-backdrop{position:fixed;inset:0;z-index:999;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(14px)}.mc-paywall{width:min(460px,100%);padding:27px;border:1px solid #303947;border-radius:23px;color:#f5f7fa;background:#11161e;box-shadow:0 35px 90px rgba(0,0,0,.55)}.mc-paywall-badge{display:inline-flex;padding:6px 9px;border-radius:999px;color:#ffc16b;background:rgba(255,173,66,.1);font-size:8px;font-weight:900}.mc-paywall h2{margin:14px 0 8px;font-size:31px;letter-spacing:-.045em}.mc-paywall p{margin:0;color:#929baa;font-size:11px;line-height:1.6}.mc-paywall-price{display:flex;align-items:baseline;gap:5px;margin:22px 0 15px}.mc-paywall-price strong{font-size:36px}.mc-paywall-price span{color:#788493;font-size:10px}.mc-paywall-points{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px}.mc-paywall-points span{padding:9px 10px;border:1px solid #272e38;border-radius:10px;color:#aeb8c4;background:#0d1117;font-size:8px}.mc-paywall-actions{display:flex;gap:8px}.mc-paywall-actions>*{flex:1;text-align:center}@media(max-width:500px){.mc-paywall-points{grid-template-columns:1fr}.mc-paywall-actions{flex-direction:column}}`}</style>
    </div>
  );
}
