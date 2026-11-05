import { getEndlessEraHue } from "./endless";
// Room "eras": every 10 ascensions the equipped room theme is tinted to a new hue, reusing the
// existing art (machines keep their own colours). Era 5 (asc 50+, Endless) is the last.
const ERA_HUES = [0, 35, 80, 150, 215, 290] as const;

export const getAscensionEra = (totalAscensions: number): number =>
  Math.min(ERA_HUES.length - 1, Math.floor(Math.max(0, totalAscensions) / 10));

// v1.03: in Endless the hue keeps rotating every 5 depths (see endless.ts).
export const getAscensionEraHue = (totalAscensions: number): number => getEndlessEraHue(totalAscensions) ?? ERA_HUES[getAscensionEra(totalAscensions)];

const rotateRgb = (r: number, g: number, b: number, degrees: number): [number, number, number] => {
  // Standard hue-rotation matrix (same as CSS hue-rotate).
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const m = [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
  ];
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [
    clamp(r * m[0] + g * m[1] + b * m[2]),
    clamp(r * m[3] + g * m[4] + b * m[5]),
    clamp(r * m[6] + g * m[7] + b * m[8]),
  ];
};

export const shiftColorHue = (color: string, degrees: number): string => {
  if (!degrees) return color;
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    const [r, g, b] = rotateRgb((n >> 16) & 255, (n >> 8) & 255, n & 255, degrees);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }
  const rgba = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgba) {
    const [r, g, b] = rotateRgb(+rgba[1], +rgba[2], +rgba[3], degrees);
    return rgba[4] !== undefined ? `rgba(${r}, ${g}, ${b}, ${rgba[4]})` : `rgb(${r}, ${g}, ${b})`;
  }
  return color;
};

export const shiftThemeColorsForEra = <T extends Record<string, unknown>>(colors: T, totalAscensions: number): T => {
  const degrees = getAscensionEraHue(totalAscensions);
  if (!degrees) return colors;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(colors)) out[key] = typeof value === 'string' ? shiftColorHue(value, degrees) : value;
  return out as T;
};
