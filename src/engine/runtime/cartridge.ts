import { validateFields } from "./settings-validation";
import type { GameDefinition } from "@/engine/contracts/cartridge";
import { Session } from "./session";
import type { Game, GameState } from "@/engine/contracts/game";
import type {
  SettingsErrors,
  SettingsValues,
} from "@/engine/contracts/settings";
import {
  configureGame,
  validateConfiguration,
} from "./cartridge/configuration";
import type { ActiveGame, Cartridge } from "./cartridge/types";

export { configureGame } from "./cartridge/configuration";
export type { ActiveGame, Cartridge } from "./cartridge/types";

/** A host-facing adapter; closures keep each definition's state/options/actions paired. */
export function createCartridge<
  S extends GameState,
  C extends object,
  A extends string,
>(definition: GameDefinition<S, C, A>): Cartridge {
  const normalize = (raw: unknown): Readonly<C> =>
    Object.freeze({ ...definition.settings.normalize(raw) });
  let settings = normalize(undefined);
  const buildRules = (options: Readonly<C>) => {
    const configured = configureGame(definition, options);
    validateConfiguration(configured, definition.metadata.id);
    return configured;
  };
  let rules = buildRules(settings);
  const validateDraft = (draft: Readonly<SettingsValues>): SettingsErrors => ({
    ...validateFields(definition.settings.fields, draft),
    ...definition.settings.validate(draft),
  });
  const sessions = new WeakSet<Session<S, A>>();
  function present(session: Session<S, A>): ActiveGame {
    sessions.add(session);
    return {
      session: session as unknown as Session<GameState, string>,
      restore(snapshot) {
        const state = definition.persistence.decode(
          snapshot.state,
          definition.persistence.version,
        );
        if (!state || !isCompatible(state)) return false;
        session.restore({ ...snapshot, state });
        return true;
      },
      draw(ctx, frame) {
        rules.render(ctx, session.state, {
          ...frame,
          mode: session.mode,
          paused: session.paused,
          recovery: session.recoveryFrame(),
        });
      },
      metrics: () => rules.metrics(session.state),
    };
  }
  const isCompatible = (state: S) =>
    definition.persistence.compatible?.(state, settings) ?? true;
  const settingsValues = (value: Readonly<C>) =>
    ({ ...value }) as SettingsValues;
  return {
    ...definition.metadata,
    get rules() {
      return rules as unknown as Game<GameState, string>;
    },
    get values() {
      return settingsValues(settings);
    },
    fields: definition.settings.fields,
    presets: definition.settings.presets ?? [],
    presetsLabel: definition.settings.presetsLabel ?? "Presets",
    stateVersion: definition.persistence.version,
    normalize: (raw) => settingsValues(normalize(raw)),
    validate: validateDraft,
    initialize(raw) {
      const next = normalize(raw);
      const configured = buildRules(next);
      settings = next;
      rules = configured;
    },
    decode: (raw, version) =>
      version <= definition.persistence.version
        ? definition.persistence.decode(raw, version)
        : null,
    compatible: (state) => {
      const decoded = definition.persistence.decode(
        state,
        definition.persistence.version,
      );
      return decoded !== null && isCompatible(decoded);
    },
    start: (seed) => present(new Session(rules, seed)),
    apply(active, draft) {
      if (!sessions.has(active.session as unknown as Session<S, A>))
        throw new Error("Different cartridge session");
      if (Object.keys(validateDraft(draft)).length)
        throw new Error("Invalid settings draft");
      const next = normalize(draft);
      const effect = definition.settings.effect(settings, next);
      if (effect === "none") return active;
      const configured = buildRules(next);
      const currentSession = active.session as unknown as Session<S, A>;
      const stable = currentSession.snapshot();
      if (effect === "presentation") {
        settings = next;
        rules = configured;
        currentSession.game = {
          ...currentSession.game,
          render: configured.render,
          labels: configured.labels,
          boardLabel: configured.boardLabel,
        };
        return present(currentSession);
      }
      if (
        effect === "rules" &&
        definition.persistence.compatible &&
        !definition.persistence.compatible(stable.state, next)
      )
        throw new Error("Rules change requires a compatible state");
      const replacement = new Session(
        configured,
        stable.seed,
        effect === "rules" ? stable.state : undefined,
      );
      if (effect === "rules") {
        replacement.restore(stable);
      } else {
        replacement.mode = stable.mode;
        replacement.setSpeed(stable.autoSpeed ?? stable.speed);
      }
      settings = next;
      rules = configured;
      return present(replacement);
    },
  };
}
