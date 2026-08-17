/**
 * Модель детерминированного демо-сценария.
 *
 * Playground НЕ обращается к бэкенду: реальный прогон агента требует
 * пользовательских API-ключей к AI-провайдерам, которых на лендинге нет.
 * Поэтому каждая вкладка — заранее описанная лента шагов, которую
 * проигрывает движок useScenario.
 *
 * Тексты в шагах не хранятся: шаг несёт только i18n-ключ, а сам текст
 * приходит из messages/<locale>/playground.json. Так сценарий остаётся
 * общим для ru/en/es.
 */

/** Роль автора сообщения в ленте диалога. */
export type StepRole = 'user' | 'ai' | 'operator' | 'caller';

/** Иконка шага. Строковый союз, а не сам компонент, — чтобы сценарии
 *  оставались сериализуемыми данными без импорта React. */
export type StepIconName =
  | 'bot'
  | 'user'
  | 'phone'
  | 'phoneOutgoing'
  | 'calendar'
  | 'check'
  | 'search'
  | 'radar'
  | 'crm'
  | 'shield'
  | 'zap'
  | 'send'
  | 'headset'
  | 'globe'
  | 'clock'
  | 'sparkles'
  | 'file'
  | 'sheet'
  | 'image'
  | 'contacts'
  | 'proxy'
  | 'schedule'
  | 'target'
  | 'widget';

export type EventTone = 'info' | 'success' | 'accent' | 'warn';

/**
 * Артефакт — то, что инструмент вернул «в руки» пользователю.
 * Рисуется под телом вызова: файл, сгенерированная картинка, строка таблицы.
 *
 * Данные артефакта живут В ШАГЕ, а не в глобальном неймспейсе `artifacts`:
 * один и тот же инструмент вызывается из разных сценариев с разным
 * содержимым. Пока значения были общими, таблица Google Sheets в демо
 * виджета показывала товар из диалога текстового агента.
 *
 * `valuesKey` — префикс i18n-ключа внутри namespace `playground`;
 * конкретные поля дочитывает сам компонент артефакта. Для kind, у которых
 * данные зависят от сценария, поле обязательно на уровне типа —
 * забыть его нельзя, TypeScript не соберёт.
 */
export type StepArtifactKind = 'catImage' | 'priceFile' | 'sheetRow';

export type StepArtifact =
  /** Картинка: подпись и alt универсальны, привязки к сценарию нет. */
  | { kind: 'catImage' }
  /** Файл: ожидает `<valuesKey>.name` и `<valuesKey>.size`. */
  | { kind: 'priceFile'; valuesKey: string }
  /** Строка таблицы: ожидает `<valuesKey>.client`, `.item`, `.status`. */
  | { kind: 'sheetRow'; valuesKey: string };

/** Сообщение в ленте. */
export interface MessageStep {
  kind: 'message';
  id: string;
  /** Пауза перед появлением шага, мс. */
  delay: number;
  role: StepRole;
  /** Ключ в namespace `playground`. */
  key: string;
  /** Посимвольный стриминг дельт (как отдаёт реальный агент). */
  stream?: boolean;
  /** Рендерить через @ant-design/x-markdown. */
  markdown?: boolean;
  /** Подпись автора (ключ i18n) — например, имя оператора. */
  authorKey?: string;
  /**
   * Реплика оборвана: собеседник перебил модель.
   * Реальное событие realtime-звонка — air_orchestrator гасит текущий
   * ответ и слушает дальше, поэтому фраза остаётся незаконченной.
   */
  interrupted?: boolean;
}

/** Вызов инструмента: разворачивается в ThoughtChain. */
export interface ThoughtStep {
  kind: 'thought';
  id: string;
  delay: number;
  titleKey: string;
  descKey?: string;
  /** Тело вызова — «сырой» ответ инструмента. */
  contentKey?: string;
  icon?: StepIconName;
  /** Сколько шаг «думает» перед переходом loading → success, мс. */
  settleAfter?: number;
  /** Результат инструмента, показанный наглядно. */
  artifact?: StepArtifact;
}

/** Системное событие: строка лога под лентой. */
export interface EventStep {
  kind: 'event';
  id: string;
  delay: number;
  key: string;
  tone?: EventTone;
  icon?: StepIconName;
}

/** Переключение визуальной фазы вкладки (звонок, настройка, цель). */
export interface PhaseStep {
  kind: 'phase';
  id: string;
  delay: number;
  phase: string;
}

export type Step = MessageStep | ThoughtStep | EventStep | PhaseStep;

/** Шаг, уже выпущенный движком в ленту. */
export interface EmittedStep {
  step: Step;
  /** Накопленный текст для стриминговых сообщений. */
  streamed: string;
  /** Шаг доигран: стриминг завершён / инструмент отработал. */
  done: boolean;
}

/**
 * Идентификаторы вкладок. Совпадают с ключами в i18n.
 *
 * MCP-инструменты и передача оператору намеренно НЕ вынесены в отдельные
 * вкладки: и то и другое — часть обычного текстового диалога, и показывать
 * их в отрыве от него значит выдумывать режим, которого у продукта нет.
 */
export type ScenarioId = 'text' | 'voice' | 'outbound' | 'lead' | 'widget';

export interface Scenario {
  id: ScenarioId;
  /** Микросервис, который демонстрирует вкладка. */
  service: string;
  /** Доп. сервисы, участвующие в сценарии. */
  alsoServices?: string[];
  steps: Step[];
}
