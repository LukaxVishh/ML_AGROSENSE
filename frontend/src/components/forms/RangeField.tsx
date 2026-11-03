import { useId } from "react";
import { format } from "../../lib/domain";
export function RangeField({
  label,
  value,
  onValueChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const id = useId();
  return (
    <div className="slider-label">
      <label htmlFor={id}>
        {label}
        <strong>{format(value)}</strong>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
      />
      <small>
        {min}
        <span>{max}</span>
      </small>
    </div>
  );
}
