/**
 * Animated "Generating" loader — rotating conic glow ring with staggered
 * letter animation. Shown while the agent team is actively building.
 */
export default function GeneratingLoader({ label = 'Generating' }: { label?: string }) {
  const letters = label.split('');
  return (
    <div className="gen-loader-wrapper">
      {letters.map((ch, i) => (
        <span key={i} className="gen-loader-letter">{ch === ' ' ? '\u00A0' : ch}</span>
      ))}
      <div className="gen-loader" />
    </div>
  );
}
