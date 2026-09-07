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

  function skillAscensionFields(data, base) {
    const names = data.ascensionNames || { second: '', third: '' };
    return `<div class="fda-grid">
      ${field('第二再臨後の名称', input(`${base}.ascensionNames.second`, names.second || ''))}
      ${field('第三再臨後の名称', input(`${base}.ascensionNames.third`, names.third || ''))}
    </div>`;
  }

  function ownedVariantFields(data, base, title) {
    return `<details class="fda-details" open><summary>${title}</summary><div class="fda-grid">
      ${field(`${title}スキル名`, input(`${base}.name`, data.name))}
      ${field(`${title}アイコン`, input(`${base}.icon`, data.icon))}
      ${field(`${title}解説`, textarea(`${base}.description`, data.description), true)}
      ${field(`${title}特殊ブロック`, textarea(`${base}.rawBlock`, data.rawBlock), true)}
    </div>${skillAscensionFields(data, base)}${nobleCheckbox(base, data.isNoblePhantasm, `宝具情報テンプレートを${title}解説の先頭に挿入`)}${checkbox(`${base}.rawWiki`, data.rawWiki, `${title}解説をWiki記法のまま出力`)}</details>`;
  }

  function ownedSkillHtml(skill, index) {
    const base = `ownedSkills.${index}`;
    return `<div class="fda-card"><div class="fda-head"><strong>保有スキル ${index + 1}</strong></div><div class="fda-grid">
      ${field('スキル名', input(`${base}.name`, skill.name))}
      ${field('アイコン', input(`${base}.icon`, skill.icon))}
      ${field('解説', textarea(`${base}.description`, skill.description), true)}
      ${field('特殊ブロック直接指定', textarea(`${base}.rawBlock`, skill.rawBlock), true)}
    </div>${skillAscensionFields(skill, base)}${nobleCheckbox(base, skill.isNoblePhantasm, '宝具情報テンプレートを解説の先頭に挿入')}${checkbox(`${base}.rawWiki`, skill.rawWiki, '解説をWiki記法のまま出力')}
    ${checkbox(`${base}.enhancedEnabled`, skill.enhancedEnabled, '強化後データを出力')}
    ${skill.enhancedEnabled ? ownedVariantFields(skill.enhanced, `${base}.enhanced`, '強化後') : ''}
    ${checkbox(`${base}.enhanced2Enabled`, skill.enhanced2Enabled, '強化後2データを出力')}
    ${skill.enhanced2Enabled ? ownedVariantFields(skill.enhanced2, `${base}.enhanced2`, '強化後2') : ''}
    </div>`;
  }

  function npAscensionFields(data, base) {
    const names = data.ascensionNames || {};
    const second = names.second || {};
    const third = names.third || {};
    return `<div class="fda-grid">
      ${field('第二再臨後の読み', input(`${base}.ascensionNames.second.reading`, second.reading || ''))}
      ${field('第二再臨後の宝具名', input(`${base}.ascensionNames.second.name`, second.name || ''))}
      ${field('第三再臨後の読み', input(`${base}.ascensionNames.third.reading`, third.reading || ''))}
      ${field('第三再臨後の宝具名', input(`${base}.ascensionNames.third.name`, third.name || ''))}
    </div>`;
  }

  function nobleFields(data, prefix) {
    return `<div class="fda-grid">
      ${field('宝具名の読み', input(`${prefix}.reading`, data.reading))}
      ${field('宝具名', input(`${prefix}.name`, data.name))}
      ${field('ランク', input(`${prefix}.rank`, data.rank))}
      ${field('種別', input(`${prefix}.type`, data.type))}
      ${field('カード色', `<select data-np-card="${prefix}">${Object.keys(NP_COLORS).map((card) => `<option value="${card}"${data.card === card ? ' selected' : ''}>${card}</option>`).join('')}</select>`)}
      ${field('レンジ', input(`${prefix}.range`, data.range))}
      ${field('最大捕捉', input(`${prefix}.maxTargets`, data.maxTargets))}
      ${field('解説', textarea(`${prefix}.description`, data.description), true)}
      ${field('宝具ブロック直接指定', textarea(`${prefix}.rawBlock`, data.rawBlock, '特殊構造はこちら'), true)}
    </div>${npAscensionFields(data, prefix)}${checkbox(`${prefix}.rawWiki`, data.rawWiki, '解説をWiki記法のまま出力')}`;
  }

  function nobleHtml(np) {
    const base = 'noblePhantasms.0';
    return `<div class="fda-card"><div class="fda-head"><strong>宝具</strong></div>
      ${nobleFields(np, base)}
      ${checkbox(`${base}.enhancedEnabled`, np.enhancedEnabled, '強化後宝具を出力')}
      ${np.enhancedEnabled ? `<details class="fda-details" open><summary>強化後</summary>${nobleFields(np.enhanced, `${base}.enhanced`)}</details>` : ''}
      ${checkbox(`${base}.enhanced2Enabled`, np.enhanced2Enabled, '強化後2宝具を出力')}
      ${np.enhanced2Enabled ? `<details class="fda-details" open><summary>強化後2</summary>${nobleFields(np.enhanced2, `${base}.enhanced2`)}</details>` : ''}
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
