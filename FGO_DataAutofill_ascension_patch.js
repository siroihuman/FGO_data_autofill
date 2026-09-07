(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill core is not loaded.');

  const VERSION = '2.5.0';
  const clean = internal.clean;
  const NP_COLORS = core.NP_COLORS;
  const originalDefaultState = core.defaultState;
  const originalNormalizeState = core.normalizeState;
  const originalBuildFreshPage = core.buildFreshPage;
  const originalApplyAll = core.applyAll;

  function skillAscensionNames(value) {
    const source = value && typeof value === 'object' ? value : {};
    return { second: clean(source.second), third: clean(source.third) };
  }

  function npAscensionNames(value) {
    const source = value && typeof value === 'object' ? value : {};
    const normalizeStage = (stage) => {
      const item = source[stage] && typeof source[stage] === 'object' ? source[stage] : {};
      return { reading: clean(item.reading), name: clean(item.name) };
    };
    return { second: normalizeStage('second'), third: normalizeStage('third') };
  }

  function ensureSkillAscension(data) {
    data.ascensionNames = skillAscensionNames(data.ascensionNames);
    return data;
  }

  function ensureNpAscension(data) {
    data.ascensionNames = npAscensionNames(data.ascensionNames);
    return data;
  }

  function normalizeFixedState(state) {
    const skills = Array.isArray(state.ownedSkills) ? state.ownedSkills.slice(0, 3) : [];
    while (skills.length < 3) skills.push(internal.newOwnedSkill(skills.length));
    state.ownedSkills = skills.map((skill, index) => {
      skill.label = `Skill${index + 1}`;
      ensureSkillAscension(skill);
      ensureSkillAscension(skill.enhanced);
      ensureSkillAscension(skill.enhanced2);
      return skill;
    });

    const nps = Array.isArray(state.noblePhantasms) ? state.noblePhantasms.slice(0, 1) : [];
    while (nps.length < 1) nps.push(internal.newNoblePhantasm());
    state.noblePhantasms = nps.map((np) => {
      np.heading = '';
      ensureNpAscension(np);
      ensureNpAscension(np.enhanced);
      ensureNpAscension(np.enhanced2);
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

  function disabledSkillEnhancement(label, stage) {
    const title = stage === 2 ? '強化後2' : '強化後';
    const table = skillTable({ name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '' });
    return [
      `//#region(close,${title})`,
      `//***${label}[${title}]：`,
      ...table.split('\n').map((line) => `//${line}`),
      '//#endregion'
    ].join('\n');
  }

  function skillAscensionBlocks(label, data, headingSuffix) {
    const names = skillAscensionNames(data.ascensionNames);
    const blocks = [];
    [['second', '第二再臨後'], ['third', '第三再臨後']].forEach(([key, title]) => {
      if (!names[key]) return;
      blocks.push(`#region(close,${title})`);
      blocks.push(`***${label}${headingSuffix}：${names[key]}`);
      blocks.push(skillTable(data));
      blocks.push('#endregion');
    });
    return blocks;
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
        const heading = /^\/\/\*\*\*(Skill\d+)\[(強化後|強化後2)\]：/.exec(lines[end].trim());
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
      const label = `Skill${index + 1}`;
      output.push(`***${label}：${clean(skill.name)}`);
      output.push(skillTable(skill));
      output.push(...skillAscensionBlocks(label, skill, ''));

      if (skill.enhancedEnabled) {
        output.push('#region(close,強化後)');
        output.push(`***${label}[強化後]：${clean(skill.enhanced.name)}`);
        output.push(skillTable(skill.enhanced));
        output.push(...skillAscensionBlocks(label, skill.enhanced, '[強化後]'));
        output.push('#endregion');
      } else {
        output.push(templates[`${label}:1`] || disabledSkillEnhancement(label, 1));
      }

      if (skill.enhanced2Enabled) {
        output.push('#region(close,強化後2)');
        output.push(`***${label}[強化後2]：${clean(skill.enhanced2.name)}`);
        output.push(skillTable(skill.enhanced2));
        output.push(...skillAscensionBlocks(label, skill.enhanced2, '[強化後2]'));
        output.push('#endregion');
      } else {
        output.push(templates[`${label}:2`] || disabledSkillEnhancement(label, 2));
      }
    });
    return output.join('\n');
  }

  function npTable(data, override) {
    if (clean(data.rawBlock)) return clean(data.rawBlock);
    const names = override || {};
    const reading = clean(names.reading) || clean(data.reading);
    const name = clean(names.name) || clean(data.name);
    const title = [reading, name].filter(Boolean).join('&br()');
    const color = NP_COLORS[data.card] || NP_COLORS.Buster;
    const detail = `&font(b,110%){レンジ：${clean(data.range)}　最大捕捉：${clean(data.maxTargets)}}`;
    const description = clean(data.description) ? (data.rawWiki ? clean(data.description) : clean(data.description).replace(/\n/g, '&br()')) : '';
    return [
      '|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c',
      `|>|>|~${title}|`,
      '|ランク|種別|解説|',
      `|BGCOLOR(${color}):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c`,
      `|${clean(data.rank)}|${clean(data.type) || '対宝具'}|${detail}${description ? `&br()${description}` : ''}|`
    ].join('\n');
  }

  function npAscensionBlocks(data) {
    const names = npAscensionNames(data.ascensionNames);
    const blocks = [];
    [['second', '第二再臨後'], ['third', '第三再臨後']].forEach(([key, title]) => {
      const stage = names[key];
      if (!stage.reading && !stage.name) return;
      blocks.push(`#region(close,${title})`);
      blocks.push(npTable(data, stage));
      blocks.push('#endregion');
    });
    return blocks;
  }

  function buildNoblePhantasm(np) {
    const output = [npTable(np), ...npAscensionBlocks(np)];
    if (np.enhancedEnabled) {
      output.push('#region(close,強化後)');
      output.push('#br');
      output.push(npTable(np.enhanced));
      output.push(...npAscensionBlocks(np.enhanced));
      output.push('#endregion');
    }
    if (np.enhanced2Enabled) {
      output.push('#region(close,強化後2)');
      output.push('#br');
      output.push(npTable(np.enhanced2));
      output.push(...npAscensionBlocks(np.enhanced2));
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
        else if (heading === '保有スキル') managed = /^\*\*\*Skill/.test(text) || /^#(?:region|endregion)\b/.test(text);
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

  function applyAscensionOutput(text, state) {
    const extracted = extractOwnedTemplates((() => {
      const bounds = sectionBounds(text, '保有スキル');
      return bounds ? text.slice(bounds.bodyStart, bounds.bodyEnd) : '';
    })());
    text = replaceSection(text, '保有スキル', buildOwnedSkills(state.ownedSkills, extracted.templates), () => extracted.body);
    text = replaceSection(text, '宝具', buildNoblePhantasm(state.noblePhantasms[0]));
    return text;
  }

  core.buildFreshPage = function (rawState) {
    const state = core.normalizeState(rawState);
    return applyAscensionOutput(originalBuildFreshPage(state), state);
  };

  core.applyAll = function (sourceCode, rawState) {
    const state = core.normalizeState(rawState);
    const result = originalApplyAll(sourceCode, state);
    result.text = applyAscensionOutput(result.text, state);
    return result;
  };

  core.buildOwnedSkillsWithAscension = buildOwnedSkills;
  core.buildNoblePhantasmWithAscension = buildNoblePhantasm;
})();
