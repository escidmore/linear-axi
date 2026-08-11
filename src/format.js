import { encode } from "@toon-format/toon";

export function renderToon(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return `${encode(value)}\n`;
  return `${Object.entries(value).map(([key, item]) => {
    if (key !== "help" || !Array.isArray(item)) return encode({ [key]: item });
    return `help[${item.length}]:\n${item.map((hint) => `  ${String(hint).replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}`).join("\n")}`;
  }).join("\n")}\n`;
}
