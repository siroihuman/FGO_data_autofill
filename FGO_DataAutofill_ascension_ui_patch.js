(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const ui = globalThis.FGODataAutofillUI;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !ui || !internal) throw new Error('FGO Data Autofill UI is not loaded.');

  const escapeHtml = internal.escapeHtml;
  const NP_COLORS = core.NP_COLORS;
  const originalRender = ui.render;

  const field = (label, html, wide) => `<label class="fda-field${wide ? ' fda-wide' : ''}"><span>${escapeHtml(label)}</span>${html}</label>`;
  const input = (path, value, placeholder) => `<input data-path="${path}" value="${escapeHtml(value == null ? '' : value)}" placeholder="${escapeHtml(placeholder || '')}">`;
  const textarea = (path, value, placeholder) => `<textarea data-path="${path}" placeholder="${escapeHtml(placeholder || '')}">${escapeHtml(value == null ? '' : value)}</textarea>`;
  const checkbox = (path, checked, label) => `<label class="fda-check"><input type="checkbox" data-path="${path}"${checked ? ' checked' : ''}>${escapeHtml(label)}</label>`;
  const nobleCheckbox = (basePath, checked, label) => `<label class="fda-check"><input type="checkbox" data-noble-toggle="${basePath}"${checked ? ' checked' : ''}>${escapeHtml(label)}</label>`;

  function ascensionModeSelect(path, value) {
    const options = [
      ['none', 'なし'],
      ['nameOnly', '名称のみ変化'],
      ['full', '再臨段階ごとに別データ']
    ];
    return `<select data-path="${path}">${options.map(([key, label]) => `<option value="${key}"${value === key ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>`;
  }

  function skillDataFields(data, base, title) {
    const prefix = title ? `${title}` : '';
    return `<div class="fda-grid">
      ${field(`${prefix}スキル名`, input(`${base}.name`, data.name))}
      ${field(`${prefix}アイコン`, input(`${base}.icon`, data.icon))}
      ${field(`${prefix}解説`, textarea(`${base}.description`, data.description), true)}
      ${field(`${prefix}特殊ブロック`, textarea(`${base}.rawBlock`, data.rawBlock), true)}
    </div>${nobleCheckbox(base, data.isNoblePhantasm, `宝具情報テンプレートを${prefix}解説の先頭に挿入`)}${checkbox(`${base}.rawWiki`, data.rawWiki, `${prefix}解説をWiki記法のまま出力`)}`;
  }

  function skillAscensionSettings(data, base) {
    const mode = data.ascensionMode || 'none';
    let detail = '';
    if (mode === 'nameOnly') {
      const names = data.ascensionNames || { second: '', third: '' };
      detail = `<div class="fda-grid">
        ${field('第二再臨時の名称', input(`${base}.ascensionNames.second`, names.second || ''))}
        ${field('第三再臨時の名称', input(`${base}.ascensionNames.third`, names.third || ''))}
      </div>`;
    } else if (mode === 'full') {
      const asc = data.ascensionData || {};
      detail = `<details class="fda-details" open><summary>第二再臨時</summary>${skillDataFields(asc.second || {}, `${base}.ascensionData.second`, '第二再臨時')}</details>
        <details class="fda-details" open><summary>第三再臨時</summary>${skillDataFields(asc.third || {}, `${base}.ascensionData.third`, '第三再臨時')}</details>`;
    }
    return `<details class="fda-details"><summary>再臨差分</summary>
      <div class="fda-grid">${field('再臨差分の種類', ascensionModeSelect(`${base}.ascensionMode`, mode))}</div>${detail}
    </details>`;
  }

  function skillSpecialSettings(data, base) {
    const special = data.special || { enabled: false, condition: '', data: {} };
    return `${checkbox(`${base}.special.enabled`, special.enabled, '特殊入力を使用')}
      ${special.enabled ? `<details class="fda-details" open><summary>特殊入力</summary><div class="fda-grid">
        ${field('条件', input(`${base}.special.condition`, special.condition))}
      </div>${skillDataFields(special.data || {}, `${base}.special.data`, '特殊')}</details>` : ''}`;
  }

  function ownedVariantFields(data, base, title) {
    return `<details class="fda-details" open><summary>${title}</summary>
      ${skillDataFields(data, base, `${title}`)}
      ${skillAscensionSettings(data, base)}
      ${skillSpecialSettings(data, base)}
    </details>`;
  }

  function ownedSkillHtml(skill, index) {
    const base = `ownedSkills.${index}`;
    return `<div class="fda-card"><div class="fda-head"><strong>保有スキル ${index + 1}</strong></div><div class="fda-grid">
      ${field('見出し', input(`${base}.label`, skill.label || `Skill${index + 1}`))}
    </div>
    ${skillDataFields(skill, base, '')}
    ${skillAscensionSettings(skill, base)}
    ${skillSpecialSettings(skill, base)}
    ${checkbox(`${base}.enhancedEnabled`, skill.enhancedEnabled, '強化後データを出力')}
    ${skill.enhancedEnabled ? ownedVariantFields(skill.enhanced, `${base}.enhanced`, '強化後') : ''}
    ${checkbox(`${base}.enhanced2Enabled`, skill.enhanced2Enabled, '強化後2データを出力')}
    ${skill.enhanced2Enabled ? ownedVariantFields(skill.enhanced2, `${base}.enhanced2`, '強化後2') : ''}
    </div>`;
  }

  function npCoreFields(data, prefix, includeHeading) {
    return `<div class="fda-grid">
      ${includeHeading ? field('見出し', input(`${prefix}.heading`, data.heading || '')) : ''}
      ${field('宝具名の読み', input(`${prefix}.reading`, data.reading))}
      ${field('宝具名', input(`${prefix}.name`, data.name))}
      ${field('ランク', input(`${prefix}.rank`, data.rank))}
      ${field('種別', input(`${prefix}.type`, data.type))}
      ${field('カード色', `<select data-np-card="${prefix}">${Object.keys(NP_COLORS).map((card) => `<option value="${card}"${data.card === card ? ' selected' : ''}>${card}</option>`).join('')}</select>`)}
      ${field('レンジ', input(`${prefix}.range`, data.range))}
      ${field('最大捕捉', input(`${prefix}.maxTargets`, data.maxTargets))}
      ${field('解説', textarea(`${prefix}.description`, data.description), true)}
      ${field('宝具ブロック直接指定', textarea(`${prefix}.rawBlock`, data.rawBlock, '特殊構造はこちら'), true)}
    </div>${checkbox(`${prefix}.rawWiki`, data.rawWiki, '解説をWiki記法のまま出力')}`;
  }

  function npAscensionSettings(data, base) {
    const mode = data.ascensionMode || 'none';
    let detail = '';
    if (mode === 'nameOnly') {
      const names = data.ascensionNames || {};
      const second = names.second || {};
      const third = names.third || {};
      detail = `<div class="fda-grid">
        ${field('第二再臨時の読み', input(`${base}.ascensionNames.second.reading`, second.reading || ''))}
        ${field('第二再臨時の宝具名', input(`${base}.ascensionNames.second.name`, second.name || ''))}
        ${field('第三再臨時の読み', input(`${base}.ascensionNames.third.reading`, third.reading || ''))}
        ${field('第三再臨時の宝具名', input(`${base}.ascensionNames.third.name`, third.name || ''))}
      </div>`;
    } else if (mode === 'full') {
      const asc = data.ascensionData || {};
      detail = `<details class="fda-details" open><summary>第二再臨時</summary>${npCoreFields(asc.second || {}, `${base}.ascensionData.second`, false)}</details>
        <details class="fda-details" open><summary>第三再臨時</summary>${npCoreFields(asc.third || {}, `${base}.ascensionData.third`, false)}</details>`;
    }
    return `<details class="fda-details"><summary>再臨差分</summary>
      <div class="fda-grid">${field('再臨差分の種類', ascensionModeSelect(`${base}.ascensionMode`, mode))}</div>${detail}
    </details>`;
  }

  function npSpecialSettings(data, base) {
    const special = data.special || { enabled: false, condition: '', data: {} };
    return `${checkbox(`${base}.special.enabled`, special.enabled, '特殊入力を使用')}
      ${special.enabled ? `<details class="fda-details" open><summary>特殊入力</summary><div class="fda-grid">
        ${field('条件', input(`${base}.special.condition`, special.condition))}
      </div>${npCoreFields(special.data || {}, `${base}.special.data`, false)}</details>` : ''}`;
  }

  function nobleVariantFields(data, prefix, title) {
    return `<details class="fda-details" open><summary>${title}</summary>
      ${npCoreFields(data, prefix, true)}
      ${npAscensionSettings(data, prefix)}
      ${npSpecialSettings(data, prefix)}
    </details>`;
  }

  function nobleHtml(np) {
    const base = 'noblePhantasms.0';
    return `<div class="fda-card"><div class="fda-head"><strong>宝具</strong></div>
      ${npCoreFields(np, base, true)}
      ${npAscensionSettings(np, base)}
      ${npSpecialSettings(np, base)}
      ${checkbox(`${base}.enhancedEnabled`, np.enhancedEnabled, '強化後宝具を出力')}
      ${np.enhancedEnabled ? nobleVariantFields(np.enhanced, `${base}.enhanced`, '強化後') : ''}
      ${checkbox(`${base}.enhanced2Enabled`, np.enhanced2Enabled, '強化後2宝具を出力')}
      ${np.enhanced2Enabled ? nobleVariantFields(np.enhanced2, `${base}.enhanced2`, '強化後2') : ''}
    </div>`;
  }

  function replaceSection(html, heading, nextHeading, replacement) {
    const startToken = `<section class="fda-sec"><h3>${heading}</h3>`;
    const endToken = `<section class="fda-sec"><h3>${nextHeading}</h3>`;
    const start = html.indexOf(startToken);
    const end = html.indexOf(endToken, start + startToken.length);
    if (start < 0 || end < 0) return html;
    return `${html.slice(0, start)}${replacement}${html.slice(end)}`;
  }

  ui.render = function (root, rawState) {
    const state = core.normalizeState(rawState);
    originalRender(root, state);
    let html = root.innerHTML;
    const ownedSection = `<section class="fda-sec"><h3>保有スキル</h3>${state.ownedSkills.map(ownedSkillHtml).join('')}</section>`;
    const nobleSection = `<section class="fda-sec"><h3>宝具</h3>${nobleHtml(state.noblePhantasms[0])}</section>`;
    html = replaceSection(html, '保有スキル', '宝具', ownedSection);
    html = replaceSection(html, '宝具', '絆礼装', nobleSection);
    root.innerHTML = html;
  };
})();
