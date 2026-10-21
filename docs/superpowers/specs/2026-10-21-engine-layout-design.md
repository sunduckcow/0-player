# Engine filesystem layout

Дата: 2026-10-21. Продолжение согласованной SDK-архитектуры. Пользователь попросил разделить уровни абстракции и основные модули с утилитами; ранее разрешил реализацию без дальнейших согласований. Работа локальная, без commit/push/publication.

## Выбор

1. Только подпапки в engine: минимальный перенос, но browser UI/storage останутся россыпью в src.
2. Полный FSD: его стандартизованные app/pages/widgets/features/entities/shared полезны продуктовым фронтендам, но не выражают напрямую контракт/исполнитель/картридж. Пустые уровни не нужны.
3. **Модульная структура app / engine / games с направленными зависимостями.** Выбрана: соответствует уже существующим границам SDK, сохраняет текущие интерфейсы и поведение. Из FSD берём явные границы и публичную точку входа, не называем собственные слои FSD.

Справка о FSD: https://feature-sliced.design/docs/reference/layers.

## Дерево и ответственность

- src/main.ts — минимальная точка входа Vite.
- src/app/bootstrap.ts — сборка browser workspace и жизненного цикла; src/app/catalog.ts — единственное место регистрации конкретных картриджей.
- src/engine/sdk.ts — стабильный публичный API игры.
- engine/contracts — только декларации game/settings/cartridge/visuals; без runtime, DOM и исполняемых значений.
- engine/runtime — Session, адаптер defineGame, проверка настроек и recovery. Не знает browser/UI.
- engine/input — объявления/проверка команд и keyboard adapter; input/lib — нормализация клавиш.
- engine/rendering — Canvas helpers, feedback, frozen fallback visuals. Не знает DOM-оболочки.
- engine/theme — чистый resolver темы; theme/lib/color.ts — цветовая математика.
- engine/platform — localStorage и применение темы к document; browser side effects отделены от resolver.
- engine/ui — controls, library, settings; отдельно primitives, styles, icons и небольшие UI helpers. Формы/виджеты не лежат среди ядра. Настройки разделены на dialog, schema fields и media subscription.
- engine/lib — только чистые низкоуровневые алгоритмы без browser/runtime; сейчас PRNG.
- games/<id> — существующие самодостаточные картриджи, только SDK и собственные файлы.
- tests/architecture — source boundary checks и их helpers; tests/integration — проверки с реальными играми. Unit-тесты остаются рядом со своими модулями.

Не создаём shared/helpers/utils общего назначения и barrel-файлы на каждой подпапке. Существующий шадцн utility имеет узкую UI-зону. Удаляем только неиспользуемый compatibility re-export games/recovery.ts, не правила/ИИ.

## Направление зависимостей

Contracts и lib — основание. Runtime использует contracts/input/lib; rendering и theme — contracts и локальные helpers. Input — contracts и локальную нормализацию, не runtime/UI. Platform — runtime/contracts/theme. UI — engine services/primitives; не app и не games. App связывает все части; только catalog импортирует concrete game definitions. Игры импортируют только @/engine/sdk. Внутренние engine-модули не импортируют собственный public barrel.

Типы GameDefinition/StateCodec отделяются от реализации defineGame. Типы VisualTheme отделяются от fallback values, схемы настроек — от validateFields. Это устраняет обратные зависимости, а не только меняет имена директорий.

## Инварианты и доказательство

- @/engine/sdk и все его существующие экспорты сохраняются. Settings/control/state API, seeds и localStorage keys/envelopes неизменны.
- Шадцн aliases, Tailwind @source и CSS imports указывают на новые пути; сгенерированные primitives не переписываются.
- Архитектурные тесты обходят все исходники рекурсивно, проверяют зависимости, экспортные/type/dynamic импорты и циклы; отрицательные fixtures доказывают работоспособность проверок.
- bun run check, production build (один автономный index.html), desktop/mobile smoke, настройки/переключение обеих игр без ошибок.
- README, architecture/SDK guide и скилл создания игры обновлены. Старые design/planning документы — история, не текущая карта кода.
