import type { GameDefinition } from "@/engine/contracts/cartridge";
import type { GameState } from "@/engine/contracts/game";
import { createCartridge, type Cartridge } from "./cartridge";

/** Validate every tuple member before erasing the heterogeneous type parameters. */
type Checked<T> =
  T extends GameDefinition<infer S, infer C, infer A>
    ? GameDefinition<S, C, A>
    : never;
export function createRegistry<const T extends readonly unknown[]>(
  definitions: T & { readonly [K in keyof T]: Checked<T[K]> },
): Cartridge[] {
  const ids = new Set<string>();
  return definitions.map((definition) => {
    // The sole registry boundary; concrete definitions were checked above.
    const typed = definition as unknown as GameDefinition<
      GameState,
      object,
      string
    >;
    if (ids.has(typed.metadata.id))
      throw new Error(`Duplicate game id: ${typed.metadata.id}`);
    ids.add(typed.metadata.id);
    return createCartridge(typed);
  });
}
