(function () {
  'use strict';
  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill core is not loaded.');
  const { VERSION, CLASS_DATA, NP_COLORS } = core;
  const { ROOT_ID, escapeHtml } = internal;

  function installStyle() {
    if (document.getElementById('fda-style')) return;
    const style = document.createElement('style');
    style.id = 'fda-style';
    style.textContent = `
      #${ROOT_ID}{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic UI",Meiryo,sans-serif;color:#1f2937;max-width:1240px;margin:16px auto}
      #${ROOT_ID} *{box-sizing:border-box}.fda{background:#f4f8fc;border:1px solid #b8cee3;border-radius:12px;padding:16px}
      .fda h2{margin:0 0 5px}.fda-lead,.fda-help{color:#586b7d;line-height:1.6}.fda-version{font-size:12px;color:#64748b}
      .fda-sec{background:#fff;border:1px solid #ccd9e5;border-radius:9px;padding:14px;margin:12px 0}.fda-sec h3{margin:0 0 12px;border-left:5px solid #477fad;padding-left:9px}
      .fda-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.fda-field{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600}.fda-wide{grid-column:1/-1}
      .fda-field input,.fda-field select,.fda-field textarea,.fda-code{width:100%;border:1px solid #aebfd0;border-radius:6px;padding:8px;background:#fff;font:inherit}.fda-field textarea{min-height:90px;resize:vertical}
      .fda-card{border:1px solid #c1d6e7;border-radius:8px;padding:11px;margin:10px 0;background:#f8fbfe}.fda-subcard{background:#fff;border:1px solid #d4e0ea;border-radius:7px;padding:10px;margin-top:10px}
      .fda-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.fda-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.fda-btn{border:1px solid #35698f;border-radius:7px;background:#477fad;color:#fff;padding:8px 12px;font-weight:700;cursor:pointer}.fda-btn.sub{background:#fff;color:#35698f}.fda-btn.danger{border-color:#a33;color:#922;background:#fff}
      .fda-check{display:flex;gap:7px;align-items:center;font-size:13px;font-weight:600;margin-top:8px}.fda-check input{width:17px;height:17px}.fda-split{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fda-code{min-height:420px;resize:vertical;font-family:Consolas,"BIZ UDGothic",monospace;font-size:12px;line-height:1.45}
      .fda-msg{padding:9px;border-radius:6px;background:#edf7ed;color:#245c2a}.fda-msg.warn{background:#fff4d6;color:#7a4d00}.fda-details{margin:10px 0}.fda-details>summary{cursor:pointer;font-weight:700;padding:6px}
      @media(max-width:720px){.fda{padding:10px}.fda-split{grid-template-columns:1fr}.fda-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  const classOptions = (selected) => `<option value="">選択してください</option>${Object.keys(CLASS_DATA).map((name) => `<option value="${escapeHtml(name)}"${name === selected ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}`;
  const rarityOptions = (selected) => [1,2,3,4,5].map((r) => `<option value="${r}"${String(r) === String(selected) ? ' selected' : ''}>★${r}</option>`).join('');
  const rankOptions = (selected) => ['EX','A++','A+','A','A-','B++','B+','B','B-','C++','C+','C','C-','D++','D+','D','D-','E++','E+','E','E-','-']
    .map((rank) => `<option value="${rank}"${rank === selected ? ' selected' : ''}>${rank}</option>`).join('');
  const field = (label, html, wide) => `<label class="fda-field${wide ? ' fda-wide' : ''}"><span>${escapeHtml(label)}</span>${html}</label>`;
  const input = (path, value, placeholder) => `<input data-path="${path}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder || '')}">`;
  const textarea = (path, value, placeholder) => `<textarea data-path="${path}" placeholder="${escapeHtml(placeholder || '')}">${escapeHtml(value)}</textarea>`;
  const checkbox = (path, checked, label) => `<label class="fda-check"><input type="checkbox" data-path="${path}"${checked ? ' checked' : ''}>${escapeHtml(label)}</label>`;
  const nobleCheckbox = (basePath, checked, label) => `<label class="fda-check"><input type="checkbox" data-noble-toggle="${basePath}"${checked ? ' checked' : ''}>${escapeHtml(label)}</label>`;

  function classGroupHtml(group, groupIndex) {
    let html = `<div class="fda-card"><div class="fda-head"><strong>形態・グループ ${groupIndex + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-class-group" data-group="${groupIndex}">削除</button></div>`;
    html += `<div class="fda-grid">${field('見出し', input(`classGroups.${groupIndex}.heading`, group.heading))}</div>`;
    group.skills.forEach((skill, skillIndex) => {
      const base = `classGroups.${groupIndex}.skills.${skillIndex}`;
      html += `<div class="fda-subcard"><div class="fda-head"><strong>クラススキル ${skillIndex + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-class-skill" data-group="${groupIndex}" data-skill="${skillIndex}">削除</button></div><div class="fda-grid">`;
      html += field('表示名', input(`${base}.name`, skill.name));
      html += field('スキルアイコン', input(`${base}.icon`, skill.icon));
      html += field('フレーバーテキスト', textarea(`${base}.description`, skill.description), true);
      html += field('特殊ブロック直接指定', textarea(`${base}.rawBlock`, skill.rawBlock, '入力時は通常項目より優先されます'), true);
      html += `</div>${nobleCheckbox(base, skill.isNoblePhantasm, '宝具情報テンプレートをフレーバーテキストの先頭に挿入')}${checkbox(`${base}.rawWiki`, skill.rawWiki, 'フレーバーテキストをWiki記法のまま出力')}</div>`;
    });
    html += `<div class="fda-actions"><button type="button" class="fda-btn sub" data-action="add-class-skill" data-group="${groupIndex}">このグループにスキルを追加</button></div></div>`;
    return html;
  }

  function ownedSkillHtml(skill, index) {
    const base = `ownedSkills.${index}`;
    const e = skill.enhanced;
    return `<div class="fda-card"><div class="fda-head"><strong>保有スキル ${index + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-owned-skill" data-index="${index}">削除</button></div><div class="fda-grid">
      ${field('見出し番号', input(`${base}.label`, skill.label))}
      ${field('スキル名', input(`${base}.name`, skill.name))}
      ${field('アイコン', input(`${base}.icon`, skill.icon))}
      ${field('解説', textarea(`${base}.description`, skill.description), true)}
      ${field('特殊ブロック直接指定', textarea(`${base}.rawBlock`, skill.rawBlock), true)}
    </div>${nobleCheckbox(base, skill.isNoblePhantasm, '宝具情報テンプレートを解説の先頭に挿入')}${checkbox(`${base}.rawWiki`, skill.rawWiki, '解説をWiki記法のまま出力')}
    ${checkbox(`${base}.enhancedEnabled`, skill.enhancedEnabled, '強化後データを出力')}
    ${skill.enhancedEnabled ? `<details class="fda-details" open><summary>強化後</summary><div class="fda-grid">${field('強化後スキル名', input(`${base}.enhanced.name`, e.name))}${field('強化後アイコン', input(`${base}.enhanced.icon`, e.icon))}${field('強化後解説', textarea(`${base}.enhanced.description`, e.description), true)}${field('強化後特殊ブロック', textarea(`${base}.enhanced.rawBlock`, e.rawBlock), true)}</div>${nobleCheckbox(`${base}.enhanced`, e.isNoblePhantasm, '宝具情報テンプレートを強化後解説の先頭に挿入')}${checkbox(`${base}.enhanced.rawWiki`, e.rawWiki, '強化後解説をWiki記法のまま出力')}</details>` : ''}</div>`;
  }

  function nobleHtml(np, index) {
    const common = (base, prefix) => `<div class="fda-grid">
      ${field('小見出し', input(`${prefix}.heading`, base.heading || '', '複数宝具時など'))}
      ${field('宝具名の読み', input(`${prefix}.reading`, base.reading))}
      ${field('宝具名', input(`${prefix}.name`, base.name))}
      ${field('ランク', input(`${prefix}.rank`, base.rank))}
      ${field('種別', input(`${prefix}.type`, base.type))}
      ${field('カード色', `<select data-np-card="${prefix}">${Object.keys(NP_COLORS).map((card) => `<option value="${card}"${base.card === card ? ' selected' : ''}>${card}</option>`).join('')}</select>`)}
      ${field('レンジ', input(`${prefix}.range`, base.range))}
      ${field('最大補足', input(`${prefix}.maxTargets`, base.maxTargets))}
      ${field('解説', textarea(`${prefix}.description`, base.description), true)}
      ${field('宝具ブロック直接指定', textarea(`${prefix}.rawBlock`, base.rawBlock, '特殊構造はこちら'), true)}
    </div>${checkbox(`${prefix}.rawWiki`, base.rawWiki, '解説をWiki記法のまま出力')}`;
    return `<div class="fda-card"><div class="fda-head"><strong>宝具 ${index + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-np" data-index="${index}">削除</button></div>${common(np, `noblePhantasms.${index}`)}${checkbox(`noblePhantasms.${index}.enhancedEnabled`, np.enhancedEnabled, '強化後宝具を出力')}${np.enhancedEnabled ? `<details class="fda-details" open><summary>強化後</summary>${common(np.enhanced, `noblePhantasms.${index}.enhanced`)}</details>` : ''}</div>`;
  }

  function bondCraftEssenceHtml(ce) {
    return `<div class="fda-card"><div class="fda-grid">
      ${field('礼装名', input('bondCraftEssence.name', ce.name))}
      ${field('礼装アイコン', input('bondCraftEssence.icon', ce.icon))}
      ${field('フレーバーテキスト', textarea('bondCraftEssence.description', ce.description), true)}
      ${field('特殊ブロック直接指定', textarea('bondCraftEssence.rawBlock', ce.rawBlock, '入力時は通常項目より優先されます'), true)}
    </div>${checkbox('bondCraftEssence.rawWiki', ce.rawWiki, 'フレーバーテキストをWiki記法のまま出力')}</div>`;
  }

  function render(root, state) {
    root.innerHTML = `<form class="fda"><h2>FGO データオートフィル</h2><div class="fda-version">ver ${VERSION}</div><p class="fda-lead">No・基本情報・パラメーター・クラススキル・保有スキル・宝具・絆礼装・武器を入力し、既存のPukiWikiコードへ反映します。元コードが空欄の場合は新規ページ全体を生成します。</p>
      <section class="fda-sec"><h3>No・基本情報</h3><div class="fda-grid">
        ${field('No.', input('basic.no', state.basic.no))}${field('真名', input('basic.trueName', state.basic.trueName))}
        ${field('レアリティ', `<select data-path="basic.rarity">${rarityOptions(state.basic.rarity)}</select>`)}${field('クラス', `<select data-basic-class>${classOptions(state.basic.className)}</select>`)}
        ${field('性別', input('basic.gender', state.basic.gender))}${field('身長', input('basic.height', state.basic.height))}${field('体重', input('basic.weight', state.basic.weight))}
      </div>${checkbox('basic.trueNameRawWiki', state.basic.trueNameRawWiki, '真名をWiki記法のまま出力')}</section>
      <section class="fda-sec"><h3>パラメーター</h3><div class="fda-grid">
        ${field('筋力', `<select data-path="parameters.strength">${rankOptions(state.parameters.strength)}</select>`)}${field('耐久', `<select data-path="parameters.endurance">${rankOptions(state.parameters.endurance)}</select>`)}
        ${field('敏捷', `<select data-path="parameters.agility">${rankOptions(state.parameters.agility)}</select>`)}${field('魔力', `<select data-path="parameters.magic">${rankOptions(state.parameters.magic)}</select>`)}
        ${field('幸運', `<select data-path="parameters.luck">${rankOptions(state.parameters.luck)}</select>`)}${field('宝具', `<select data-path="parameters.noble">${rankOptions(state.parameters.noble)}</select>`)}
      </div></section>
      <section class="fda-sec"><h3>クラススキル</h3>${state.classGroups.map(classGroupHtml).join('')}<button type="button" class="fda-btn sub" data-action="add-class-group">形態・グループを追加</button></section>
      <section class="fda-sec"><h3>保有スキル</h3>${state.ownedSkills.map(ownedSkillHtml).join('')}<button type="button" class="fda-btn sub" data-action="add-owned-skill">保有スキルを追加</button></section>
      <section class="fda-sec"><h3>宝具</h3>${state.noblePhantasms.map(nobleHtml).join('')}<button type="button" class="fda-btn sub" data-action="add-np">宝具を追加</button></section>
      <section class="fda-sec"><h3>絆礼装</h3>${bondCraftEssenceHtml(state.bondCraftEssence)}</section>
      <section class="fda-sec"><h3>武器</h3><div class="fda-grid">${field('武器名', input('weapon.name', state.weapon.name))}${field('解説', textarea('weapon.description', state.weapon.description), true)}${field('武器ブロック直接指定', textarea('weapon.rawBlock', state.weapon.rawBlock), true)}</div>${checkbox('weapon.rawWiki', state.weapon.rawWiki, '解説をWiki記法のまま出力')}</section>
      <section class="fda-sec"><h3>PukiWikiコード</h3><p class="fda-help">既存ページの編集コードを左欄へ貼り付けてください。自動入力対象外の記述は保持します。</p><div class="fda-split">
        <label class="fda-field"><span>元のコード</span><textarea class="fda-code" data-path="sourceCode">${escapeHtml(state.sourceCode)}</textarea></label>
        <label class="fda-field"><span>反映後のコード</span><textarea class="fda-code" readonly>${escapeHtml(state.outputCode)}</textarea></label>
      </div><div class="fda-actions"><button type="button" class="fda-btn" data-action="apply">全データを反映</button><button type="button" class="fda-btn sub" data-action="copy-all">反映後コードを一括コピー</button><button type="button" class="fda-btn sub" data-action="clear-output">出力をクリア</button></div>${state.message ? `<div class="fda-msg${state.report && state.report.missing && state.report.missing.length ? ' warn' : ''}">${escapeHtml(state.message)}</div>` : ''}</section>
    </form>`;
  }

  globalThis.FGODataAutofillUI = { installStyle, render };
})();