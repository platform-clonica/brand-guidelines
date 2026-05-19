/* SVG cubic-bezier visualisation.
   Receives the four control points and draws the curve over a unit square
   with reference grid, linear diagonal and the two handles. */

type Props = {
  curve: readonly [number, number, number, number];
  className?: string;
};

export function EasingCurve({ curve, className }: Props) {
  const [x1, y1, x2, y2] = curve;
  // SVG Y axis is inverted (top = 0, bottom = 100).
  const cx1 = x1 * 100;
  const cy1 = 100 - y1 * 100;
  const cx2 = x2 * 100;
  const cy2 = 100 - y2 * 100;

  return (
    <svg
      viewBox="-6 -6 112 112"
      className={className}
      role="img"
      aria-hidden
    >
      {/* Outer bounding box */}
      <rect x="0" y="0" width="100" height="100" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.5" />

      {/* Linear reference diagonal */}
      <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" strokeDasharray="2 2" />

      {/* Control handles */}
      <line x1="0" y1="100" x2={cx1} y2={cy1} stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.5" />
      <line x1="100" y1="0" x2={cx2} y2={cy2} stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.5" />

      {/* The curve itself */}
      <path
        d={`M 0 100 C ${cx1} ${cy1}, ${cx2} ${cy2}, 100 0`}
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />

      {/* Endpoints */}
      <circle cx="0" cy="100" r="1.5" fill="currentColor" />
      <circle cx="100" cy="0" r="1.5" fill="currentColor" />

      {/* Control points */}
      <circle cx={cx1} cy={cy1} r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx={cx2} cy={cy2} r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
