export default function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="stat-card">
      <small>{label}</small>
      <strong>{value}</strong>
      {note ? <span>{note}</span> : null}
    </div>
  );
}
