import { FileSpreadsheet } from "lucide-react";
const presets = [
  { value: "demo", label: "Base demonstrativa" },
  { value: "demo-soja", label: "Somente soja" },
  { value: "demo-milho", label: "Somente milho" },
  { value: "demo-algodao", label: "Somente algodão" },
  { value: "demo-empty", label: "Cenário: base vazia" },
];
export function DatasetSelector({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label className="dataset-select">
      <FileSpreadsheet size={14} />
      <select
        aria-label="Selecionar base demonstrativa"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {value === "upload" && (
          <option value="upload" disabled>
            Arquivo importado
          </option>
        )}
        {presets.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
