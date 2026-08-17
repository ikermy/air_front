/**
 * Разовая проверка playground: каждый i18n-ключ, на который ссылается
 * партитура сценария, обязан существовать во всех трёх локалях.
 *
 * Ключи в сценариях — строки, а не идентификаторы, поэтому ни TypeScript,
 * ни сборка их не проверяют: опечатка всплыла бы уже в браузере, и только
 * на той локали, где ключ забыли.
 *
 * Запуск: node scripts/check-playground-keys.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['ru', 'en', 'es'];

function flatten(obj, prefix = '') {
  const out = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, full));
    } else {
      out[full] = value;
    }
  }
  return out;
}

const messages = {};
for (const locale of LOCALES) {
  const file = path.join('messages', locale, 'playground.json');
  messages[locale] = flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
}

const src = fs.readFileSync(
  path.join('src', 'landing', 'v2', 'playground', 'scenarios.ts'),
  'utf8'
);

// Ключи из партитуры: key / titleKey / descKey / contentKey / authorKey.
const referenced = new Set();
const re = /(?:key|titleKey|descKey|contentKey|authorKey):\s*'([^']+)'/g;
let m;
while ((m = re.exec(src)) !== null) referenced.add(m[1]);

// Статические ключи, которые запрашивают компоненты playground.
const scenarioIds = ['text', 'voice', 'outbound', 'lead', 'widget'];
const staticKeys = [
  'eyebrow',
  'title',
  'lead',
  'demoBadge',
  'disclaimer',
  'replay',
  'tabsAria',
  'feedAria',
  'feedEmpty',
  'logAria',
  'logTitle',
  'logEmpty',
  'roles.user',
  'roles.ai',
  'roles.operator',
  'roles.caller',
  'widgetMock.url',
  'widgetMock.title',
  'artifacts.catAlt',
  'artifacts.catCaption',
  // Заголовки таблицы общие; сами значения живут в шаге сценария
  // (artifact.valuesKey) и добираются ниже из партитуры.
  'artifacts.sheetTitle',
  'artifacts.sheetCol1',
  'artifacts.sheetCol2',
  'artifacts.sheetCol3',
  ...scenarioIds.flatMap((id) => [`tabs.${id}.name`, `tabs.${id}.desc`]),
  ...['contacts', 'bots', 'proxy', 'schedule', 'model'].flatMap((id) => [
    `leadSetup.${id}.name`,
    `leadSetup.${id}.value`,
  ]),
];

// Значения артефактов: префикс задан в шаге, конкретные поля — в компоненте.
const ARTIFACT_FIELDS = {
  priceFile: ['name', 'size'],
  sheetRow: ['client', 'item', 'status'],
};
const artifactRe =
  /artifact:\s*\{\s*kind:\s*'([^']+)'(?:\s*,\s*valuesKey:\s*'([^']+)')?/g;
while ((m = artifactRe.exec(src)) !== null) {
  const [, kind, valuesKey] = m;
  const fields = ARTIFACT_FIELDS[kind];
  if (!fields) continue;
  if (!valuesKey) {
    console.log(`[artifact] kind '${kind}' requires valuesKey`);
    continue;
  }
  for (const field of fields) staticKeys.push(`${valuesKey}.${field}`);
}

// Фазы, объявленные в партитуре, + idle из компонента.
const phases = new Set(['idle']);
const phaseRe = /phase:\s*'([^']+)'/g;
while ((m = phaseRe.exec(src)) !== null) phases.add(m[1]);
for (const phase of phases) {
  staticKeys.push(`phases.${phase}`, `phaseHints.${phase}`);
}

for (const key of staticKeys) referenced.add(key);

let problems = 0;
for (const locale of LOCALES) {
  for (const key of [...referenced].sort()) {
    if (!(key in messages[locale])) {
      console.log(`[missing] ${locale}: ${key}`);
      problems += 1;
    }
  }
}

// Обратная проверка: неиспользуемые ключи — обычно след старых сценариев.
for (const key of Object.keys(messages.ru)) {
  if (!referenced.has(key)) {
    console.log(`[orphan]  ru: ${key}`);
    problems += 1;
  }
}

console.log(
  problems === 0
    ? `playground OK: ${referenced.size} keys resolve in ru/en/es, no orphans`
    : `playground PROBLEMS: ${problems}`
);
process.exit(problems === 0 ? 0 : 1);
