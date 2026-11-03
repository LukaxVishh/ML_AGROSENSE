import Papa from "papaparse";
import { columns, validateRecords } from "../lib/domain";
import type { TalhaoRecord } from "../types";
const numbers = new Set([
  "latitude",
  "longitude",
  "area_hectares",
  "precipitacao_mm",
  "temperatura_media",
  "umidade_solo_pct",
  "ph_solo",
  "teor_argila_pct",
  "produtividade_sc_ha",
]);
function convert(rows: Record<string, unknown>[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        numbers.has(key) && typeof value === "string" && value.trim() !== ""
          ? Number(value.trim())
          : value,
      ]),
    ),
  );
}
export function parseText(text: string, extension: string): TalhaoRecord[] {
  let rows: unknown;
  if (extension === "json") {
    try {
      rows = JSON.parse(text);
    } catch {
      throw new Error("JSON malformado. Envie um array de registros.");
    }
  } else if (extension === "csv") {
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
    });
    if (parsed.errors.length)
      throw new Error(`CSV inválido: ${parsed.errors[0].message}`);
    const headers = parsed.meta.fields || [];
    if (
      new Set(headers).size !== headers.length ||
      columns.some((c) => !headers.includes(c))
    )
      throw new Error(
        "CSV sem as 13 colunas obrigatórias ou com cabeçalhos duplicados.",
      );
    rows = convert(parsed.data);
  } else if (extension === "xml") {
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
      throw new Error("XML com DTD ou entidades não é aceito.");
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (
      doc.querySelector("parsererror") ||
      doc.documentElement.tagName !== "talhoes" ||
      doc.documentElement.attributes.length > 0
    )
      throw new Error("XML inválido. Use a raiz <talhoes> com nós <talhao>.");
    rows = convert(
      Array.from(doc.documentElement.children).map((node) => {
        if (node.tagName !== "talhao")
          throw new Error("XML contém um elemento inesperado.");
        if (
          node.attributes.length ||
          Array.from(node.children).some(
            (child) => child.children.length || child.attributes.length,
          )
        )
          throw new Error(
            "XML deve conter campos simples, sem atributos ou elementos aninhados.",
          );
        const keys = Array.from(node.children).map((n) => n.tagName);
        if (new Set(keys).size !== keys.length)
          throw new Error("XML contém campos repetidos.");
        return Object.fromEntries(
          Array.from(node.children).map((n) => [
            n.tagName,
            n.textContent?.trim() || "",
          ]),
        );
      }),
    );
  } else throw new Error("Formato não aceito. Use CSV, JSON ou XML.");
  if (!Array.isArray(rows))
    throw new Error("A estrutura deve conter uma lista de registros.");
  return validateRecords(rows);
}
export async function parseFile(file: File) {
  if (file.size > 2 * 1024 * 1024)
    throw new Error("O arquivo excede o limite de 2 MB.");
  return parseText(
    await file.text(),
    file.name.split(".").pop()?.toLowerCase() || "",
  );
}
