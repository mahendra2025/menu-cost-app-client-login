import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="page-shell center-screen">
      <section className="login-card hero-login">
        <div className="app-mark">MC</div>
        <p className="eyebrow">CaterersOS Mini Product</p>
        <h1>Menu Cost App</h1>
        <p>Upload menu, edit dishes, calculate per plate cost, print PDF, and manage profile.</p>
        <Link href="/login" className="primary-button full">Open Login</Link>
      </section>
    </main>
  );
}
