const rgb = (hex: string) =>
  hex
    .slice(1)
    .match(/../g)!
    .map((part) => parseInt(part, 16) / 255);
const luminance = (hex: string) =>
  rgb(hex)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!,
      0,
    );
const contrast = (first: string, second: string) => {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
};
export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export function hsl(hex: string): HslColor {
  const [red, green, blue] = rgb(hex) as [number, number, number];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 100;
  if (delta) {
    let sector = (red - green) / delta + 4;
    if (max === red) sector = (green - blue) / delta;
    else if (max === green) sector = (blue - red) / delta + 2;
    hue = (sector * 60 + 360) % 360;
  }
  return {
    h: hue,
    s: delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0,
    l: lightness,
  };
}
export function hex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  return (
    "#" +
    [0, 8, 4]
      .map((offset) => {
        const k = (offset + h / 30) % 12;
        return Math.round(
          (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255,
        )
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}
export function readable(
  h: number,
  s: number,
  start: number,
  backgrounds: string[],
  light: boolean,
  minimum = 4.5,
) {
  let l = start;
  for (let step = 0; step <= 100; step++) {
    const color = hex(h, s, l);
    if (
      backgrounds.every((background) => contrast(color, background) >= minimum)
    )
      return color;
    l = Math.max(0, Math.min(1, l + (light ? -0.01 : 0.01)));
  }
  return light ? "#000000" : "#ffffff";
}
export const mix = (first: string, second: string, amount: number) =>
  "#" +
  rgb(first)
    .map((value, index) =>
      Math.round((value * amount + rgb(second)[index]! * (1 - amount)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
