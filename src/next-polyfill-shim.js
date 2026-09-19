// Минимальный шим вместо `next/dist/build/polyfills/polyfill-module`.
//
// Next подключает этот модуль безусловно (client/app-globals.ts,
// client/index.tsx) независимо от browserslist и тянет полифилы
// ES2019/ES2022: trimStart/End, flat/flatMap, Object.fromEntries,
// Object.hasOwn, Array.prototype.at, Promise.finally, Symbol.description,
// URL.canParse. На целевых браузерах (см. browserslist в package.json)
// все они, кроме URL.canParse, есть нативно — это мёртвый код в
// критическом бандле, который Lighthouse метит как «Legacy JavaScript».
//
// URL.canParse появился только в Chrome 120 / Safari 17 / Firefox 115,
// а Next вызывает его в `shared/lib/normalized-asset-prefix`. Поэтому
// оставляем ровно его одного. Подмена делается через
// NormalModuleReplacementPlugin в next.config.js.
if (typeof URL !== 'undefined' && typeof URL.canParse !== 'function') {
  URL.canParse = function canParse(url, base) {
    try {
      new URL(url, base);
      return true;
    } catch {
      return false;
    }
  };
}

export {};
