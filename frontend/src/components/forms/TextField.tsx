import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import { Field } from "./Field";
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
};
export function TextField({
  id: suppliedId,
  label,
  value,
  onValueChange,
  error,
  ...inputProps
}: Props) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  return (
    <Field id={id} label={label} error={error}>
      <input
        {...inputProps}
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : inputProps["aria-describedby"]
        }
      />
    </Field>
  );
}
