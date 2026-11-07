type Resolution = { width: number; height: number };

export function ResolutionControl({
  label = 'Resolution',
  width,
  height,
  disabled,
  onChange,
}: Resolution & {
  label?: string;
  disabled: boolean;
  onChange: (resolution: Resolution) => void;
}) {
  return (
    <label className="resolution-control">
      {label}
      <select
        aria-label={label}
        value={`${width}x${height}`}
        disabled={disabled}
        onChange={(event) => {
          const [nextWidth, nextHeight] = event.target.value.split('x').map(Number);
          onChange({ width: nextWidth, height: nextHeight });
        }}
      >
        {[[96, 60], [128, 80], [192, 120], [256, 160], [320, 200]].map(([w, h]) => (
          <option key={w} value={`${w}x${h}`}>
            {w} × {h} · {(w * h).toLocaleString()} cells
          </option>
        ))}
      </select>
    </label>
  );
}
