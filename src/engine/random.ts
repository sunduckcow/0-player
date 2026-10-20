/** Explicit PRNG state makes replays independent of time and rendering. */
export function random(seed: number): [number, number] {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}

/** Mix round seeds so neighboring rounds don't share the LCG's first draws. */
export function nextSeed(seed: number): number {
  let value = ((seed >>> 0) + 0x9e3779b9) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  const mixed = (value ^ (value >>> 16)) >>> 0;
  return mixed === (seed >>> 0) ? (seed + 1) >>> 0 : mixed;
}
