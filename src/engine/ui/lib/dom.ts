export const element = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
export const text = (id: string, value: string | number) => {
  const el = element(id);
  const next = String(value);
  if (el.textContent !== next) el.textContent = next;
};
