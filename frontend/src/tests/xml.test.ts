// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseFile, parseText } from "../services/parser";
const xml = readFileSync(resolve("public/examples/safra_algodao.xml"), "utf8");
describe("Importação XML", () => {
  it("lê a base XML de 300 registros com números tipados", () => {
    const rows = parseText(xml, "xml");
    expect(rows).toHaveLength(300);
    expect(typeof rows[0].ph_solo).toBe("number");
  });
  it("rejeita documentos malformados, DTD, atributos e filhos aninhados", () => {
    expect(() => parseText("<talhoes><talhao></talhoes>", "xml")).toThrow(
      "XML inválido",
    );
    expect(() =>
      parseText('<!DOCTYPE talhoes [<!ENTITY x "value">]>' + xml, "xml"),
    ).toThrow("DTD");
    expect(() =>
      parseText(xml.replace("<talhoes>", '<talhoes extra="1">'), "xml"),
    ).toThrow();
    expect(() =>
      parseText(
        xml.replace(
          /<ph_solo>[^<]+<\/ph_solo>/,
          "<ph_solo><valor>6.1</valor></ph_solo>",
        ),
        "xml",
      ),
    ).toThrow("aninhados");
  });
  it("rejeita campos duplicados e arquivos maiores que o limite", async () => {
    expect(() =>
      parseText(xml.replace("<talhao>", "<talhao><ph_solo>6</ph_solo>"), "xml"),
    ).toThrow("repetidos");
    await expect(
      parseFile(new File([new Uint8Array(2 * 1024 * 1024 + 1)], "grande.xml")),
    ).rejects.toThrow("2 MB");
  });
});
