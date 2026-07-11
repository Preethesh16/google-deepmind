/**
 * Processing indicator — a restrained conic halo with a pulsing core.
 * Reads as an engineering "working" state rather than a decorative spinner.
 */
export default function GeneratingLoader({ label = 'Processing' }: { label?: string }) {
  return (
    <div className="halo">
      <div style={{
        width: 62, height: 62, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-2)', border: '1px solid var(--line)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--accent)',
        }} className="shimmer">{label}</span>
      </div>
    </div>
  );
}
