# SDK движка 0-player

Карта файлов и направление зависимостей: [architecture.md](architecture.md).

Публичная граница картриджей — `src/engine/sdk.ts`. Каталог `src/app/catalog.ts` содержит только регистрацию. Все файлы `src/games/<id>/` используют SDK и собственные модули; оболочка, storage и форма настроек не импортируют игры.

## Кто чем управляет

| Движок                                                           | Игра                                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Один цикл кадров, фиксированные тики, очередь ввода, ½×/1×/2×/4× | Базовый tickMs и чистый update                                  |
| Пауза, автопилот, рестарт, скорость, диалоги и focus             | Собственные action-id, клавиши, названия и семантические роли   |
| Владение вводом и момент вызова ИИ                               | Чистый ai(state), возвращающий обычное игровое действие         |
| Системная панель, touch-pad, keycaps, адаптивность               | Декларации действий без координат, JSX и CSS                    |
| Generic shadcn-форма, черновик и применение настроек             | Схема, нормализация, валидация и эффект изменения               |
| Конверт localStorage, ограничения, fallback                      | Кодек состояния и проверка совместимости с параметрами          |
| История, бюджет спасения и время отката                          | Признаки победы/проигрыша и проверка безопасной позиции         |
| Тема, контраст, акцент, secondary, categorical и эффекты         | Геометрия объектов и выбор семантических токенов                |
| Подписи и типографика, Canvas scaling, превью lifecycle          | Текст и логические координаты подписей; чистое рисование превью |

## Регистрация и владение состоянием

`games/<id>/index.ts` экспортирует **обычный объект определения**, а не созданный экземпляр игры. `satisfies GameDefinition<State, Settings, Action>` проверяет связку типов и ничего не исполняет. Настройки плоские: string/number/boolean; Action — собственный строковый union.

```ts
import type { GameDefinition, GameState } from "@/engine/sdk";

interface Counter extends GameState {
  score: number;
  over: boolean;
}
type Options = { step: number };
type Action = "jump";

export default {
  metadata: {
    id: "counter",
    title: "Counter",
    description: "A test.",
    icon: "gamepad",
  },
  defaultState: { score: 0, over: false },
  settings: {
    normalize(raw: unknown) {
      const value = raw as Partial<Options> | null;
      return { step: Number(value?.step) > 0 ? Number(value!.step) : 1 };
    },
    validate(draft) {
      const errors: Record<string, string> = {};
      if (!Number.isInteger(Number(draft.step)) || Number(draft.step) < 1)
        errors.step = "Choose a positive integer.";
      return errors;
    },
    fields: [
      { key: "step", kind: "number", label: "Step", min: 1, max: 10, step: 1 },
    ],
    effect: (before, after) => (before.step === after.step ? "none" : "rules"),
  },
  persistence: {
    version: 1,
    decode(raw: unknown, version: number) {
      const value = raw as Counter | null;
      return version === 1 &&
        value &&
        Number.isInteger(value.score) &&
        value.score >= 0 &&
        typeof value.over === "boolean"
        ? value
        : null;
    },
  },
  configure(options) {
    return {
      strategy: "Jump at each tick.",
      width: 200,
      height: 200,
      tickMs: 100,
      controls: [
        {
          action: "jump",
          role: "primary",
          keys: ["j"],
          label: "Jump",
          symbol: "↑",
        },
      ],
      update: (state, action) =>
        action === "jump"
          ? { ...state, score: state.score + options.step }
          : state,
      ai: () => "jump",
      render(ctx, state, frame) {
        ctx.fillStyle = frame.visuals.background;
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = frame.visuals.accent;
        ctx.fillRect(state.score % 180, 90, 20, 20);
      },
      metrics: (state) => [{ label: "Jumps", value: state.score }],
    };
  },
} satisfies GameDefinition<Counter, Options, Action>;
```

Counter — пример API, не новая игра коллекции. Реальные примеры: `games/snake/index.ts` и `games/tetris/index.ts`. Небольшие callbacks остаются в объекте определения. Крупные задачи разделены на types/state/board/logic/ai/render/settings/persistence/controls; Snake отдельно имеет preview и несколько алгоритмов поиска. Каждый предметный модуль экспортирует один runtime-объект, типы — через type-only exports:

```ts
import logic from "./logic";
import rendering from "./render";
import type { State, Options } from "./types";

// Внутри literal default definition:
// initialize: logic.initialize
// configure(options) { return { update: logic.update, render: rendering.draw, ... }; }
```

Мелкие helpers приватны внутри модуля; отдельный файл нужен для самостоятельной ответственности, а не каждой функции. Внутренние файлы не импортируют собственный index. [Карта модулей](architecture.md) объясняет их границы.

Каталог содержит только данные:

```ts
import snake from "@/games/snake";
import tetris from "@/games/tetris";
export const catalog = [snake, tetris] as const;
```

В `app/bootstrap.ts` движок один раз вызывает `createRegistry(catalog)` и получает собственные runtime-экземпляры. Ни каталог, ни игры не создают их. В runtime остаются текущие settings, правила, Session и state. Разные registry из одного массива изолированы; duplicate id отклоняется. Проверка generic-параметров каждого элемента происходит до единственного гетерогенного cast внутри registry.

`defaultState` — JSON-сериализуемый deep-readonly шаблон нулевого состояния и его формы. Перед **каждой новой партией** движок глубоко копирует его. Если задан `initialize(state,seed,readonlySettings):S`, движок передаёт туда приватную копию; callback чисто возвращает начальное состояние, например seeded еду или мешок фигур. Без initialize новый state равен копии defaultState. Шаблон может быть нулевой формой, ещё не готовой к update: Snake заполняет пустое body, Tetris создаёт board/bag/piece при initialize. Готовый state обязан соблюдать игровой codec.

Start, restart и fallback используют один путь создания. Restore не вызывает initialize; rules переносит полный стабильный snapshot в новую Session без повторной генерации, presentation сохраняет прежнюю Session/историю/фазу. Настройки передаются callbacks как неизменяемый snapshot, их runtime-значения не записываются в definition. Сессия принадлежит своему runtime: применить настройки к чужой Session с тем же id нельзя.

## Контракт настроенных правил

`configure(readonlySettings): GameRules<S,A>` возвращает width/height логического Canvas, положительный конечный tickMs, strategy, controls и callbacks:

- `defaultState` и optional `initialize` находятся на уровне определения, а не в GameRules. Правила не создают и не хранят текущую Session. RNG необязателен, но случайность должна храниться в игровом state.
- `update(state, action|null, mode?): S` — неизменяемый шаг; mode равен auto/human. Прямые симуляции существующих игр по умолчанию используют auto.
- `ai(state): A|null` — чистое ограниченное по работе решение. ИИ использует те же действия, но не проходит ручной takeover dispatcher.
- `render(ctx,state,frame): void` — только изображение; frame содержит time, mode, paused, recovery, visuals и reducedMotion.
- `metrics(state)` — лёгкие метрики; HUD показывает первые две. Отдельно отображаются score и best.
- `boardLabel?` — подпись поля. `labels?` — текст, x/y в логических координатах и role caption/body. Размер и шрифт выбирает движок.
- `recovery?` — steps/durationMs и необязательные isLoss/canResume.

Не создавать обработчики, таймеры, свои requestAnimationFrame, DOM/React/CSS, запросы или скрытый state RNG. Для физики можно хранить дробные координаты и делать ограниченные подшаги внутри update. Один тик потребляет не более одного действия; held/release, pointer aim и одновременные команды пока не входят в SDK.

## Действия и общая панель

`GameControl<A>` содержит action, label, keys, необязательные role, symbol, shortLabel, group и repeat. role описывает смысл, а не положение UI. Без role действие остаётся доступно с клавиатуры/подсказки. repeat по умолчанию false; движок не угадывает его по action-id.

Движок располагает роли в 2×3: secondary / move-up или rotate / primary сверху, move-left / move-down / move-right снизу. При отдельных move-up и rotate поворот занимает свободный угол. Конфликт или превышение шести видимых ролей отклоняется. Незанятые ячейки не заполняются системными командами.

Пауза, рестарт, автопилот и скорость всегда в отдельной одинаковой панели, независимо от числа игровых действий. Нажатие touch-игровой кнопки снимает паузу и передаёт управление человеку; обычный клавиатурный input паузу не снимает. Автопилот идемпотентно возвращает ИИ, сохраняя поле и паузу. Во время recovery игровые действия/AI/speed заблокированы, Pause и Restart доступны.

Системные keys берутся из engine/input/actions.ts. A — ИИ, Space/P — пауза, R — рестарт, F — focus, G — библиотека, /? — справка; 1–9 и Escape также зарезервированы. Enter после завершения — отдельная engine-команда рестарта; в живой игре он работает только при явной игровой привязке. Никакого скрытого primary fallback нет. Системные и игровые inputs типизированы отдельными tagged variants. Физические русские раскладки, IME, поля и браузерные комбинации сохраняют нативное поведение.

## Настройки

`SettingsDefinition<C>`: normalize(unknown), validate(draft), fields, effect(previous,next), optional presets/presetsLabel. Поля boolean, choice и number. Choice имеет options с value/label/description и необязательным preview. Пресеты — подписанные патчи значений; Custom открывает соответствующие numeric fields. Форма не знает ни названий свойств игры, ни правил чётности/допустимости размеров.

Normalize защищает загрузку недоверенных значений; validate проверяет необработанный черновик до нормализации. Если валидатор принимает числовую строку, normalize тоже должен её корректно преобразовать. Пустые/невалидные поля нельзя молча округлять при Apply.

`effect` возвращает:

| Эффект       | Применение                                                                       |
| ------------ | -------------------------------------------------------------------------------- |
| none         | Тот же ActiveGame и Session                                                      |
| presentation | Тот же Session, состояние, очередь, история и текущий откат; новое представление |
| rules        | Новые правила/ИИ, полный стабильный snapshot; очищены очередь/история/откат      |
| restart      | Новый board с текущим seed, round 1, прежними mode/autoSpeed, без паузы          |

При rules во время fallback snapshot уже содержит seed/round следующей партии. Нельзя брать его state и накладывать старые метаданные. Обычный Restart выбирает новый смешанный seed, в отличие от resize. General theme/accent принадлежит движку, не входит в C и не пересоздаёт Session. Cancel/закрытие отбрасывает черновик.

Preview — синхронный `draw(ctx, readonlyValues, logicalBounds, frame): void`. Frame содержит frozen visuals и актуальный reducedMotion; движок назначает time=0, paused=true и mode=auto для статического примера. Он же создаёт Canvas, рисует его backing background, выбирает размеры и перерисовывает при изменении draft/theme/motion. Callback не получает DOM, Session или lifecycle hooks.

Для статического примера используй минимальную геометрию, а не объект игрового State со случайными score/rng/флагами. Snake preview содержит только сегменты и направление и вызывает общий renderer тела. defaultState — отдельный нулевой шаблон для engine initialize, а не изображение превью.

## Визуальный контекст

`frame.visuals` неизменяем целиком, включая categorical и effects. Роли: background/grid/text/muted, accent/accentMuted, secondary, categorical[0…6], effects.recovery/recoveryStrong/flash/highlight/highlightOpacity/ghostOpacity. Движок вычисляет CSS и SDK-палитру одним resolver. Secondary — hue+180°, скорректированный по контрасту; у серого акцента резервный hue=100°. Семь categorical-индексов стабильны между темами; игра сопоставляет им свои сущности.

Snake использует accent для головы, accentMuted для тела, secondary для яблока. Tetris сопоставляет I/J/L/O/S/T/Z индексам 0…6 для поля, текущей фигуры, ghost и preview. Игры не задают RGB/named CSS colors/gradient stops и не ветвятся по dark/light. Геометрия и выбор мигающих клеток принадлежат игре; tint/intensity/motion разрешают токены и SDK helpers.

`clear(ctx,w,h,visuals)`, `grid(ctx,x,y,columns,rows,cell,visuals)` получают явную тему. `recoveryIntensity(frame)`, `flashIntensity(progress,reducedMotion)` и `feedbackFlashMs` задают общую политику эффектов. Изменённые Canvas transform/alpha/clipping изолировать save/restore. Визуальный WeakMap-кэш допустим, но он не может менять симуляцию и должен корректно реагировать на новую партию/restore/recovery.

## Сохранения

`persistence.version`, `decode(raw,stateVersion):S|null`, optional `compatible(state,settings)` принадлежат игре. Codec проверяет все инварианты, нужные update/AI/render, и не доверяет JSON. При расширении state возможна миграция старой версии внутри decode; неизвестную новую версию отклонить.

Storage проверяет только конверт (максимум 200000 символов), mode, pause, seed/round и допустимую скорость. Текущий envelope v2 имеет gameId и stateVersion; прежний envelope v1 читается как stateVersion 1. Ключи `0-player:save:<id>`, `settings:<id>`, best и appearance сохранены. Несовместимое сохранение отбрасывается только для его игры, без очистки всего storage. При запрете storage игра продолжает работать.

## Session и восстановление

Session хранит текущий state и владеет advanceFrame/advance, takeControl/input, automate, togglePause, setSpeed, restart, snapshot/restore. Игровые callbacks его не получают. Браузер делает максимум один нормальный тик за кадр, давая обработать ввод; симулятор advance — максимум восемь. Скрытая вкладка не догоняет пропущенное время. Manual всегда 1×, auto использует общий multiplier и easing 350мс; reduced motion переключает мгновенно.

История хранит immutable состояния до живых тиков, максимум min(steps*4,240). Пример `recovery:{steps:8,durationMs:640,isLoss:s=>s.over&&!s.won,canResume:s=>canContinue(s,ai,update,16)}`. canContinue generic и поддерживает собственные action-id. Проверка жизнеспособности ограничена, не гарантирует вечной выживаемости.

Поражение держится первую пятую durationMs, затем реальные снимки идут назад. Пауза замораживает анимацию, рестарт отменяет её. После двух неудачных спасений/отсутствия истории начинается новая AI-партия. Победа может исключаться isLoss, но auto всё равно начнёт новую партию после терминального ожидания 1500мс. Snapshot во время отката содержит конечный target или fallback с согласованными seed/round; сама история не сохраняется. Restore очищает историю и старое время. Для turn-based игр steps означает тики: idle-тики также записываются; отдельной политики записи только значимых ходов пока нет. Пиксельной интерполяции между историческими состояниями нет.

## Проверка новой игры

`bun run check` и `bun run build`; результат — один offline HTML. Архитектурный тест проверяет границы импортов и запрет browser/theme/color обходов. Проверить immutable/deterministic правила, собственные action-id, codec corruption/старые версии, настройки каждого эффекта, продолжение после человека и JSON restore, ограничение тяжёлого поиска и recovery target/fallback. Browser QA проверяет обычный/focus/mobile виды и одинаковую системную панель. Не добавлять специальные ветки в host/storage/settings и не публиковать без запроса.

Не входят в SDK: ECS, сеть, аудио, worker search, asset loader, камера, общий physics solver, произвольные React widgets или недоверенный plugin sandbox. Если новая игра требует расширения, менять общий контракт с тестами, а не обходить его скрытым кодом картриджа.
