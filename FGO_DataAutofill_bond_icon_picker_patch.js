(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const ui = globalThis.FGODataAutofillUI;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !ui || !internal) throw new Error('FGO Data Autofill icon picker is not loaded.');

  const VERSION = '2.6.7';
  const escapeHtml = internal.escapeHtml;
  const originalRender = ui.render;

  function pickerHtml(value) {
    const icon = String(value == null ? '' : value);
    return `<div class="fda-field fda-skill-icon-field" data-skill-icon-picker-for="bondCraftEssence.icon">
      <span>効果アイコン</span>
      <input type="hidden" data-path="bondCraftEssence.icon" value="${escapeHtml(icon)}">
      <div class="fda-icon-selected" data-icon-selected-for="bondCraftEssence.icon">
        <div class="fda-icon-selected-image" data-icon-selected-image></div>
        <div class="fda-icon-selected-meta"><span class="fda-icon-selected-label">選択中</span><strong data-icon-selected-name>${escapeHtml(icon || '未選択')}</strong></div>
        <div class="fda-icon-selected-actions">
          <button type="button" class="fda-btn sub" data-skill-icon-open>アイコンを選択</button>
          <button type="button" class="fda-btn sub fda-icon-clear" data-skill-icon-clear>選択解除</button>
        </div>
      </div>
    </div>`;
  }

  function replaceBondIconField(html, state) {
    const value = state && state.bondCraftEssence ? state.bondCraftEssence.icon : '';
    const pattern = /<label class="fda-field"><span>礼装アイコン<\/span><input data-path="bondCraftEssence\.icon"[^>]*><\/label>/;
    return String(html).replace(pattern, pickerHtml(value));
  }

  ui.render = function (root, rawState) {
    const state = core.normalizeState(rawState);
    originalRender(root, state);
    root.innerHTML = replaceBondIconField(root.innerHTML, state);
  };

  core.VERSION = VERSION;
  ui.bondCraftEssenceIconPickerEnabled = true;
})();
