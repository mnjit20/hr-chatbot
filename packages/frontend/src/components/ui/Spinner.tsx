interface SpinnerProps {
  size?: 'sm' | 'md';
  label?: string;
}

export function Spinner({ size = 'sm', label = 'Loading...' }: SpinnerProps) {
  return (
    <span className={`spinner spinner--${size}`} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
    </span>
  );
}
