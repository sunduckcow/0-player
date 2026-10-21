# API движка

Полный актуальный контракт: [docs/engine-sdk.md](../../../../docs/engine-sdk.md). Перед изменением проверь реальные экспорты `src/engine/sdk.ts`, типы из `engine/contracts/`, а для адаптера/времени/отката — `engine/runtime/`.

## Быстрая навигация

| Нужная возможность | API / ответственность |
| --- | --- |
| Регистрация | games/<id>/index.ts default-экспортирует plain GameDefinition object с defaultState; catalog перечисляет объекты, engine createRegistry создаёт runtime |
| Правила | GameRules<State,Action>; update/ai/render/metrics и логический viewport; создание — engine clone defaultState + optional pure initialize |
| Настройки | fields boolean/choice/number, presets, normalize/validate/effect |
| Смена параметров | none/presentation/rules/restart; общий Cartridge.apply |
| Ввод | Собственные action-id, semantic role, keys и repeat; системные команды отдельно |
| Сохранение | persistence.version/decode/compatible; конверты v1/v2 и ошибки storage — движок |
| Визуал | frame.visuals, frame.reducedMotion; clear/grid и feedback helpers |
| Preview | draw(ctx,readonlyDraft,logicalBounds,frame), синхронно, без DOM/Session |
| Подписи | BoardLabel text/x/y/semantic role; размер/шрифт выбирает движок |
| Восстановление | recovery.steps/durationMs/isLoss/canResume; generic SDK canContinue |

В callback update передаётся mode auto/human, а не время браузера. Игра может выбрать естественную гравитацию для человека; clock/multiplier/ownership остаются engine. initialize/update/ai не читают окружение. В index.ts небольшие callbacks видны прямо в default-объекте; большие приходят default-объектами из logic/ai/render/settings/persistence. Типы импортируются отдельно из types.ts. Статическая preview-геометрия не является игровым State или defaultState. State обязан иметь score/over, но не обязан иметь rng. При случайности сериализуй её явное состояние.

В visuals есть accent/accentMuted/secondary, categorical[0…6], background/grid/text/muted и effects. Все вложенные данные readonly/frozen. Secondary — контрастно скорректированная противоположность акцента; Tetris использует стабильное соответствие видов фигур индексам палитры. Не создавай частные RGB/theme/media ветки. Цвета, tint/opacity/motion разрешает движок; игра определяет форму и затронутые сущности.

Системные клавиши и каталог 1–9/Escape зарезервированы. Enter имеет контекстную engine-привязку только после завершения партии; во время игры работает явная привязка картриджа. Repeat берётся из metadata, а не из имени action. На mobile системный dock одинаков у всех игр, pad 2×3 содержит только игровые действия.

Session держит bounded queue и историю min(steps*4,240), выполняет максимум один normal tick за browser frame или восемь через advance. Пауза замораживает recovery, restart отменяет его. Обычный terminal auto-restart происходит через 1500мс; исключение победы из isLoss не отменяет auto-restart. Restore сбрасывает очередь/историю/часы. Snapshot во время recovery — конечный target/fallback, не видимый промежуточный кадр.

Ограничения: дискретные действия без удержания/pointer/одновременного ввода; нет ECS/asset loader/аудио/сети/worker поиска. Recovery записывает idle-тики; turn-based откат по ходам потребует общего hook. Между историческими снимками нет пиксельной интерполяции. Расширение требований проводится через общий SDK и тесты.
