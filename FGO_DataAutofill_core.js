(function () {
  'use strict';

  const VERSION = '2.1.1';
  const ROOT_ID = 'fgo-data-autofill';
  const STATE_KEY = 'fgo-data-autofill:v4:';

  const CLASS_DATA = {
    'セイバー': '剣', 'アーチャー': '弓', 'ランサー': '槍',
    'ライダー': '騎', 'キャスター': '術', 'アサシン': '殺',
    'バーサーカー': '狂', 'シールダー': '盾', 'ルーラー': '裁',
    'アヴェンジャー': '讐', 'ムーンキャンサー': '月',
    'アルターエゴ': '分', 'フォーリナー': '降',
    'プリテンダー': '詐', 'ビースト': '獣'
  };

  const RARITY_ICON_SUFFIX = { 1: '銅', 2: '銅', 3: '銀', 4: '金', 5: '金' };
  const SKILL_NOBLE_PREFIX = '&font(b,110%){種別：対宝具　レンジ：　最大補足：人}&br()&font(b,105%){“”}&br()';
  const NP_COLORS = { Buster: '#F88', Arts: '#9AF', Quick: '#AF9' };
  const SKILL_MASTER = [];

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

  function classIconSuffix(rarity) {
    return RARITY_ICON_SUFFIX[Number(rarity)] || '金';
  }

  function getClassIcon(className, rarity) {
    const code = CLASS_DATA[clean(className)];
    return code ? `${code}${classIconSuffix(rarity)}.png` : '0.png';
  }

  function syncClassData(state) {
    const className = clean(state.basic.className);
    const classIcon = getClassIcon(className, state.basic.rarity);
    state.basic.classIcon = classIcon;
    state.classGroups.forEach((group) => {
      group.className = className;
      group.classIcon = classIcon;
    });
    return state;
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

  function skillDescription(data) {
    const description = wikiText(data.description, data.rawWiki);
    return data.isNoblePhantasm ? `${SKILL_NOBLE_PREFIX}${description}` : description;
  }

  function wikiTrueName(value, rawWiki) {
    const text = clean(value);
    if (rawWiki) return text;
    if (!text) return '[[]]';
    return /^\[\[.*\]\]$/.test(text) ? text : `[[${text}]]`;
  }

  function withUnit(value, unit) {
    const text = clean(value);
    if (!text) return unit;
    return new RegExp(`${escapeRegExp(unit)}$`, 'i').test(text) ? text : `${text}${unit}`;
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
    return Object.assign({ name: '', icon: '', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false }, data || {});
  }

  function newClassGroup(data) {
    return Object.assign({ heading: '', className: '', classIcon: '0.png', skills: [newClassSkill()] }, data || {});
  }

  function newOwnedSkill(index, data) {
    return Object.assign({
      label: `Skill${index + 1}`, name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false,
      enhancedEnabled: false,
      enhanced: { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false }
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
        rarity: '5', className: '', classIcon: '0.png', gender: '', height: '', weight: ''
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
    const defaults = defaultState();
    const state = Object.assign(defaults, value && typeof value === 'object' ? value : {});
    state.basic = Object.assign(defaults.basic, state.basic || {});
    state.parameters = Object.assign(defaults.parameters, state.parameters || {});
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
    state.weapon = Object.assign(defaults.weapon, state.weapon || {});
    state.basic.rarity = String(state.basic.rarity || '5');
    return syncClassData(state);
  }

  function buildClassSkillBlock(skill, group) {
    if (clean(skill.rawBlock)) return clean(skill.rawBlock);
    const name = clean(skill.name);
    const icon = ensurePng(skill.icon, inferSkillIcon(name));
    const className = clean(group.className);
    const classIcon = ensurePng(group.classIcon, '0.png');
    return [
      '|BGCOLOR(#e6e6fa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c',
      `|&ref(${icon},icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){${name}}&ref(${classIcon},icon/class,title=${className},height=25,width=25)|`,
      `|~|${skillDescription(skill)}|`
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
      `|~|${skillDescription(data)}|`
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

  function isManagedSectionLine(heading, line) {
    const text = line.trim();
    if (!text || text.startsWith('//')) return false;
    if (text.startsWith('|')) return true;
    if (heading === 'クラススキル') return /^\*\*\*/.test(text);
    if (heading === '保有スキル') return /^\*\*\*Skill/.test(text) || /^#(?:region|endregion)\b/.test(text);
    if (heading === '宝具') return /^\*\*\*/.test(text) || /^#(?:region|endregion|br)\b/.test(text);
    return false;
  }

  function mergeSectionBody(originalBody, generatedBody, heading) {
    const lines = originalBody.split('\n');
    const kept = [];
    let insertAt = null;
    lines.forEach((line) => {
      if (isManagedSectionLine(heading, line)) {
        if (insertAt === null) insertAt = kept.length;
        return;
      }
      kept.push(line);
    });
    if (insertAt === null) insertAt = 0;
    const generated = generatedBody ? generatedBody.split('\n') : [];
    kept.splice(insertAt, 0, ...generated);
    return kept.join('\n');
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
    const originalBody = text.slice(bodyStart, bodyEnd);
    const mergedBody = mergeSectionBody(originalBody, body, heading);
    report.replaced.push(`${heading}欄`);
    return `${text.slice(0, bodyStart)}${mergedBody}${text.slice(bodyEnd)}`;
  }

  function buildFreshPage(state) {
    const basic = state.basic;
    const params = state.parameters;
    const classIcon = getClassIcon(basic.className, basic.rarity);
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
      `|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(${classIcon},icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別|${clean(basic.gender)}|>|BGCOLOR(#e6e6fa):身長|${withUnit(basic.height, 'cm')}|>|BGCOLOR(#e6e6fa):体重|${withUnit(basic.weight, 'kg')}|`,
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
    const classIcon = getClassIcon(basic.className, basic.rarity);

    text = replaceLine(text, /^\*No\.[^\n]*$/m, `*No.${clean(basic.no)}`, 'ページ先頭のNo.', report);
    text = replaceLine(text, /^\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|>\|BGCOLOR\(#17184b\):COLOR\(white\):No\.[^\n]*\|$/m,
      `|>|>|>|>|>|>|>|>|>|>|>|>|>|>|BGCOLOR(#17184b):COLOR(white):No.${clean(basic.no)}|`, '基本情報のNo.', report);
    text = replaceLine(text, /^\|>\|>\|BGCOLOR\(#e6e6fa\):真名\|[^\n]*$/m,
      `|>|>|BGCOLOR(#e6e6fa):真名|>|>|>|>|>|>|>|>|>|>|>|${wikiTrueName(basic.trueName, basic.trueNameRawWiki)}|`, '真名', report);
    text = replaceLine(text, /^\|>\|>\|BGCOLOR\(#e6e6fa\):Class\|[^\n]*$/m,
      `|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(${classIcon},icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別|${clean(basic.gender)}|>|BGCOLOR(#e6e6fa):身長|${withUnit(basic.height, 'cm')}|>|BGCOLOR(#e6e6fa):体重|${withUnit(basic.weight, 'kg')}|`,
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
    VERSION, CLASS_DATA, RARITY_ICON_SUFFIX, NP_COLORS, SKILL_MASTER, SKILL_NOBLE_PREFIX,
    defaultState, normalizeState, inferSkillIcon, classIconSuffix, getClassIcon, syncClassData, skillDescription, withUnit,
    rankBars, buildParameterRow, buildClassSkillBlock, buildClassSkills, buildOwnedSkills, buildNoblePhantasms,
    buildWeapon, buildFreshPage, applyAll
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.FGODataAutofillCore = core;
    globalThis.FGODataAutofillInternal = {
      ROOT_ID, STATE_KEY, clean, clone, escapeHtml,
      newClassSkill, newClassGroup, newOwnedSkill, newNoblePhantasm
    };
  }
})();
