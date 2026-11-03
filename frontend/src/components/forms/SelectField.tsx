import { useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { Field } from "./Field";
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
type Props = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value" | "children" | "className"
> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  className?: string;
};
export function SelectField({
  id: suppliedId,
  label,
  value,
  onValueChange,
  options,
  error,
  placeholder,
  className,
  ...selectProps
}: Props) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  return (
    <Field id={id} label={label} error={error} className={className}>
      <select
        {...selectProps}
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : selectProps["aria-describedby"]
        }
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
