# Интеграция и проверка картриджа

1. Создай папку games/<id>: index.ts — plain default-объект определения (без вызовов фабрик) с небольшими callbacks и явным связыванием модулей. Модель/нулевой шаблон — types.ts/state.ts, геометрия — board.ts, симуляция — logic.ts, ИИ — ai.ts или ai/, отрисовка — render.ts, схема — settings.ts, сохранения — persistence.ts, действия — controls.ts. Для небольшой игры лишние файлы не нужны. Каждый локальный runtime-модуль поставляет один default-объект, type-only exports допустимы; маленькие helpers приватны, крупные самостоятельные алгоритмы вынесены отдельно. Внутренние файлы не импортируют собственный index.ts. Импортируй общие функции/типы только из @/engine/sdk, а предметные — из своей папки.
2. Definition задаёт metadata (id/title/description/icon), readonly defaultState, settings (normalize/validate/fields/effect/presets), persistence (version/decode/compatible), optional pure initialize(state,seed,settings) и configure. Runtime создаёт только engine createRegistry; текущие state/settings не хранятся в игре. Полный пример — [SDK](../../../../docs/engine-sdk.md).
3. В src/app/catalog.ts добавь `import game from "@/games/<id>"` и объект `game` в массив catalog. Не вызывай фабрику и не импортируй отдельные definition/settings/render файлы в каталоге. Порядок свободный; фиксированных Snake/Tetris индексов больше нет. Не меняй app/bootstrap.ts, engine/platform/storage.ts, engine/ui/settings или theme resolver ради регистрации.
4. Codec принимает недоверенный JSON и возвращает валидное state либо null; новые state-версии не принимаются молча. Legacy envelope v1 читается движком как stateVersion 1. Совместимость с параметрами проверяет игра, а не host.
5. Валидируй весь raw draft до normalize. Effect presentation сохраняет Session и историю; rules сохраняет полный стабильный snapshot и сбрасывает устаревшую историю; restart создаёт совместимый board. Проверяй обе ветки recovery при Apply.
6. Render/preview используют injected visuals и motion. Никаких DOM/CSS/theme/RGB внутри картриджа. Preview использует минимальную геометрию, а не искусственный игровой State с score/rng/over; он не заменяет defaultState. Он получает статический engine frame и собственную backing surface; шрифт/масштаб подписей принадлежат оболочке.

## Проверки

Тесты конкретного модуля размещай в соседней папке `__tests__`, например `games/<id>/__tests__/logic.test.ts`. В `src/tests` остаются только общие архитектурные и межмодульные интеграционные проверки.

- Владение: два engine registry из одного каталога не делят state/settings; defaultState не мутирует, новые партии получают глубокие копии. Инициализатор вызывается только на новую партию, rules/presentation/restore не перегенерируют state.
- Чистые правила: immutable вложенные структуры, одинаковые результаты по seed/действиям/режимам; случайность сериализована.
- AI: обычные action-id, ограниченный поиск, продолжение после человека и JSON restore. Поражение/победа корректно различаются.
- Действия: собственные id, повторы, reserved keys, role conflicts, одинаковое выполнение touch/keyboard/AI. Пауза/ИИ/рестарт не появляются в pad.
- Настройки: invalid/empty number drafts, все presets/custom, Cancel/Escape, none/presentation/rules/restart, storage unavailable, невалидные и старые saves.
- Render: два injected VisualTheme без загрязнения, все нужные semantic/category tokens, live reduced motion, preview redraw, labels aligned.
- Recovery: история immutable, bounded safety checks, видимые состояния назад, pause/restart, сохранение во время target/fallback с согласованными seed/round. Без истории после reload допустима новая партия.
- Browser: desktop/focus/mobile, portrait и короткий landscape, переключение игр без потери сохранённого state, одинаковые координаты системной панели, takeover не двигает поле.
- bun run check; bun run build; dist содержит только автономный index.html. Не коммитить/пушить/публиковать без запроса.

Архитектурные тесты tests/architecture/ проверяют импортные границы и обходы визуального SDK; engine/runtime/__tests__/cartridge.test.ts содержит тестовую третью игру с собственными действиями и state без rng. Не добавляй её в пользовательский каталог.
