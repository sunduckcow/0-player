/** Catalog numbers stay stable when the visible list is filtered. */
export function gameShortcut(key: string, code = ""): number | null {
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(code)?.[1] ?? key;
  return /^[1-9]$/.test(digit) ? Number(digit) - 1 : null;
}

function nextRowIndex(index: number, count: number, width: number) {
  if (index + width < count) return index + width;
  const lastRowStart = Math.floor((count - 1) / width) * width;
  return index < lastRowStart ? count - 1 : 0;
}

export function nextGameIndex(
  index: number,
  key: string,
  count: number,
  columns: number,
): number {
  if (count === 0) return -1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (!key.startsWith("Arrow")) return index;
  if (index < 0)
    return key === "ArrowUp" || key === "ArrowLeft" ? count - 1 : 0;
  const width = count <= columns ? 1 : Math.max(1, columns);
  switch (key) {
    case "ArrowLeft":
      return (index - 1 + count) % count;
    case "ArrowRight":
      return (index + 1) % count;
    case "ArrowUp":
      return index < width ? count - 1 : index - width;
    case "ArrowDown":
      return nextRowIndex(index, count, width);
    default:
      return index;
  }
}

export function shouldIgnoreLibraryKey(event: KeyboardEvent) {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  );
}

export function isLibraryNavigationKey(key: string, inSearch: boolean) {
  const arrowKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
    key,
  );
  const cardBoundaryKey = !inSearch && ["Home", "End"].includes(key);
  return arrowKey || cardBoundaryKey;
}
