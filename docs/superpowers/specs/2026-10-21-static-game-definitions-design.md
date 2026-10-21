# Static game definitions and engine-owned state

Пользователь уточнил контракт: `index.ts` экспортирует plain default object, без вызова фабрики; игра поставляет чистые callbacks и нулевой `defaultState`. Изменяемые параметры, экземпляры и state принадлежат движку. Продолжаем локальную реализацию без дальнейших согласований, commit/push/publication.

## Контракт

`GameDefinition<S,C,A>`: metadata, readonly defaultState:S, settings schema/normalize/validate/effect, persistence codec, optional pure initialize(state,seed,settings):S, configure(settings):GameRules<S,A>. GameRules содержит update/ai/render/metrics, actions/tick/viewport, без create. State с seed-зависимыми фигурами/едой создаёт pure initialize; простой игре достаточно defaultState без initializer.

Игра экспортирует `export default {metadata,defaultState,settings,persistence,initialize,configure} satisfies GameDefinition<...>`. Внутренний definition.ts содержит только типизированные схемы/codec, rules.ts — чистые callbacks. Нет runtime-конструкторов, current state/settings или factory singleton. Legacy headless game adapters переезжают в test helpers.

Каталог — `[snake,tetris] as const`. Engine createRegistry принимает гетерогенные определения, проверенные mapped conditional type, и стирает типы только внутри engine. createCartridge создаёт отдельный runtime на каждое определение для данного экземпляра хоста. Публичный SDK не экспортирует mutable runtime-конструктор.

## Владение

Движок клонирует defaultState глубоко перед каждым созданием партии; initialize получает приватную копию и неизменяемые settings. Один путь создания используется Session.start/restart/recovery fallback. Default shape не обязан быть готовым валидным игровым полем до initialize. Текущий state и RNG — только в Session.

Presentation и restore не вызывают initialize. При rules replacement Session создаётся из stable state и полного snapshot без повторного initial setup. Объект определения и его defaultState не изменяются. Два registry из одного catalog изолированы по state/settings/history. Применять настройки к Session чужого runtime (даже с тем же game id) нельзя.

## Проверка

Тесты default clone/nested independence, optional initializer, same seed, restart/fallback init, settings isolation, foreign runtime rejection, rules/presentation/restore init count, frozen definitions, heterogeneous registry и существующие codecs/recovery. Авторские default exports проверяются как object literals без factory calls. Все module tests в **tests**, общие проверки в src/tests. Полный check/build и browser smoke. Сохранения и игровые правила не меняются. SDK/architecture docs и скилл отражают новый контракт.
