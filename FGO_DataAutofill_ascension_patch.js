(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill core is not loaded.');

  const VERSION = '2.6.1';
  const clean = internal.clean;
  const NP_COLORS = core.NP_COLORS;
  const originalDefaultState = core.defaultState;
  const originalNormalizeState = core.normalizeState;
  const originalBuildFreshPage = core.buildFreshPage;
  const originalApplyAll = core.applyAll;

  function blankSkillData(data) {
    return Object.assign({
      name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false
    }, data || {});
  }

  function blankNpData(data) {
    return Object.assign({
      reading: '', name: '', rank: '', type: '対宝具', card: 'Buster',
      range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: ''
    }, data || {});
  }

  function normalizeMode(value, hasLegacyNameChange) {
    const mode = clean(value);
    if (mode === 'nameOnly' || mode === 'full') return mode;
    return hasLegacyNameChange ? 'nameOnly' : 'none';
  }

  function skillAscensionNames(value) {
    const source = value && typeof value === 'object' ? value : {};
    return { second: clean(source.second), third: clean(source.third) };
  }

  function npAscensionNames(value) {
    const source = value && typeof value === 'object' ? value : {};
    const stage = (key) => {
      const item = source[key] && typeof source[key] === 'object' ? source[key] : {};
      return { reading: clean(item.reading), name: clean(item.name) };
    };
    return { second: stage('second'), third: stage('third') };
  }

  function normalizeSkillSpecial(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      enabled: Boolean(source.enabled),
      condition: clean(source.condition),
      data: blankSkillData(source.data)
    };
  }

  function normalizeNpSpecial(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      enabled: Boolean(source.enabled),
      condition: clean(source.condition),
      data: blankNpData(source.data)
    };
  }

  function ensureSkillVariantConfig(data) {
    const names = skillAscensionNames(data.ascensionNames);
    data.ascensionMode = normalizeMode(data.ascensionMode, Boolean(names.second || names.third));
    data.ascensionNames = names;
    const ascensionData = data.ascensionData && typeof data.ascensionData === 'object' ? data.ascensionData : {};
    data.ascensionData = {
      second: blankSkillData(ascensionData.second),
      third: blankSkillData(ascensionData.third)
    };
    data.special = normalizeSkillSpecial(data.special);
    return data;
  }

  function ensureNpVariantConfig(data) {
    const names = npAscensionNames(data.ascensionNames);
    const hasLegacy = Boolean(
      names.second.reading || names.second.name || names.third.reading || names.third.name
    );
    data.ascensionMode = normalizeMode(data.ascensionMode, hasLegacy);
    data.ascensionNames = names;
    const ascensionData = data.ascensionData && typeof data.ascensionData === 'object' ? data.ascensionData : {};
    data.ascensionData = {
      second: blankNpData(ascensionData.second),
      third: blankNpData(ascensionData.third)
    };
    data.special = normalizeNpSpecial(data.special);
    return data;
  }

  function normalizeFixedState(state) {
    const skills = Array.isArray(state.ownedSkills) ? state.ownedSkills.slice(0, 3) : [];
    while (skills.length < 3) skills.push(internal.newOwnedSkill(skills.length));
    state.ownedSkills = skills.map((skill, index) => {
      skill.label = clean(skill.label) || `Skill${index + 1}`;
      ensureSkillVariantConfig(skill);
      ensureSkillVariantConfig(skill.enhanced);
      ensureSkillVariantConfig(skill.enhanced2);
      return skill;
    });

    const nps = Array.isArray(state.noblePhantasms) ? state.noblePhantasms.slice(0, 1) : [];
    while (nps.length < 1) nps.push(internal.newNoblePhantasm());
    state.noblePhantasms = nps.map((np) => {
      np.heading = clean(np.heading);
      ensureNpVariantConfig(np);
      ensureNpVariantConfig(np.enhanced);
      ensureNpVariantConfig(np.enhanced2);
      return np;
    });
    return state;
  }

  core.VERSION = VERSION;

  core.defaultState = function () {
    return normalizeFixedState(originalDefaultState());
  };

  core.normalizeState = function (value) {
    return normalizeFixedState(originalNormalizeState(value));
  };

  function ensurePng(value, fallback) {
    const text = clean(value) || clean(fallback);
    if (!text) return '0.png';
    return /\.[a-z0-9]+$/i.test(text) ? text : `${text}.png`;
  }

  function skillTable(data) {
    if (clean(data.rawBlock)) return clean(data.rawBlock);
    const icon = ensurePng(data.icon, core.inferSkillIcon(data.name));
    return [
      '|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c',
      `|BGCOLOR(#e6e6fa):CENTER:&ref(${icon},icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|`,
      `|~|${core.skillDescription(data)}|`
    ].join('\n');
  }

  function hasSkillData(data) {
    if (!data) return false;
    const icon = clean(data.icon);
    return Boolean(clean(data.name) || clean(data.description) || clean(data.rawBlock) || (icon && icon !== '0.png'));
  }

  function disabledSkillEnhancement(label, stage) {
    const title = stage === 2 ? '強化後2' : '強化後';
    const table = skillTable(blankSkillData());
    return [
      `//#region(close,${title})`,
      `//***${label}[${title}]：`,
      ...table.split('\n').map((line) => `//${line}`),
      '//#endregion'
    ].join('\n');
  }

  function conditionWithSuffix(condition, suffix) {
    const base = clean(condition);
    return suffix ? `${base}・${suffix}` : base;
  }

  function headingWithCondition(label, condition, suffix) {
    return `${label}[${conditionWithSuffix(condition, suffix)}]`;
  }

  function groupedSkillNameChanges(data) {
    const names = skillAscensionNames(data.ascensionNames);
    if (names.second && names.third && names.second === names.third) {
      return [{ condition: '第二・第三再臨時', name: names.second }];
    }
    const changes = [];
    if (names.second) changes.push({ condition: '第二再臨時', name: names.second });
    if (names.third) changes.push({ condition: '第三再臨時', name: names.third });
    return changes;
  }

  function skillNameOnlyBlocks(label, data, suffix) {
    const blocks = [];
    groupedSkillNameChanges(data).forEach((change) => {
      blocks.push(`#region(${change.condition})`);
      blocks.push(`***${headingWithCondition(label, change.condition, suffix)}：${change.name}`);
      blocks.push('#endregion');
    });
    return blocks;
  }

  function skillSpecialBlocks(label, data, suffix) {
    const special = normalizeSkillSpecial(data.special);
    if (!special.enabled) return [];
    const condition = special.condition || '特殊条件時';
    return [
      `#region(close,${condition})`,
      `***${headingWithCondition(label, condition, suffix)}：${clean(special.data.name)}`,
      skillTable(special.data),
      '#endregion'
    ];
  }

  function buildSkillVariant(label, data, suffix) {
    const mode = normalizeMode(data.ascensionMode, false);
    const output = [];
    if (mode === 'full') {
      const firstCondition = '第一再臨時';
      output.push(`***${headingWithCondition(label, firstCondition, suffix)}：${clean(data.name)}`);
      output.push(skillTable(data));
      [['second', '第二再臨時'], ['third', '第三再臨時']].forEach(([key, condition]) => {
        const stage = data.ascensionData && data.ascensionData[key];
        if (!hasSkillData(stage)) return;
        output.push(`***${headingWithCondition(label, condition, suffix)}：${clean(stage.name)}`);
        output.push(skillTable(stage));
      });
    } else {
      const baseHeading = suffix ? `${label}[${suffix}]` : label;
      output.push(`***${baseHeading}：${clean(data.name)}`);
      if (mode === 'nameOnly') output.push(...skillNameOnlyBlocks(label, data, suffix));
      output.push(skillTable(data));
    }
    output.push(...skillSpecialBlocks(label, data, suffix));
    return output;
  }

  function extractOwnedTemplates(body) {
    const lines = body.split('\n');
    const kept = [];
    const templates = {};
    for (let index = 0; index < lines.length; index += 1) {
      const start = /^\/\/#region\(close,(強化後|強化後2)\)$/.exec(lines[index].trim());
      if (!start) {
        kept.push(lines[index]);
        continue;
      }
      let end = index + 1;
      let label = '';
      while (end < lines.length && lines[end].trim() !== '//#endregion') {
        const heading = /^\/\/\*\*\*([^\[]+)\[(強化後|強化後2)\]：/.exec(lines[end].trim());
        if (heading) label = heading[1];
        end += 1;
      }
      if (label && end < lines.length) {
        const stage = start[1] === '強化後2' ? 2 : 1;
        templates[`${label}:${stage}`] = lines.slice(index, end + 1).join('\n');
        index = end;
      } else {
        kept.push(lines[index]);
      }
    }
    return { body: kept.join('\n'), templates };
  }

  function buildOwnedSkills(skills, templates) {
    const output = [];
    skills.forEach((skill, index) => {
      const label = clean(skill.label) || `Skill${index + 1}`;
      output.push(...buildSkillVariant(label, skill, ''));

      if (skill.enhancedEnabled) {
        output.push('#region(close,強化後)');
        output.push(...buildSkillVariant(label, skill.enhanced, '強化後'));
        output.push('#endregion');
      } else {
        output.push(templates[`${label}:1`] || disabledSkillEnhancement(label, 1));
      }

      if (skill.enhanced2Enabled) {
        output.push('#region(close,強化後2)');
        output.push(...buildSkillVariant(label, skill.enhanced2, '強化後2'));
        output.push('#endregion');
      } else {
        output.push(templates[`${label}:2`] || disabledSkillEnhancement(label, 2));
      }
    });
    return output.join('\n');
  }

  function npTable(data, overrideNames) {
    if (clean(data.rawBlock)) return clean(data.rawBlock);
    const names = overrideNames || {};
    const reading = clean(names.reading) || clean(data.reading);
    const name = clean(names.name) || clean(data.name);
    const title = [reading, name].filter(Boolean).join('&br()');
    const color = NP_COLORS[data.card] || NP_COLORS.Buster;
    const detail = `&font(b,110%){レンジ：${clean(data.range)}　最大捕捉：${clean(data.maxTargets)}}`;
    const description = clean(data.description)
      ? (data.rawWiki ? clean(data.description) : clean(data.description).replace(/\n/g, '&br()'))
      : '';
    return [
      '|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c',
      `|>|>|~${title}|`,
      '|ランク|種別|解説|',
      `|BGCOLOR(${color}):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c`,
      `|${clean(data.rank)}|${clean(data.type) || '対宝具'}|${detail}${description ? `&br()${description}` : ''}|`
    ].join('\n');
  }

  function hasNpData(data) {
    if (!data) return false;
    return Boolean(
      clean(data.reading) || clean(data.name) || clean(data.rank) || clean(data.range) || clean(data.maxTargets) ||
      clean(data.description) || clean(data.rawBlock) || (clean(data.type) && clean(data.type) !== '対宝具') ||
      (clean(data.card) && clean(data.card) !== 'Buster')
    );
  }

  function sameNpNameChange(a, b) {
    return Boolean(
      (a.reading || a.name) &&
      a.reading === b.reading &&
      a.name === b.name
    );
  }

  function groupedNpNameChanges(data) {
    const names = npAscensionNames(data.ascensionNames);
    if (sameNpNameChange(names.second, names.third)) {
      return [{ condition: '第二・第三再臨時', names: names.second }];
    }
    const changes = [];
    if (names.second.reading || names.second.name) changes.push({ condition: '第二再臨時', names: names.second });
    if (names.third.reading || names.third.name) changes.push({ condition: '第三再臨時', names: names.third });
    return changes;
  }

  function npConditionHeading(baseHeading, condition, suffix) {
    return `${baseHeading}[${conditionWithSuffix(condition, suffix)}]`;
  }

  function npNameOnlyBlocks(data, baseHeading, suffix) {
    const blocks = [];
    groupedNpNameChanges(data).forEach((change) => {
      blocks.push(`#region(close,${change.condition})`);
      blocks.push(`***${npConditionHeading(baseHeading, change.condition, suffix)}`);
      blocks.push(npTable(data, change.names));
      blocks.push('#endregion');
    });
    return blocks;
  }

  function npSpecialBlocks(data, baseHeading, suffix) {
    const special = normalizeNpSpecial(data.special);
    if (!special.enabled) return [];
    const condition = special.condition || '特殊条件時';
    return [
      `#region(close,${condition})`,
      `***${npConditionHeading(baseHeading, condition, suffix)}`,
      npTable(special.data),
      '#endregion'
    ];
  }

  function buildNpVariant(data, suffix, fallbackHeading) {
    const mode = normalizeMode(data.ascensionMode, false);
    const baseHeading = clean(data.heading) || clean(fallbackHeading) || '宝具';
    const output = [];
    if (mode === 'full') {
      const firstCondition = '第一再臨時';
      output.push(`***${npConditionHeading(baseHeading, firstCondition, suffix)}`);
      output.push(npTable(data));
      [['second', '第二再臨時'], ['third', '第三再臨時']].forEach(([key, condition]) => {
        const stage = data.ascensionData && data.ascensionData[key];
        if (!hasNpData(stage)) return;
        output.push(`***${npConditionHeading(baseHeading, condition, suffix)}`);
        output.push(npTable(stage));
      });
    } else {
      if (clean(data.heading)) {
        const normalHeading = suffix ? `${baseHeading}[${suffix}]` : baseHeading;
        output.push(`***${normalHeading}`);
      }
      output.push(npTable(data));
      if (mode === 'nameOnly') output.push(...npNameOnlyBlocks(data, baseHeading, suffix));
    }
    output.push(...npSpecialBlocks(data, baseHeading, suffix));
    return output;
  }

  function buildNoblePhantasm(np) {
    const baseHeading = clean(np.heading) || '宝具';
    const output = buildNpVariant(np, '', baseHeading);
    if (np.enhancedEnabled) {
      output.push('#region(close,強化後)');
      output.push('#br');
      output.push(...buildNpVariant(np.enhanced, '強化後', baseHeading));
      output.push('#endregion');
    }
    if (np.enhanced2Enabled) {
      output.push('#region(close,強化後2)');
      output.push('#br');
      output.push(...buildNpVariant(np.enhanced2, '強化後2', baseHeading));
      output.push('#endregion');
    }
    return output.join('\n');
  }

  function sectionBounds(text, heading) {
    const pattern = new RegExp(`^\\*\\*${heading}[^\\n]*$`, 'm');
    const match = pattern.exec(text);
    if (!match) return null;
    const headingEnd = match.index + match[0].length;
    const bodyStart = text[headingEnd] === '\n' ? headingEnd + 1 : headingEnd;
    const remainder = text.slice(bodyStart);
    const divider = /^\/\/─┤[^\n]*$/m.exec(remainder);
    const nextHeading = /^\*\*[^*\n][^\n]*$/m.exec(remainder);
    let relativeEnd = remainder.length;
    if (divider) relativeEnd = Math.min(relativeEnd, divider.index);
    if (nextHeading) relativeEnd = Math.min(relativeEnd, nextHeading.index);
    return { bodyStart, bodyEnd: bodyStart + relativeEnd };
  }

  function mergeManagedBody(originalBody, generatedBody, heading) {
    const lines = originalBody.split('\n');
    const kept = [];
    let insertAt = null;
    lines.forEach((line) => {
      const text = line.trim();
      let managed = false;
      if (text && !text.startsWith('//')) {
        if (text.startsWith('|')) managed = true;
        else if (heading === '保有スキル') managed = /^\*\*\*/.test(text) || /^#(?:region|endregion)\b/.test(text);
        else if (heading === '宝具') managed = /^\*\*\*/.test(text) || /^#(?:region|endregion|br)\b/.test(text);
      }
      if (managed) {
        if (insertAt === null) insertAt = kept.length;
      } else {
        kept.push(line);
      }
    });
    if (insertAt === null) insertAt = 0;
    kept.splice(insertAt, 0, ...generatedBody.split('\n'));
    return kept.join('\n');
  }

  function replaceSection(text, heading, generatedBody, preprocess) {
    const bounds = sectionBounds(text, heading);
    if (!bounds) return text;
    let originalBody = text.slice(bounds.bodyStart, bounds.bodyEnd);
    if (preprocess) originalBody = preprocess(originalBody);
    const merged = mergeManagedBody(originalBody, generatedBody, heading);
    return `${text.slice(0, bounds.bodyStart)}${merged}${text.slice(bounds.bodyEnd)}`;
  }

  function applyVariantOutput(text, state) {
    const bounds = sectionBounds(text, '保有スキル');
    const body = bounds ? text.slice(bounds.bodyStart, bounds.bodyEnd) : '';
    const extracted = extractOwnedTemplates(body);
    text = replaceSection(text, '保有スキル', buildOwnedSkills(state.ownedSkills, extracted.templates), () => extracted.body);
    text = replaceSection(text, '宝具', buildNoblePhantasm(state.noblePhantasms[0]));
    return text;
  }

  core.buildFreshPage = function (rawState) {
    const state = core.normalizeState(rawState);
    return applyVariantOutput(originalBuildFreshPage(state), state);
  };

  core.applyAll = function (sourceCode, rawState) {
    const state = core.normalizeState(rawState);
    const result = originalApplyAll(sourceCode, state);
    result.text = applyVariantOutput(result.text, state);
    return result;
  };

  core.buildOwnedSkillsWithAscension = buildOwnedSkills;
  core.buildNoblePhantasmWithAscension = buildNoblePhantasm;
  core.normalizeSkillSpecial = normalizeSkillSpecial;
  core.normalizeNpSpecial = normalizeNpSpecial;
})();
