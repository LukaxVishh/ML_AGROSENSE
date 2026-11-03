import type { Key, ReactNode } from "react";
import { ArrowUpDown } from "lucide-react";
export interface TableColumn<Row> {
  id: string;
  label: string;
  render: (row: Row) => ReactNode;
  sortKey?: keyof Row;
}
interface Props<Row> {
  rows: Row[];
  columns: TableColumn<Row>[];
  rowKey: (row: Row) => Key;
  caption: string;
  className?: string;
  sort?: { key: keyof Row; asc: boolean };
  onSort?: (key: keyof Row) => void;
}
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  caption,
  className = "",
  sort,
  onSort,
}: Props<Row>) {
  return (
    <div className={`table-scroll ${className}`}>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={
                  column.sortKey && sort
                    ? sort.key === column.sortKey
                      ? sort.asc
                        ? "ascending"
                        : "descending"
                      : "none"
                    : undefined
                }
              >
                {onSort && column.sortKey ? (
                  <button
                    className="sort-button"
                    onClick={() => onSort(column.sortKey!)}
                  >
                    {column.label}
                    <ArrowUpDown size={11} />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.id}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
