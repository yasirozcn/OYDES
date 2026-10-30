// CSV okuma (öğrenci toplu ekleme). Türkçe Excel ";" ile, diğerleri "," ile kaydeder; ayraç ilk satırdan anlaşılır.
// Tırnaklı alanlar ("Yılmaz; Ali", içinde "" kaçışı) ve dosya başındaki BOM desteklenir. Boş satırlar atlanır.

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const firstLine = input.slice(0, input.search(/\r?\n|$/));
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ""));
}
