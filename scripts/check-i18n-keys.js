/**
 * Проверка целостности i18n лендинга.
 *
 * Ловит расхождение между ключами, которые запрашивает компонент,
 * и ключами, которые реально существуют в messages/. next-intl падает
 * на таком расхождении только в рантайме и только на конкретной локали,
 * поэтому дешевле поймать это до деплоя.
 *
 * Запуск: node scripts/check-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES = ['ru', 'en', 'es'];
const NAMESPACES = [
  'auth',
  'features',
  'security',
  'playground',
  'architecture',
  'economics',
  'pricing',
  'support',
  'faq',
  'footer',
];

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

function loadLocale(locale) {
  const keys = {};
  Object.assign(keys, flatten(JSON.parse(fs.readFileSync(`messages/${locale}.json`, 'utf8'))));
  for (const ns of NAMESPACES) {
    const file = `messages/${locale}/${ns}.json`;
    if (!fs.existsSync(file)) continue;
    Object.assign(keys, flatten(JSON.parse(fs.readFileSync(file, 'utf8')), ns));
  }
  return keys;
}

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

const locales = {};
for (const locale of LOCALES) locales[locale] = loadLocale(locale);

let problems = 0;

// 1. Паритет ключей между локалями.
const ruKeys = Object.keys(locales.ru);
for (const locale of ['en', 'es']) {
  const other = Object.keys(locales[locale]);
  const missing = ruKeys.filter((k) => !other.includes(k));
  const extra = other.filter((k) => !ruKeys.includes(k));
  if (missing.length || extra.length) {
    problems += missing.length + extra.length;
    console.log(`[parity] ${locale}: missing=${missing.length} extra=${extra.length}`);
    missing.slice(0, 10).forEach((k) => console.log(`   missing: ${k}`));
    extra.slice(0, 10).forEach((k) => console.log(`   extra:   ${k}`));
  }
}

// 2. Каждый запрошенный в коде ключ существует.
const nsRe = /useTranslations\(\s*['"`]([a-zA-Z]+)['"`]\s*\)/g;
const callRe = /[^a-zA-Z0-9_$](t[a-zA-Z]*)\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g;

for (const file of walk(path.join('src', 'landing', 'v2'))) {
  const src = fs.readFileSync(file, 'utf8');

  // Сопоставляем имя переменной перевода с её namespace: const tc = useTranslations('cta')
  const varNs = {};
  const declRe = /const\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*useTranslations\(\s*['"`]([a-zA-Z]+)['"`]\s*\)/g;
  let d;
  while ((d = declRe.exec(src)) !== null) varNs[d[1]] = d[2];

  nsRe.lastIndex = 0;
  if (Object.keys(varNs).length === 0) continue;

  let m;
  callRe.lastIndex = 0;
  while ((m = callRe.exec(src)) !== null) {
    const [, varName, key] = m;
    const ns = varNs[varName];
    if (!ns) continue;
    const full = `${ns}.${key}`;
    if (!(full in locales.ru)) {
      console.log(`[missing key] ${full}  <- ${file}`);
      problems += 1;
    }
  }
}

if (problems === 0) {
  console.log('i18n OK: locales in parity, every requested key exists');
  process.exit(0);
}
console.log(`i18n PROBLEMS: ${problems}`);
process.exit(1);
