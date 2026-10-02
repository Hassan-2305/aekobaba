// Line icons drawn on a 24px grid at a 1.5px stroke — the same weight as the
// hairlines that structure the layout, so icons read as part of the drawing.

type IconProps = { className?: string; size?: number };

function Svg({ className, size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Diagonal "open" arrow — used inside the corner box on catalog objects. */
export function ArrowCorner(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17 17 7M9 7h8v8" />
    </Svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </Svg>
  );
}

/** Verification tick inside a square — the platform's "checked" mark. */
export function VerifiedMark({ className, size = 14 }: IconProps) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" className={className}>
      <rect x="0.5" y="0.5" width="15" height="15" fill="currentColor" />
      <path d="m4.2 8.2 2.5 2.4 5-5.2" fill="none" stroke="var(--on-orange)" strokeWidth="1.8" />
    </svg>
  );
}

export function CrateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 8.5 12 4l8.5 4.5v8L12 21l-8.5-4.5z" />
      <path d="M3.5 8.5 12 13l8.5-4.5M12 13v8" />
    </Svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}
