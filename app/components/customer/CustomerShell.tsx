import Link from 'next/link';
import type { ReactNode } from 'react';

const steps = ['Event', 'Menu', 'Service', 'Estimate'];

export default function CustomerShell({ step, children }: { step: number; children: ReactNode }) {
  return (
    <main className="customer-page">
      <header className="customer-header">
        <Link className="customer-brand" href="/" aria-label="Menu Cost home"><span>MC</span><b>Menu Cost</b></Link>
        <Link className="customer-login-link" href="/login">Caterer Login</Link>
      </header>
      <nav className="customer-progress" aria-label="Planning progress">
        {steps.map((label, index) => <div className={index + 1 <= step ? 'is-current' : ''} key={label}><span>{index + 1}</span><small>{label}</small></div>)}
      </nav>
      {children}
      <footer className="customer-footer">An instant planning estimate. Your final quote may vary after venue review.</footer>
    </main>
  );
}
