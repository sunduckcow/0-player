---
name: create-zero-player-game
description: Use when adding a game or changing a cartridge's rules, AI, semantic actions, renderer, settings, codecs or loss recovery in the 0-player project. Also for questions about its SDK. Not for unrelated apps or shell-only visual edits.
---

# Создание игр для 0-player

Игра — декларативный картридж. Движок владеет циклом, системными командами, UI, настройками, сохранениями, темой и восстановлением. Картридж предоставляет чистые правила, ИИ, геометрию и конфигурации и использует только публичный `@/engine/sdk`.

Перед работой найди корень по package.json и src/engine/sdk.ts. Прочитай [API](references/engine-api.md) и [интеграцию](references/integration.md). Источник истины — код SDK; полный поддерживаемый контракт находится в [docs/engine-sdk.md](../../../docs/engine-sdk.md).

Карта модулей: [docs/architecture.md](../../../docs/architecture.md). Контракты находятся в `engine/contracts`, исполнение в `engine/runtime`, UI в `engine/ui`; внутренности этих папок картридж не импортирует.

1. Определи правила, терминальные условия, счёт, действия и интересное поведение ИИ. Существенные неясности уточняй; рутинные решения принимай в рамках запроса.
2. Раздели состояние/update, ai и renderer. Из index.ts экспортируй plain объект `export default { metadata, defaultState, settings, persistence, initialize?, configure } satisfies GameDefinition<State,Options,Action>`. Не вызывай фабрику, defineGame или engine-конструктор. Короткие callbacks оставляй прямо в объекте. Крупные задачи разделяй на types.ts (типы), state.ts (нулевой шаблон), board.ts (геометрия), logic.ts, ai.ts или ai/, render.ts, settings.ts, persistence.ts, controls.ts. Это ориентиры ответственности, а не обязательные пустые файлы. Из каждого локального runtime-модуля импортируй один default-объект; типы — отдельным import type. Мелкие helpers держи приватными рядом с алгоритмом, самостоятельные крупные задачи выноси. Внутренние файлы не импортируют собственный index.ts. Примеры — games/snake/index.ts и games/tetris/index.ts.
3. Задай собственные action-id, label/keys/role/repeat; не задавай позиции, CSS, JSX или runtime-команды. Пауза, рестарт, автопилот и скорость не игровые действия. Форму строит движок из boolean/choice/number и preset patches.
4. Опиши нормализацию, валидацию и effect настроек: none/presentation/rules/restart. Валидатор и normalizer должны одинаково понимать принятые числовые строки. Codec проверяет внутренности state и совместимость с настройками; storage игры не знает.
5. Рисуй из frame.visuals/reducedMotion. Игра выбирает геометрию и цветовую роль, а не RGB, тему, шрифт или browser media. Preview — синхронный callback Canvas с draft/bounds/frame; не компонент UI. Статическую иллюстрацию задавай минимальной геометрией в preview.ts, не фабрикуй полный игровой State с score/rng/флагами. Она не является defaultState или текущей партией.
6. В src/app/catalog.ts добавь default import из @/games/<id> и сам объект в массив catalog. Никаких вызовов фабрик или импортов внутренних файлов игры в каталоге. Не добавляй ветки по id или импорты игры в host/settings/storage. Если возникает такая потребность, расширяй общий SDK с тестом, а не обходи границу.
7. Клади тесты модуля в `__tests__` рядом с его файлами, общие архитектурные/интеграционные проверки — в `src/tests`. Проверь реальные правила, долгие ограниченные симуляции ИИ, продолжение после человека/JSON restore, codecs и настройки каждого эффекта. При recovery проверь target и fallback, включая snapshot seed/round.
8. Выполни bun run check и bun run build; browser QA включает mobile/desktop, одинаковую системную панель и переключение игр. Production остаётся одним offline HTML. Не публикуй без запроса.

## Неочевидные инварианты

- defaultState — только нулевой шаблон. Engine глубоко копирует его на новую партию, затем вызывает optional pure initialize(state,seed,settings). Нельзя хранить current state/settings в module globals или возвращать готовый runtime из index.
- update и ai чистые, вложенные состояния не мутируют: история хранит ссылки, не глубокие копии. Случайность — явное состояние через SDK random; не Math.random/Date/DOM.
- ИИ возвращает игровое действие, не вызывает Session и не проходит ручной takeover. Поиск и проверки canResume ограничены по работе; проверяй трудные почти заполненные поля.
- Manual всегда 1×. Autopilot возвращает сохранённую engine-скорость без сброса поля/паузы. tickMs задаёт игра; multiplier и easing — движок.
- Presentation-only apply сохраняет тот же Session и recovery. Rules change использует полный стабильный snapshot: fallback уже содержит новую партию и её seed/round. История не сохраняется в localStorage.
- Действия дискретные: максимум одно на тик; pointer/held/release/одновременные команды не входят в SDK. Recovery steps — тики, включая idle, не обязательно значимые ходы; пиксельной интерполяции нет.
- Имена файлов — kebab-case; общие предметные типы — types.ts. Предпочитай цельные модули примерно 30–100 строк, без жёсткого лимита и без файла на каждый маленький helper. Большие условия раскладывай на проверки с говорящими именами, варианты стратегии — в таблицы конфигурации. Функции внутри одного алгоритма могут оставаться приватными рядом.
- Форматируй через bun run format; format:check входит в общий check. Сгенерированные shadcn primitives исключены из Prettier и остаются кодом библиотеки.
- Используй Bun и @/ imports. Canvas/правила не требуют React; shadcn и DOM принадлежат оболочке. Не добавляй другую lockfile.
