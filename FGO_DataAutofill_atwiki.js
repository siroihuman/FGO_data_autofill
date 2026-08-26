(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  const current = document.currentScript;
  const source = current && current.src ? current.src : '';
  const base = source ? source.replace(/[^/?#]+(?:[?#].*)?$/, '') : '';

  function load(file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${base}${file}?v=2.2.0-max-targets-fix`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${file}の読み込みに失敗しました。`));
      document.head.appendChild(script);
    });
  }

  function fixMaxTargetTerminology() {
    const core = globalThis.FGODataAutofillCore;
    const ui = globalThis.FGODataAutofillUI;
    if (!core || !ui) return;

    const OLD = '最大補足';
    const CORRECT = '最大捕捉';
    const PREFIX = '&font(b,110%){種別：対宝具　レンジ：　最大捕捉：人}&br()&font(b,105%){“”}&br()';
    const replaceText = (value) => String(value == null ? '' : value).split(OLD).join(CORRECT);

    core.SKILL_NOBLE_PREFIX = PREFIX;

    const originalNormalizeState = core.normalizeState;
    core.normalizeState = function (value) {
      const state = originalNormalizeState(value);
      (state.classGroups || []).forEach((group) => {
        (group.skills || []).forEach((skill) => {
          skill.description = replaceText(skill.description);
        });
      });
      (state.ownedSkills || []).forEach((skill) => {
        skill.description = replaceText(skill.description);
        if (skill.enhanced) skill.enhanced.description = replaceText(skill.enhanced.description);
      });
      return state;
    };

    core.toggleNobleTemplate = function (data, enabled) {
      data.isNoblePhantasm = Boolean(enabled);
      let description = replaceText(data.description).replace(/\r\n?/g, '\n');
      const head = description.slice(0, 260);
      const hasTemplate = description.startsWith(PREFIX) || (
        head.includes('種別：') && head.includes('レンジ：') && head.includes('最大捕捉：')
      );
      if (enabled) {
        if (!hasTemplate) description = `${PREFIX}${description}`;
      } else if (description.startsWith(PREFIX)) {
        description = description.slice(PREFIX.length);
      }
      data.description = description;
      return data;
    };

    const originalApplyAll = core.applyAll;
    core.applyAll = function (sourceCode, state) {
      const result = originalApplyAll(sourceCode, state);
      result.text = replaceText(result.text);
      return result;
    };

    const originalRender = ui.render;
    ui.render = function (root, state) {
      originalRender(root, state);
      root.innerHTML = replaceText(root.innerHTML);
    };
  }

  load('FGO_DataAutofill_core.js')
    .then(() => load('FGO_DataAutofill_ui.js'))
    .then(() => fixMaxTargetTerminology())
    .then(() => load('FGO_DataAutofill_boot.js'))
    .catch((error) => console.error('[FGO Data Autofill]', error));
})();