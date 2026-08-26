(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  const current = document.currentScript;
  const source = current && current.src ? current.src : '';
  const base = source ? source.replace(/[^/?#]+(?:[?#].*)?$/, '') : '';
  const VERSION = '2.3.1';

  function load(file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${base}${file}?v=${VERSION}`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${file}の読み込みに失敗しました。`));
      document.head.appendChild(script);
    });
  }

  function replaceEnhancement2Label(value) {
    return String(value == null ? '' : value)
      .split('#region(close,強化2回目)').join('#region(close,強化後2)')
      .split('[強化2回目]').join('[強化後2]');
  }

  function patchCore() {
    const core = globalThis.FGODataAutofillCore;
    if (!core) return;
    core.VERSION = VERSION;

    ['buildOwnedSkills', 'buildNoblePhantasms', 'buildFreshPage'].forEach((name) => {
      if (typeof core[name] !== 'function') return;
      const original = core[name];
      core[name] = function (...args) {
        return replaceEnhancement2Label(original.apply(this, args));
      };
    });

    if (typeof core.applyAll === 'function') {
      const originalApplyAll = core.applyAll;
      core.applyAll = function (sourceCode, state) {
        const result = originalApplyAll(sourceCode, state);
        result.text = replaceEnhancement2Label(result.text);
        return result;
      };
    }
  }

  function patchUI() {
    const ui = globalThis.FGODataAutofillUI;
    if (!ui || typeof ui.render !== 'function') return;
    const originalRender = ui.render;
    ui.render = function (root, state) {
      originalRender(root, state);
      root.innerHTML = String(root.innerHTML).split('強化2回目').join('強化後2');
    };
  }

  load('FGO_DataAutofill_core.js')
    .then(() => {
      patchCore();
      return load('FGO_DataAutofill_ui.js');
    })
    .then(() => {
      patchUI();
      return load('FGO_DataAutofill_boot.js');
    })
    .catch((error) => console.error('[FGO Data Autofill]', error));
})();
