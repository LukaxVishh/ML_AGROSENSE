import { Search } from "lucide-react";
export function SearchField({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <label className="search-input">
      <Search size={15} />
      <input
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </label>
  );
}
