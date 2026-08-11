import { encode } from "@toon-format/toon";

export function renderToon(value) {
  return `${encode(value)}\n`;
}
