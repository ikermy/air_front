import type { Scenario, ScenarioId } from './types';

/**
 * Пять детерминированных сценариев — по одному на вкладку.
 *
 * Здесь лежит только «партитура»: порядок шагов, паузы и роли.
 * Текста нет ни в одном шаге — только i18n-ключ внутри неймспейса
 * `playground`, поэтому один и тот же сценарий одинаково играет
 * на ru/en/es.
 *
 * Тайминги подобраны так, чтобы полный прогон вкладки укладывался
 * примерно в 15–20 секунд: достаточно, чтобы прочитать реплики,
 * и не настолько долго, чтобы посетитель ушёл раньше финала.
 */

/**
 * Текстовый агент зоомагазина «Котофей».
 *
 * Одна вкладка вместо трёх: MCP-инструменты и передача оператору живут
 * ВНУТРИ обычного диалога, потому что в продукте они именно так и работают —
 * агент сам решает вызвать инструмент и сам понимает, где его компетенция
 * заканчивается. Отдельные вкладки для них создавали бы впечатление
 * отдельных режимов, которых нет.
 *
 * Инструменты в сценарии: генерация изображения → отправка файла → запись
 * в Google Calendar. Google Sheets намеренно оставлен вкладке `lead`,
 * иначе один диалог превращается в перечисление всех интеграций сразу.
 */
const text: Scenario = {
  id: 'text',
  service: 'air_tgbot',
  alsoServices: ['air_orchestrator', 'air_operator', 'marusia_crm'],
  steps: [
    {
      kind: 'event',
      id: 'text-e1',
      delay: 250,
      key: 'scenarios.text.e1',
      tone: 'info',
      icon: 'zap',
    },
    {
      kind: 'message',
      id: 'text-m1',
      delay: 550,
      role: 'user',
      key: 'scenarios.text.m1',
    },
    {
      kind: 'event',
      id: 'text-e2',
      delay: 450,
      key: 'scenarios.text.e2',
      tone: 'accent',
      icon: 'crm',
    },
    {
      kind: 'message',
      id: 'text-m2',
      delay: 400,
      role: 'ai',
      key: 'scenarios.text.m2',
      stream: true,
      markdown: true,
    },
    {
      kind: 'message',
      id: 'text-m3',
      delay: 850,
      role: 'user',
      key: 'scenarios.text.m3',
    },
    // Инструмент 1: генерация изображения.
    {
      kind: 'thought',
      id: 'text-t1',
      delay: 450,
      titleKey: 'scenarios.text.t1.title',
      descKey: 'scenarios.text.t1.desc',
      contentKey: 'scenarios.text.t1.content',
      icon: 'image',
      settleAfter: 1100,
      artifact: { kind: 'catImage' },
    },
    {
      kind: 'message',
      id: 'text-m4',
      delay: 500,
      role: 'ai',
      key: 'scenarios.text.m4',
      stream: true,
    },
    {
      kind: 'message',
      id: 'text-m5',
      delay: 850,
      role: 'user',
      key: 'scenarios.text.m5',
    },
    // Инструмент 2: отправка файла.
    {
      kind: 'thought',
      id: 'text-t2',
      delay: 450,
      titleKey: 'scenarios.text.t2.title',
      descKey: 'scenarios.text.t2.desc',
      contentKey: 'scenarios.text.t2.content',
      icon: 'file',
      settleAfter: 850,
      artifact: { kind: 'priceFile', valuesKey: 'scenarios.text.t2.file' },
    },
    // Инструмент 3: запись в календарь.
    {
      kind: 'thought',
      id: 'text-t3',
      delay: 700,
      titleKey: 'scenarios.text.t3.title',
      descKey: 'scenarios.text.t3.desc',
      contentKey: 'scenarios.text.t3.content',
      icon: 'calendar',
      settleAfter: 1000,
    },
    {
      kind: 'message',
      id: 'text-m6',
      delay: 550,
      role: 'ai',
      key: 'scenarios.text.m6',
      stream: true,
      markdown: true,
    },
    // Здесь диалог упирается в предел компетенции агента.
    {
      kind: 'message',
      id: 'text-m7',
      delay: 900,
      role: 'user',
      key: 'scenarios.text.m7',
    },
    {
      kind: 'thought',
      id: 'text-t4',
      delay: 450,
      titleKey: 'scenarios.text.t4.title',
      descKey: 'scenarios.text.t4.desc',
      contentKey: 'scenarios.text.t4.content',
      icon: 'shield',
      settleAfter: 900,
    },
    {
      kind: 'event',
      id: 'text-e3',
      delay: 400,
      key: 'scenarios.text.e3',
      tone: 'warn',
      icon: 'headset',
    },
    {
      kind: 'message',
      id: 'text-m8',
      delay: 550,
      role: 'operator',
      key: 'scenarios.text.m8',
      authorKey: 'scenarios.text.operatorName',
      stream: true,
    },
    {
      kind: 'event',
      id: 'text-e4',
      delay: 550,
      key: 'scenarios.text.e4',
      tone: 'success',
      icon: 'crm',
    },
    {
      kind: 'event',
      id: 'text-e5',
      delay: 400,
      key: 'scenarios.text.e5',
      tone: 'success',
      icon: 'check',
    },
  ],
};

/** Realtime-голос: входящий звонок в котокафе, фазы соединения. */
const voice: Scenario = {
  id: 'voice',
  service: 'air_tguserbot',
  alsoServices: ['air_whatsbot'],
  steps: [
    { kind: 'phase', id: 'voice-p1', delay: 200, phase: 'ringing' },
    {
      kind: 'event',
      id: 'voice-e1',
      delay: 350,
      key: 'scenarios.voice.e1',
      tone: 'accent',
      icon: 'phone',
    },
    {
      kind: 'event',
      id: 'voice-e2',
      delay: 700,
      key: 'scenarios.voice.e2',
      tone: 'info',
      icon: 'shield',
    },
    { kind: 'phase', id: 'voice-p2', delay: 400, phase: 'connected' },
    {
      kind: 'message',
      id: 'voice-m1',
      delay: 350,
      role: 'ai',
      key: 'scenarios.voice.m1',
      stream: true,
    },
    {
      kind: 'message',
      id: 'voice-m2',
      delay: 900,
      role: 'caller',
      key: 'scenarios.voice.m2',
    },
    {
      kind: 'event',
      id: 'voice-e3',
      delay: 400,
      key: 'scenarios.voice.e3',
      tone: 'info',
      icon: 'clock',
    },
    {
      kind: 'message',
      id: 'voice-m3',
      delay: 400,
      role: 'ai',
      key: 'scenarios.voice.m3',
      stream: true,
    },
    {
      kind: 'message',
      id: 'voice-m4',
      delay: 900,
      role: 'caller',
      key: 'scenarios.voice.m4',
    },
    {
      kind: 'message',
      id: 'voice-m5',
      delay: 450,
      role: 'ai',
      key: 'scenarios.voice.m5',
      stream: true,
    },
    { kind: 'phase', id: 'voice-p3', delay: 700, phase: 'summary' },
    {
      kind: 'event',
      id: 'voice-e4',
      delay: 250,
      key: 'scenarios.voice.e4',
      tone: 'success',
      icon: 'check',
    },
  ],
};

/**
 * Исходящий звонок (сервис VoiceCalls).
 *
 * Партитура повторяет реальный поток gRPC-событий из
 * dashboard/steps/Services/VoiceCallService.tsx:
 *   starting → CALL_CONNECTED → INPUT_TRANSCRIPT_* (речь абонента)
 *   → RESPONSE_TEXT_* (ответ модели) → CALL_ENDED.
 *
 * Перебивание показано намеренно: в реальном коде есть отдельная ветка
 * markInterrupted(), и это самая честная демонстрация того, что звонок
 * действительно realtime, а не проигрывание заготовленной записи.
 */
const outbound: Scenario = {
  id: 'outbound',
  service: 'air_orchestrator',
  alsoServices: ['air_tguserbot', 'air_whatsbot'],
  steps: [
    { kind: 'phase', id: 'out-p1', delay: 200, phase: 'dialing' },
    {
      kind: 'event',
      id: 'out-e1',
      delay: 300,
      key: 'scenarios.outbound.e1',
      tone: 'info',
      icon: 'phoneOutgoing',
    },
    {
      kind: 'event',
      id: 'out-e2',
      delay: 700,
      key: 'scenarios.outbound.e2',
      tone: 'accent',
      icon: 'zap',
    },
    { kind: 'phase', id: 'out-p2', delay: 500, phase: 'connected' },
    {
      kind: 'message',
      id: 'out-m1',
      delay: 350,
      role: 'ai',
      key: 'scenarios.outbound.m1',
      stream: true,
    },
    {
      kind: 'message',
      id: 'out-m2',
      delay: 850,
      role: 'caller',
      key: 'scenarios.outbound.m2',
    },
    // Модель начинает отвечать — и её перебивают на полуслове.
    {
      kind: 'message',
      id: 'out-m3',
      delay: 400,
      role: 'ai',
      key: 'scenarios.outbound.m3',
      stream: true,
      interrupted: true,
    },
    {
      kind: 'event',
      id: 'out-e3',
      delay: 250,
      key: 'scenarios.outbound.e3',
      tone: 'warn',
      icon: 'zap',
    },
    {
      kind: 'message',
      id: 'out-m4',
      delay: 350,
      role: 'caller',
      key: 'scenarios.outbound.m4',
    },
    {
      kind: 'message',
      id: 'out-m5',
      delay: 450,
      role: 'ai',
      key: 'scenarios.outbound.m5',
      stream: true,
    },
    {
      kind: 'message',
      id: 'out-m6',
      delay: 850,
      role: 'caller',
      key: 'scenarios.outbound.m6',
    },
    {
      kind: 'message',
      id: 'out-m7',
      delay: 450,
      role: 'ai',
      key: 'scenarios.outbound.m7',
      stream: true,
    },
    { kind: 'phase', id: 'out-p3', delay: 700, phase: 'summary' },
    {
      kind: 'event',
      id: 'out-e4',
      delay: 250,
      key: 'scenarios.outbound.e4',
      tone: 'success',
      icon: 'check',
    },
  ],
};

/**
 * Lead Hunter.
 *
 * Переписан по реальным интерфейсам dashboard/steps/Services/LeadHunter/:
 * пользователь загружает контакты (leadContacts), поднимает несколько
 * пользовательских ботов Telegram/WhatsApp (leadBots), добавляет прокси
 * (leadProxyData), задаёт расписание по дням недели (leadSchedule) и
 * выбирает модель с поддержкой режима Lead Hunter плюс цель диалога
 * (leadModelData). Дальше боты ведут переписку по списку и при достижении
 * цели отдают горячего лида дальше — отсюда и название сервиса.
 *
 * Тон здесь деловой, без котиков: это инструмент продаж, и шутливый
 * пример обесценил бы единственную вкладку, где показан реальный B2B-процесс.
 */
const lead: Scenario = {
  id: 'lead',
  service: 'air_lead-hunter',
  alsoServices: ['air_tguserbot', 'air_whatsbot', 'marusia_crm'],
  steps: [
    { kind: 'phase', id: 'lead-p1', delay: 200, phase: 'configuring' },
    {
      kind: 'event',
      id: 'lead-e1',
      delay: 300,
      key: 'scenarios.lead.e1',
      tone: 'info',
      icon: 'contacts',
    },
    {
      kind: 'event',
      id: 'lead-e2',
      delay: 450,
      key: 'scenarios.lead.e2',
      tone: 'info',
      icon: 'bot',
    },
    {
      kind: 'event',
      id: 'lead-e3',
      delay: 400,
      key: 'scenarios.lead.e3',
      tone: 'info',
      icon: 'proxy',
    },
    {
      kind: 'event',
      id: 'lead-e4',
      delay: 400,
      key: 'scenarios.lead.e4',
      tone: 'info',
      icon: 'schedule',
    },
    {
      kind: 'event',
      id: 'lead-e5',
      delay: 400,
      key: 'scenarios.lead.e5',
      tone: 'accent',
      icon: 'target',
    },
    { kind: 'phase', id: 'lead-p2', delay: 500, phase: 'working' },
    {
      kind: 'event',
      id: 'lead-e6',
      delay: 350,
      key: 'scenarios.lead.e6',
      tone: 'info',
      icon: 'send',
    },
    {
      kind: 'message',
      id: 'lead-m1',
      delay: 450,
      role: 'ai',
      key: 'scenarios.lead.m1',
      stream: true,
    },
    {
      kind: 'message',
      id: 'lead-m2',
      delay: 900,
      role: 'caller',
      key: 'scenarios.lead.m2',
    },
    {
      kind: 'message',
      id: 'lead-m3',
      delay: 450,
      role: 'ai',
      key: 'scenarios.lead.m3',
      stream: true,
    },
    {
      kind: 'message',
      id: 'lead-m4',
      delay: 900,
      role: 'caller',
      key: 'scenarios.lead.m4',
    },
    // Цель диалога достигнута — это и есть «охота» на лида.
    {
      kind: 'thought',
      id: 'lead-t1',
      delay: 450,
      titleKey: 'scenarios.lead.t1.title',
      descKey: 'scenarios.lead.t1.desc',
      contentKey: 'scenarios.lead.t1.content',
      icon: 'target',
      settleAfter: 1000,
    },
    { kind: 'phase', id: 'lead-p3', delay: 500, phase: 'goal' },
    {
      kind: 'message',
      id: 'lead-m5',
      delay: 400,
      role: 'ai',
      key: 'scenarios.lead.m5',
      stream: true,
    },
    {
      kind: 'event',
      id: 'lead-e7',
      delay: 550,
      key: 'scenarios.lead.e7',
      tone: 'success',
      icon: 'crm',
    },
    {
      kind: 'event',
      id: 'lead-e8',
      delay: 400,
      key: 'scenarios.lead.e8',
      tone: 'success',
      icon: 'check',
    },
  ],
};

/**
 * Чат-виджет на сайте клиента (air_widget).
 *
 * Единственный канал, где агент работает на территории самого бизнеса,
 * а не в чужом мессенджере, — поэтому у него своя вкладка с мокапом
 * страницы сайта вместо окна мессенджера.
 */
const widget: Scenario = {
  id: 'widget',
  service: 'air_widget',
  alsoServices: ['air_orchestrator', 'marusia_crm'],
  steps: [
    { kind: 'phase', id: 'wg-p1', delay: 200, phase: 'site' },
    {
      kind: 'event',
      id: 'wg-e1',
      delay: 300,
      key: 'scenarios.widget.e1',
      tone: 'info',
      icon: 'widget',
    },
    {
      kind: 'message',
      id: 'wg-m1',
      delay: 600,
      role: 'user',
      key: 'scenarios.widget.m1',
    },
    {
      kind: 'message',
      id: 'wg-m2',
      delay: 450,
      role: 'ai',
      key: 'scenarios.widget.m2',
      stream: true,
      markdown: true,
    },
    {
      kind: 'message',
      id: 'wg-m3',
      delay: 900,
      role: 'user',
      key: 'scenarios.widget.m3',
    },
    {
      kind: 'thought',
      id: 'wg-t1',
      delay: 450,
      titleKey: 'scenarios.widget.t1.title',
      descKey: 'scenarios.widget.t1.desc',
      contentKey: 'scenarios.widget.t1.content',
      icon: 'sheet',
      settleAfter: 950,
      // Значения строки — из этого же сценария: в виджете речь о когтеточке.
      artifact: { kind: 'sheetRow', valuesKey: 'scenarios.widget.t1.row' },
    },
    {
      kind: 'message',
      id: 'wg-m4',
      delay: 500,
      role: 'ai',
      key: 'scenarios.widget.m4',
      stream: true,
      markdown: true,
    },
    {
      kind: 'event',
      id: 'wg-e2',
      delay: 500,
      key: 'scenarios.widget.e2',
      tone: 'accent',
      icon: 'crm',
    },
    {
      kind: 'event',
      id: 'wg-e3',
      delay: 400,
      key: 'scenarios.widget.e3',
      tone: 'success',
      icon: 'check',
    },
  ],
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  text,
  voice,
  outbound,
  lead,
  widget,
};

/** Порядок вкладок в переключателе. */
export const SCENARIO_ORDER: ScenarioId[] = [
  'text',
  'voice',
  'outbound',
  'lead',
  'widget',
];

/** Вкладки с визуальной боковой панелью. */
export const PHASE_TABS: ReadonlySet<ScenarioId> = new Set<ScenarioId>([
  'voice',
  'outbound',
  'lead',
  'widget',
]);
