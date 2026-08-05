(function () {
  'use strict';

  const VERSION = '2.0.0';
  const ROOT_ID = 'fgo-data-autofill';
  const STATE_KEY = 'fgo-data-autofill:v2:';

  const CLASS_DATA = {
    'セイバー': '剣金.png', 'アーチャー': '弓金.png', 'ランサー': '槍金.png',
    'ライダー': '騎金.png', 'キャスター': '術金.png', 'アサシン': '殺金.png',
    'バーサーカー': '狂金.png', 'シールダー': '盾金.png', 'ルーラー': '裁金.png',
    'アヴェンジャー': '讐金.png', 'ムーンキャンサー': '月金.png',
    'アルターエゴ': '分金.png', 'フォーリナー': '降金.png',
    'プリテンダー': '詐金.png', 'ビースト': '獣金.png'
  };

  const NP_COLORS = {
    Buster: '#F88', Arts: '#9AF', Quick: '#AF9'
  };

  const SKILL_MASTER = [
    {
      id: 'territory-creation-b-plus',
      name: '陣地作成 B+',
      icon: '陣地作成.png',
      flavor: '魔術師として、自らに有利な陣地を作り上げる。\n“工房”と“祭壇”の形成が可能。'
    }
  ];

  const clean = (value) => String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function ensurePng(value, fallback) {
    const text = clean(value) || clean(fallback);
    if (!text) return '0.png';
    return /\.[a-z0-9]+$/i.test(text) ? text : `${text}.png`;
  }

  function inferSkillIcon(name) {
    const base = clean(name)
      .replace(/[【】]/g, '')
      .replace(/\s+(?:EX|[A-E](?:\+\+|\+|-)?|-)$/i, '')
      .trim();
    return base ? `${base}.png` : '0.png';
  }

  function wikiText(value, rawWiki) {
    const text = clean(value);
    return rawWiki ? text : text.replace(/\n/g, '&br()');
  }

  function wikiTrueName(value, rawWiki) {
    const text = clean(value);
    if (rawWiki) return text;
    if (!text) return '[[]]';
    return /^\[\[.*\]\]$/.test(text) ? text : `[[${text}]]`;
  }

  function rankBars(rank) {
    const text = clean(rank).toUpperCase();
    let count = 0;
    if (text === 'EX' || text.startsWith('A')) count = 5;
    else if (text.startsWith('B')) count = 4;
    else if (text.startsWith('C')) count = 3;
    else if (text.startsWith('D')) count = 2;
    else if (text.startsWith('E')) count = 1;
    return Array.from({ length: 5 }, (_, index) => index < count ? 'BGCOLOR(#ea5506):' : '');
  }

  function buildParameterRow(leftLabel, leftRank, separator, rightLabel, rightRank) {
    const cells = [leftLabel].concat(rankBars(leftRank), [clean(leftRank), separator, rightLabel], rankBars(rightRank), [clean(rightRank)]);
    return `|${cells.join('|')}|`;
  }

  function newClassSkill(data) {
    return Object.assign({ masterId: '', name: '', icon: '', description: '', rawWiki: false, rawBlock: '' }, data || {});
  }

  function newClassGroup(data) {
    return Object.assign({ heading: '', className: 'セイバー', classIcon: '剣金.png', skills: [newClassSkill()] }, data || {});
  }

  function newOwnedSkill(index, data) {
    return Object.assign({
      label: `Skill${index + 1}`, name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '',
      enhancedEnabled: false,
      enhanced: { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '' }
    }, data || {});
  }

  function newNoblePhantasm(data) {
    return Object.assign({
      heading: '', reading: '', name: '', rank: '', type: '対宝具', card: 'Buster',
      range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: '',
      enhancedEnabled: false,
      enhanced: { reading: '', name: '', rank: '', type: '対宝具', card: 'Buster', range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: '' }
    }, data || {});
  }

  function defaultState() {
    return {
      basic: {
        no: '', trueName: '', trueNameRawWiki: false,
        className: 'セイバー', classIcon: '剣金.png', gender: '', height: '', weight: ''
      },
      parameters: { strength: 'E', endurance: 'E', agility: 'E', magic: 'E', luck: 'E', noble: 'E' },
      classGroups: [newClassGroup()],
      ownedSkills: [newOwnedSkill(0), newOwnedSkill(1), newOwnedSkill(2)],
      noblePhantasms: [newNoblePhantasm()],
      weapon: { name: '', description: '', rawWiki: false, rawBlock: '' },
      sourceCode: '', outputCode: '', message: '', report: null
    };
  }

  function normalizeState(value) {
    const state = Object.assign(defaultState(), value && typeof value === 'object' ? value : {});
    state.basic = Object.assign(defaultState().basic, state.basic || {});
    state.parameters = Object.assign(defaultState().parameters, state.parameters || {});
    state.classGroups = Array.isArray(state.classGroups) && state.classGroups.length
      ? state.classGroups.map((group) => {
          const normalized = Object.assign(newClassGroup(), group || {});
          normalized.skills = Array.isArray(normalized.skills) && normalized.skills.length
            ? normalized.skills.map((skill) => Object.assign(newClassSkill(), skill || {}))
            : [newClassSkill()];
          return normalized;
        })
      : [newClassGroup()];
    state.ownedSkills = Array.isArray(state.ownedSkills) && state.ownedSkills.length
      ? state.ownedSkills.map((skill, index) => {
          const normalized = Object.assign(newOwnedSkill(index), skill || {});
          normalized.enhanced = Object.assign(newOwnedSkill(index).enhanced, normalized.enhanced || {});
          return normalized;
        })
      : [newOwnedSkill(0), newOwnedSkill(1), newOwnedSkill(2)];
    state.noblePhantasms = Array.isArray(state.noblePhantasms) && state.noblePhantasms.length
      ? state.noblePhantasms.map((np) => {
          const normalized = Object.assign(newNoblePhantasm(), np || {});
          normalized.enhanced = Object.assign(newNoblePhantasm().enhanced, normalized.enhanced || {});
          return normalized;
        })
      : [newNoblePhantasm()];
    state.weapon = Object.assign(defaultState().weapon, state.weapon || {});
    return state;
  }

  function buildClassSkillBlock(skill, group) {
    if (clean(skill.rawBlock)) return clean(skill.rawBlock);
    const name = clean(skill.name) || '【スキル名】';
    const icon = ensurePng(skill.icon, inferSkillIcon(name));
    const className = clean(group.className) || 'セイバー';
    const classIcon = ensurePng(group.classIcon, CLASS_DATA[className] || '0.png');
    return [
      '|BGCOLOR(#e6e6fa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c',
      `|&ref(${icon},icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){${name}}&ref(${classIcon},icon/class,title=${className},height=25,width=25)|`,
      `|~|${wikiText(skill.description, skill.rawWiki)}|`
    ].join('\n');
  }

  function buildClassSkills(groups) {
    const output = [];
    (groups || []).forEach((group) => {
      const skills = (group.skills || []).filter((skill) => clean(skill.name) || clean(skill.icon) || clean(skill.description) || clean(skill.rawBlock));
      if (!skills.length) return;
      if (clean(group.heading)) output.push(`***${clean(group.heading)}`);
      skills.forEach((skill) => output.push(buildClassSkillBlock(skill, group)));
    });
    return output.join('\n\n');
  }

  function buildOwnedSkillTable(data) {
    if (clean(data.rawBlock)) return clean(data.rawBlock);
    const icon = ensurePng(data.icon, inferSkillIcon(data.name));
    return [
      '|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c',
      `|BGCOLOR(#e6e6fa):CENTER:&ref(${icon},icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|`,
      `|~|${wikiText(data.description, data.rawWiki)}|`
    ].join('\n');
  }

  function buildOwnedSkills(skills) {
    const output = [];
    (skills || []).forEach((skill, index) => {
      const label = clean(skill.label) || `Skill${index + 1}`;
      output.push(`***${label}：${clean(skill.name)}`);
      output.push(buildOwnedSkillTable(skill));
      if (skill.enhancedEnabled) {
        output.push('#region(close,強化後)');
        output.push(`***${label}[強化後]：${clean(skill.enhanced.name)}`);
        output.push(buildOwnedSkillTable(skill.enhanced));
        output.push('#endregion');
      }
    });
    return output.join('\n');
  }

  function buildNobleTable(data) {
    if (clean(data.rawBlock)) return clean(data.rawBlock);
    const titleParts = [];
    if (clean(data.reading)) titleParts.push(clean(data.reading));
    if (clean(data.name)) titleParts.push(clean(data.name));
    const title = titleParts.join('&br()');
    const color = NP_COLORS[data.card] || NP_COLORS.Buster;
    const detail = `&font(b,110%){レンジ：${clean(data.range)}　最大補足：${clean(data.maxTargets)}}`;
    const description = wikiText(data.description, data.rawWiki);
    return [
      '|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c',
      `|>|>|~${title}|`,
      '|ランク|種別|解説|',
      `|BGCOLOR(${color}):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c`,
      `|${clean(data.rank)}|${clean(data.type) || '対宝具'}|${detail}${description ? `&br()${description}` : ''}|`
    ].join('\n');
  }

  function buildNoblePhantasms(noblePhantasms) {
    const output = [];
    (noblePhantasms || []).forEach((np) => {
      if (clean(np.heading)) output.push(`***${clean(np.heading)}`);
      output.push(buildNobleTable(np));
      if (np.enhancedEnabled) {
        output.push('#region(close,強化後)');
        output.push('#br');
        output.push(buildNobleTable(np.enhanced));
        output.push('#endregion');
      }
    });
    return output.join('\n\n');
  }

  function buildWeapon(weapon) {
    if (clean(weapon.rawBlock)) return clean(weapon.rawBlock);
    return [
      '|BGCOLOR(#f5fffa):LEFT:1000|c',
      `|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【${clean(weapon.name) || '武器名'}】}|`,
      `|${wikiText(weapon.description, weapon.rawWiki)}|`
    ].join('\n');
  }

  function replaceLine(text, pattern, replacement, label, report) {
    if (!pattern.test(text)) {
      report.missing.push(label);
      return text;
    }
    report.replaced.push(label);
    return text.replace(pattern, replacement);
  }

  function replaceSectionBody(text, heading, body, report) {
    const pattern = new RegExp(`^\\*\\*${escapeRegExp(heading)}[^\\n]*$`, 'm');
    const match = pattern.exec(text);
    if (!match) {
      report.missing.push(`${heading}欄`);
      return text;
    }
    const headingEnd = match.index + match[0].length;
    const bodyStart = text[headingEnd] === '\n' ? headingEnd + 1 : headingEnd;
    const remainder = text.slice(bodyStart);
    const divider = /^\/\/─┤[^\n]*$/m.exec(remainder);
    const nextHeading = /^\*\*[^*\n][^\n]*$/m.exec(remainder);
    let relativeEnd = remainder.length;
    if (divider) relativeEnd = Math.min(relativeEnd, divider.index);
    if (nextHeading) relativeEnd = Math.min(relativeEnd, nextHeading.index);
    const bodyEnd = bodyStart + relativeEnd;
    const suffix = text.slice(bodyEnd).replace(/^\n+/, '');
    report.replaced.push(`${heading}欄`);
    return `${text.slice(0, headingEnd)}\n${body}${suffix ? `\n\n${suffix}` : ''}`;
  }

  function buildFreshPage(state) {
    const basic = state.basic;
    const params = state.parameters;
    const classIcon = ensurePng(basic.classIcon, CLASS_DATA[basic.className]);
    return [
      `*No.${clean(basic.no)}`,
      '#divclass(fgowiki-clearfix){{{',
      '#divclass(srv_menu){',
      '#contents(fromhere=true)}',
      '#divclass(gallery){{',
      '}',
      '}}}',
      '',
      '//─┤基本情報├──────────────────────────',
      '',
      '*基本情報',
      '|BGCOLOR(#98fb98):CENTER:46|BGCOLOR(#87ceeb):CENTER:46|BGCOLOR(#ffb6c1):CENTER:46|BGCOLOR(#e6e6fa):CENTER:58|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#e6e6fa):CENTER:20|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|c',
      `|>|>|>|>|>|>|>|>|>|>|>|>|>|>|BGCOLOR(#17184b):COLOR(white):No.${clean(basic.no)}|`,
      `|>|>|BGCOLOR(#e6e6fa):真名|>|>|>|>|>|>|>|>|>|>|>|${wikiTrueName(basic.trueName, basic.trueNameRawWiki)}|`,
      `|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(${classIcon},icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別|${clean(basic.gender)}|>|BGCOLOR(#e6e6fa):身長|${clean(basic.height)}|>|BGCOLOR(#e6e6fa):体重|${clean(basic.weight)}|`,
      '**パラメーター',
      '|BGCOLOR(#000):COLOR(#fff):CENTER:60|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#000):COLOR(#fff):CENTER:25|BGCOLOR(#000):0|BGCOLOR(#000):COLOR(#fff):CENTER:60|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#000):COLOR(#fff):CENTER:25|c',
      buildParameterRow('筋力', params.strength, ' ', '耐久', params.endurance),
      buildParameterRow('敏捷', params.agility, '~', '魔力', params.magic),
      buildParameterRow('幸運', params.luck, '~', '宝具', params.noble),
      '',
      '//─┤クラススキル├────────────────────────',
      '',
      '**クラススキル',
      buildClassSkills(state.classGroups),
      '',
      '//─┤保有スキル├─────────────────────────',
      '',
      '**保有スキル',
      buildOwnedSkills(state.ownedSkills),
      '',
      '//─┤宝具├────────────────────────────',
      '',
      '**宝具',
      buildNoblePhantasms(state.noblePhantasms),
      '',
      '//─┤武器├────────────────────────────',
      '',
      '**武器',
      buildWeapon(state.weapon)
    ].join('\n');
  }

  function applyAll(source, rawState) {
    const state = normalizeState(rawState);
    let text = String(source == null ? '' : source).replace(/\r\n?/g, '\n');
    const report = { replaced: [], missing: [] };
    if (!text.trim()) {
      return { text: buildFreshPage(state), report: { replaced: ['新規ページ全体'], missing: [] }, fresh: true };
    }

    const basic = state.basic;
    const params = state.parameters;
    const classIcon = ensurePng(basic.classIcon, CLASS_DATA[basic.className]);

    text = replaceLine(text, /^\*No\.[^\n]*$/m, `*No.${clean(basic.no)}`, 'ページ先頭のNo.', report);
    text = replaceLine(text, /^\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|BGCOLOR\(#17184b\):COLOR\(white\):No\.[^\n]*\|$/m,
      `|>|>|>|>|>|>|>|>|>|>|>|>|>|>|BGCOLOR(#17184b):COLOR(white):No.${clean(basic.no)}|`, '基本情報のNo.', report);
    text = replaceLine(text, /^\|>\|>\|BGCOLOR\(#e6e6fa\):真名\|[^\n]*$/m,
      `|>|>|BGCOLOR(#e6e6fa):真名|>|>|>|>|>|>|>|>|>|>|>|${wikiTrueName(basic.trueName, basic.trueNameRawWiki)}|`, '真名', report);
    text = replaceLine(text, /^\|>\|>\|BGCOLOR\(#e6e6fa\):Class\|[^\n]*$/m,
      `|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(${classIcon},icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別|${clean(basic.gender)}|>|BGCOLOR(#e6e6fa):身長|${clean(basic.height)}|>|BGCOLOR(#e6e6fa):体重|${clean(basic.weight)}|`,
      'Class・性別・身長・体重', report);

    text = replaceLine(text, /^\|筋力\|[^\n]*\|耐久\|[^\n]*$/m,
      buildParameterRow('筋力', params.strength, ' ', '耐久', params.endurance), '筋力・耐久', report);
    text = replaceLine(text, /^\|敏捷\|[^\n]*\|魔力\|[^\n]*$/m,
      buildParameterRow('敏捷', params.agility, '~', '魔力', params.magic), '敏捷・魔力', report);
    text = replaceLine(text, /^\|幸運\|[^\n]*\|宝具\|[^\n]*$/m,
      buildParameterRow('幸運', params.luck, '~', '宝具', params.noble), '幸運・宝具', report);

    text = replaceSectionBody(text, 'クラススキル', buildClassSkills(state.classGroups), report);
    text = replaceSectionBody(text, '保有スキル', buildOwnedSkills(state.ownedSkills), report);
    text = replaceSectionBody(text, '宝具', buildNoblePhantasms(state.noblePhantasms), report);
    text = replaceSectionBody(text, '武器', buildWeapon(state.weapon), report);

    return { text, report, fresh: false };
  }

  const core = {
    VERSION, CLASS_DATA, NP_COLORS, SKILL_MASTER,
    defaultState, normalizeState, inferSkillIcon, rankBars, buildParameterRow,
    buildClassSkillBlock, buildClassSkills, buildOwnedSkills, buildNoblePhantasms,
    buildWeapon, buildFreshPage, applyAll
  };

  if (typeof globalThis !== 'undefined') globalThis.FGODataAutofillCore = core;
  if (typeof globalThis !== 'undefined' && globalThis.__FGO_DATA_AUTOFILL_TEST__) return;
  if (typeof document === 'undefined') return;

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

  const classOptions = (selected) => Object.keys(CLASS_DATA).map((name) => `<option value="${escapeHtml(name)}"${name === selected ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('');
  const rankOptions = (selected) => ['EX','A++','A+','A','A-','B++','B+','B','B-','C++','C+','C','C-','D++','D+','D','D-','E++','E+','E','E-','-']
    .map((rank) => `<option value="${rank}"${rank === selected ? ' selected' : ''}>${rank}</option>`).join('');
  const field = (label, html, wide) => `<label class="fda-field${wide ? ' fda-wide' : ''}"><span>${escapeHtml(label)}</span>${html}</label>`;
  const input = (path, value, placeholder) => `<input data-path="${path}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder || '')}">`;
  const textarea = (path, value, placeholder) => `<textarea data-path="${path}" placeholder="${escapeHtml(placeholder || '')}">${escapeHtml(value)}</textarea>`;
  const checkbox = (path, checked, label) => `<label class="fda-check"><input type="checkbox" data-path="${path}"${checked ? ' checked' : ''}>${escapeHtml(label)}</label>`;

  function classGroupHtml(group, groupIndex) {
    let html = `<div class="fda-card"><div class="fda-head"><strong>形態・グループ ${groupIndex + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-class-group" data-group="${groupIndex}">削除</button></div>`;
    html += `<div class="fda-grid">${field('見出し', input(`classGroups.${groupIndex}.heading`, group.heading, '例：〔特殊形態〕'))}${field('クラス', `<select data-class-group="${groupIndex}">${classOptions(group.className)}</select>`)}${field('クラス表記', input(`classGroups.${groupIndex}.className`, group.className))}${field('クラスアイコン', input(`classGroups.${groupIndex}.classIcon`, group.classIcon))}</div>`;
    group.skills.forEach((skill, skillIndex) => {
      const masterOptions = `<option value="">自由入力</option>${SKILL_MASTER.map((master) => `<option value="${master.id}"${master.id === skill.masterId ? ' selected' : ''}>${escapeHtml(master.name)}</option>`).join('')}`;
      html += `<div class="fda-subcard"><div class="fda-head"><strong>クラススキル ${skillIndex + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-class-skill" data-group="${groupIndex}" data-skill="${skillIndex}">削除</button></div><div class="fda-grid">`;
      html += field('登録済みデータ', `<select data-master="${groupIndex}:${skillIndex}">${masterOptions}</select>`);
      html += field('表示名', input(`classGroups.${groupIndex}.skills.${skillIndex}.name`, skill.name, '陣地作成 B+'));
      html += field('スキルアイコン', input(`classGroups.${groupIndex}.skills.${skillIndex}.icon`, skill.icon, '陣地作成.png'));
      html += field('フレーバーテキスト', textarea(`classGroups.${groupIndex}.skills.${skillIndex}.description`, skill.description), true);
      html += field('特殊ブロック直接指定', textarea(`classGroups.${groupIndex}.skills.${skillIndex}.rawBlock`, skill.rawBlock, '入力時は通常項目より優先されます'), true);
      html += `</div>${checkbox(`classGroups.${groupIndex}.skills.${skillIndex}.rawWiki`, skill.rawWiki, 'フレーバーテキストをWiki記法のまま出力')}</div>`;
    });
    html += `<div class="fda-actions"><button type="button" class="fda-btn sub" data-action="add-class-skill" data-group="${groupIndex}">このグループにスキルを追加</button></div></div>`;
    return html;
  }

  function ownedSkillHtml(skill, index) {
    const e = skill.enhanced;
    return `<div class="fda-card"><div class="fda-head"><strong>保有スキル ${index + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-owned-skill" data-index="${index}">削除</button></div><div class="fda-grid">
      ${field('見出し番号', input(`ownedSkills.${index}.label`, skill.label, 'Skill1'))}
      ${field('スキル名', input(`ownedSkills.${index}.name`, skill.name))}
      ${field('アイコン', input(`ownedSkills.${index}.icon`, skill.icon))}
      ${field('解説', textarea(`ownedSkills.${index}.description`, skill.description), true)}
      ${field('特殊ブロック直接指定', textarea(`ownedSkills.${index}.rawBlock`, skill.rawBlock), true)}
    </div>${checkbox(`ownedSkills.${index}.rawWiki`, skill.rawWiki, '解説をWiki記法のまま出力')}
    ${checkbox(`ownedSkills.${index}.enhancedEnabled`, skill.enhancedEnabled, '強化後データを出力')}
    ${skill.enhancedEnabled ? `<details class="fda-details" open><summary>強化後</summary><div class="fda-grid">${field('強化後スキル名', input(`ownedSkills.${index}.enhanced.name`, e.name))}${field('強化後アイコン', input(`ownedSkills.${index}.enhanced.icon`, e.icon))}${field('強化後解説', textarea(`ownedSkills.${index}.enhanced.description`, e.description), true)}${field('強化後特殊ブロック', textarea(`ownedSkills.${index}.enhanced.rawBlock`, e.rawBlock), true)}</div>${checkbox(`ownedSkills.${index}.enhanced.rawWiki`, e.rawWiki, '強化後解説をWiki記法のまま出力')}</details>` : ''}</div>`;
  }

  function nobleHtml(np, index) {
    const e = np.enhanced;
    const common = (base, prefix) => `<div class="fda-grid">
      ${field('小見出し', input(`${prefix}.heading`, base.heading || '', '複数宝具時など'))}
      ${field('宝具名の読み', input(`${prefix}.reading`, base.reading))}
      ${field('宝具名', input(`${prefix}.name`, base.name))}
      ${field('ランク', input(`${prefix}.rank`, base.rank))}
      ${field('種別', input(`${prefix}.type`, base.type, '対軍宝具'))}
      ${field('カード色', `<select data-np-card="${prefix}">${Object.keys(NP_COLORS).map((card) => `<option value="${card}"${base.card === card ? ' selected' : ''}>${card}</option>`).join('')}</select>`)}
      ${field('レンジ', input(`${prefix}.range`, base.range, '1～50'))}
      ${field('最大補足', input(`${prefix}.maxTargets`, base.maxTargets, '500人'))}
      ${field('解説', textarea(`${prefix}.description`, base.description), true)}
      ${field('宝具ブロック直接指定', textarea(`${prefix}.rawBlock`, base.rawBlock, '真名隠しなど特殊構造はこちら'), true)}
    </div>${checkbox(`${prefix}.rawWiki`, base.rawWiki, '解説をWiki記法のまま出力')}`;
    return `<div class="fda-card"><div class="fda-head"><strong>宝具 ${index + 1}</strong><button type="button" class="fda-btn danger" data-action="delete-np" data-index="${index}">削除</button></div>${common(np, `noblePhantasms.${index}`)}${checkbox(`noblePhantasms.${index}.enhancedEnabled`, np.enhancedEnabled, '強化後宝具を出力')}${np.enhancedEnabled ? `<details class="fda-details" open><summary>強化後</summary>${common(e, `noblePhantasms.${index}.enhanced`)}</details>` : ''}</div>`;
  }

  function render(root, state) {
    root.innerHTML = `<form class="fda"><h2>FGO データオートフィル</h2><div class="fda-version">ver ${VERSION}</div><p class="fda-lead">No・基本情報・パラメーター・クラススキル・保有スキル・宝具・武器を入力し、既存のPukiWikiコードへ反映します。元コードが空欄の場合は新規ページ全体を生成します。</p>
      <section class="fda-sec"><h3>No・基本情報</h3><div class="fda-grid">
        ${field('No.', input('basic.no', state.basic.no, '109'))}
        ${field('真名', input('basic.trueName', state.basic.trueName, 'エリセ・クリステンセン'))}
        ${field('クラス', `<select data-basic-class>${classOptions(state.basic.className)}</select>`)}
        ${field('クラス表記', input('basic.className', state.basic.className))}
        ${field('クラスアイコン', input('basic.classIcon', state.basic.classIcon))}
        ${field('性別', input('basic.gender', state.basic.gender, '女性'))}
        ${field('身長', input('basic.height', state.basic.height, '156cm'))}
        ${field('体重', input('basic.weight', state.basic.weight, '39kg'))}
      </div>${checkbox('basic.trueNameRawWiki', state.basic.trueNameRawWiki, '真名をWiki記法のまま出力')}</section>
      <section class="fda-sec"><h3>パラメーター</h3><div class="fda-grid">
        ${field('筋力', `<select data-path="parameters.strength">${rankOptions(state.parameters.strength)}</select>`)}
        ${field('耐久', `<select data-path="parameters.endurance">${rankOptions(state.parameters.endurance)}</select>`)}
        ${field('敏捷', `<select data-path="parameters.agility">${rankOptions(state.parameters.agility)}</select>`)}
        ${field('魔力', `<select data-path="parameters.magic">${rankOptions(state.parameters.magic)}</select>`)}
        ${field('幸運', `<select data-path="parameters.luck">${rankOptions(state.parameters.luck)}</select>`)}
        ${field('宝具', `<select data-path="parameters.noble">${rankOptions(state.parameters.noble)}</select>`)}
      </div></section>
      <section class="fda-sec"><h3>クラススキル</h3>${state.classGroups.map(classGroupHtml).join('')}<button type="button" class="fda-btn sub" data-action="add-class-group">形態・グループを追加</button></section>
      <section class="fda-sec"><h3>保有スキル</h3>${state.ownedSkills.map(ownedSkillHtml).join('')}<button type="button" class="fda-btn sub" data-action="add-owned-skill">保有スキルを追加</button></section>
      <section class="fda-sec"><h3>宝具</h3>${state.noblePhantasms.map(nobleHtml).join('')}<button type="button" class="fda-btn sub" data-action="add-np">宝具を追加</button></section>
      <section class="fda-sec"><h3>武器</h3><div class="fda-grid">${field('武器名', input('weapon.name', state.weapon.name))}${field('解説', textarea('weapon.description', state.weapon.description), true)}${field('武器ブロック直接指定', textarea('weapon.rawBlock', state.weapon.rawBlock), true)}</div>${checkbox('weapon.rawWiki', state.weapon.rawWiki, '解説をWiki記法のまま出力')}</section>
      <section class="fda-sec"><h3>PukiWikiコード</h3><p class="fda-help">既存ページの編集コードを左欄へ貼り付けてください。空欄のまま実行すると全体を新規生成します。</p><div class="fda-split"><div><b>元のコード</b><textarea class="fda-code" data-path="sourceCode">${escapeHtml(state.sourceCode)}</textarea></div><div><b>反映後のコード</b><textarea class="fda-code" data-output readonly>${escapeHtml(state.outputCode)}</textarea></div></div>${state.message ? `<p class="fda-msg${state.report && state.report.missing.length ? ' warn' : ''}">${escapeHtml(state.message)}</p>` : ''}<div class="fda-actions"><button type="button" class="fda-btn" data-action="apply">全データを反映</button><button type="button" class="fda-btn" data-action="copy-all">反映後コードを一括コピー</button><button type="button" class="fda-btn sub" data-action="clear-output">出力をクリア</button></div></section>
    </form>`;
  }

  function setPath(object, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const parent = keys.reduce((current, key) => current[key], object);
    parent[last] = value;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return Promise.resolve();
  }

  function saveState(state) {
    try {
      const saved = clone(state);
      saved.outputCode = '';
      saved.message = '';
      saved.report = null;
      window.name = STATE_KEY + JSON.stringify(saved);
    } catch (_) {
      // 保存不可の環境でも本体は継続する。
    }
  }

  function loadState() {
    try {
      if (!window.name.startsWith(STATE_KEY)) return null;
      return normalizeState(JSON.parse(window.name.slice(STATE_KEY.length)));
    } catch (_) {
      return null;
    }
  }

  function mount(root) {
    let state = loadState() || defaultState();

    function refresh() {
      render(root, state);
    }

    root.addEventListener('input', (event) => {
      const element = event.target;
      const path = element.dataset.path;
      if (!path) return;
      setPath(state, path, element.type === 'checkbox' ? element.checked : element.value);
      saveState(state);
    });

    root.addEventListener('change', (event) => {
      const element = event.target;
      if (element.dataset.path) {
        setPath(state, element.dataset.path, element.type === 'checkbox' ? element.checked : element.value);
        saveState(state);
        if (element.type === 'checkbox' && /enhancedEnabled$/.test(element.dataset.path)) refresh();
        return;
      }
      if (element.hasAttribute('data-basic-class')) {
        state.basic.className = element.value;
        state.basic.classIcon = CLASS_DATA[element.value];
        saveState(state); refresh(); return;
      }
      if (element.dataset.classGroup != null) {
        const index = Number(element.dataset.classGroup);
        state.classGroups[index].className = element.value;
        state.classGroups[index].classIcon = CLASS_DATA[element.value];
        saveState(state); refresh(); return;
      }
      if (element.dataset.master) {
        const [groupIndex, skillIndex] = element.dataset.master.split(':').map(Number);
        const master = SKILL_MASTER.find((item) => item.id === element.value);
        const skill = state.classGroups[groupIndex].skills[skillIndex];
        skill.masterId = element.value;
        if (master) Object.assign(skill, { name: master.name, icon: master.icon, description: master.flavor });
        saveState(state); refresh(); return;
      }
      if (element.dataset.npCard) {
        setPath(state, `${element.dataset.npCard}.card`, element.value);
        saveState(state);
      }
    });

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'add-class-group') state.classGroups.push(newClassGroup({ className: state.basic.className, classIcon: state.basic.classIcon }));
      else if (action === 'delete-class-group' && state.classGroups.length > 1) state.classGroups.splice(Number(button.dataset.group), 1);
      else if (action === 'add-class-skill') state.classGroups[Number(button.dataset.group)].skills.push(newClassSkill());
      else if (action === 'delete-class-skill') {
        const group = state.classGroups[Number(button.dataset.group)];
        if (group.skills.length > 1) group.skills.splice(Number(button.dataset.skill), 1);
      }
      else if (action === 'add-owned-skill') state.ownedSkills.push(newOwnedSkill(state.ownedSkills.length));
      else if (action === 'delete-owned-skill' && state.ownedSkills.length > 1) state.ownedSkills.splice(Number(button.dataset.index), 1);
      else if (action === 'add-np') state.noblePhantasms.push(newNoblePhantasm());
      else if (action === 'delete-np' && state.noblePhantasms.length > 1) state.noblePhantasms.splice(Number(button.dataset.index), 1);
      else if (action === 'apply') {
        const result = applyAll(state.sourceCode, state);
        state.outputCode = result.text;
        state.report = result.report;
        const replaced = result.report.replaced.length;
        const missing = result.report.missing.length;
        state.message = result.fresh
          ? '元のコードが空欄のため、新規ページ全体を生成しました。'
          : `反映完了：${replaced}項目${missing ? `／未検出${missing}項目（${result.report.missing.join('、')}）` : ''}`;
      }
      else if (action === 'copy-all') {
        copyText(state.outputCode).then(() => {
          state.message = '反映後コードをコピーしました。'; refresh();
        });
        return;
      }
      else if (action === 'clear-output') {
        state.outputCode = ''; state.message = ''; state.report = null;
      }
      else return;
      saveState(state); refresh();
    });

    refresh();
  }

  function boot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      (document.querySelector('#wikibody,#contents,#content,main') || document.body).appendChild(root);
    }
    if (root.dataset.mounted) return;
    root.dataset.mounted = '1';
    installStyle();
    mount(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
