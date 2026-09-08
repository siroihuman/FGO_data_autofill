(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill ascension module is not loaded.');

  const VERSION = '2.6.3';
  const clean = internal.clean;
  const originalApplyAll = core.applyAll;
  const originalBuildFreshPage = core.buildFreshPage;
  const originalBuildOwnedSkills = core.buildOwnedSkillsWithAscension;
  const originalBuildNoblePhantasm = core.buildNoblePhantasmWithAscension;

  function stageCondition(start, end) {
    const labels = { 1: '第一', 2: '第二', 3: '第三' };
    const parts = [];
    for (let stage = start; stage <= end; stage += 1) parts.push(labels[stage]);
    return `${parts.join('・')}再臨時`;
  }

  function conditionWithSuffix(condition, suffix) {
    return suffix ? `${condition}・${suffix}` : condition;
  }

  function skillHeading(label, condition, suffix) {
    return `${label}[${conditionWithSuffix(condition, suffix)}]`;
  }

  function npHeading(label, condition, suffix) {
    return `${label}[${conditionWithSuffix(condition, suffix)}]`;
  }

  function hasSkillStageData(data) {
    if (!data || typeof data !== 'object') return false;
    const icon = clean(data.icon);
    return Boolean(
      clean(data.name) || clean(data.description) || clean(data.rawBlock) ||
      (icon && icon !== '0.png')
    );
  }

  function hasNpStageData(data) {
    if (typeof core.hasExplicitNpAscensionStageData === 'function') {
      return core.hasExplicitNpAscensionStageData(data);
    }
    if (!data || typeof data !== 'object') return false;
    return Boolean(
      clean(data.reading) || clean(data.name) || clean(data.rank) ||
      clean(data.range) || clean(data.maxTargets) || clean(data.description) ||
      clean(data.rawBlock)
    );
  }

  function replaceAll(text, before, after) {
    if (!before || before === after) return text;
    return String(text).split(before).join(after);
  }

  function replaceExactLine(text, before, after) {
    if (!before || before === after) return text;
    return String(text).split('\n').map((line) => line === before ? after : line).join('\n');
  }

  function skillNameOnlyPlan(data) {
    const names = data && data.ascensionNames && typeof data.ascensionNames === 'object'
      ? data.ascensionNames : {};
    const second = clean(names.second);
    const third = clean(names.third);
    if (!second && !third) return null;

    const baseCondition = second ? stageCondition(1, 1) : stageCondition(1, 2);
    const changes = [];
    if (second) {
      if (!third || third === second) {
        changes.push({ from: third === second ? stageCondition(2, 3) : stageCondition(2, 2), to: stageCondition(2, 3), name: second });
      } else {
        changes.push({ from: stageCondition(2, 2), to: stageCondition(2, 2), name: second });
        changes.push({ from: stageCondition(3, 3), to: stageCondition(3, 3), name: third });
      }
    } else if (third) {
      changes.push({ from: stageCondition(3, 3), to: stageCondition(3, 3), name: third });
    }
    return { baseCondition, changes };
  }

  function transformSkillNameOnly(text, label, data, suffix) {
    const plan = skillNameOnlyPlan(data);
    if (!plan) return text;

    const name = clean(data.name);
    const oldBaseHeading = suffix ? `${label}[${suffix}]` : label;
    const oldBase = `***${oldBaseHeading}：${name}`;
    const newBase = `***${skillHeading(label, plan.baseCondition, suffix)}：${name}`;
    let output = replaceAll(text, oldBase, newBase);

    plan.changes.forEach((change) => {
      if (change.from === change.to) return;
      const oldPrefix = `#region(${change.from})\n***${skillHeading(label, change.from, suffix)}：${change.name}`;
      const newPrefix = `#region(${change.to})\n***${skillHeading(label, change.to, suffix)}：${change.name}`;
      output = replaceAll(output, oldPrefix, newPrefix);
    });
    return output;
  }

  function transformSkillFull(text, label, data, suffix) {
    const second = data && data.ascensionData ? data.ascensionData.second : null;
    const third = data && data.ascensionData ? data.ascensionData.third : null;
    const hasSecond = hasSkillStageData(second);
    const hasThird = hasSkillStageData(third);
    let output = text;

    if (!hasSecond) {
      const end = hasThird ? 2 : 3;
      const oldHeading = `***${skillHeading(label, stageCondition(1, 1), suffix)}：${clean(data.name)}`;
      const newHeading = `***${skillHeading(label, stageCondition(1, end), suffix)}：${clean(data.name)}`;
      output = replaceAll(output, oldHeading, newHeading);
    }

    if (hasSecond && !hasThird) {
      const oldHeading = `***${skillHeading(label, stageCondition(2, 2), suffix)}：${clean(second.name)}`;
      const newHeading = `***${skillHeading(label, stageCondition(2, 3), suffix)}：${clean(second.name)}`;
      output = replaceAll(output, oldHeading, newHeading);
    }
    return output;
  }

  function transformSkillVariant(text, label, data, suffix) {
    if (!data || data.ascensionMode === 'none') return text;
    if (data.ascensionMode === 'nameOnly') return transformSkillNameOnly(text, label, data, suffix);
    if (data.ascensionMode === 'full') return transformSkillFull(text, label, data, suffix);
    return text;
  }

  function transformOwnedOutput(text, skills) {
    let output = String(text == null ? '' : text);
    (skills || []).forEach((skill, index) => {
      const label = clean(skill && skill.label) || `Skill${index + 1}`;
      output = transformSkillVariant(output, label, skill, '');
      if (skill && skill.enhancedEnabled) output = transformSkillVariant(output, label, skill.enhanced, '強化後');
      if (skill && skill.enhanced2Enabled) output = transformSkillVariant(output, label, skill.enhanced2, '強化後2');
    });
    return output;
  }

  function npNameValue(value) {
    const source = value && typeof value === 'object' ? value : {};
    return { reading: clean(source.reading), name: clean(source.name) };
  }

  function sameNpName(a, b) {
    return Boolean((a.reading || a.name) && a.reading === b.reading && a.name === b.name);
  }

  function npNameOnlyPlan(data) {
    const names = data && data.ascensionNames && typeof data.ascensionNames === 'object'
      ? data.ascensionNames : {};
    const second = npNameValue(names.second);
    const third = npNameValue(names.third);
    const hasSecond = Boolean(second.reading || second.name);
    const hasThird = Boolean(third.reading || third.name);
    if (!hasSecond && !hasThird) return null;

    const baseCondition = hasSecond ? stageCondition(1, 1) : stageCondition(1, 2);
    const changes = [];
    if (hasSecond) {
      if (!hasThird || sameNpName(second, third)) {
        changes.push({
          from: hasThird ? stageCondition(2, 3) : stageCondition(2, 2),
          to: stageCondition(2, 3),
          names: second
        });
      } else {
        changes.push({ from: stageCondition(2, 2), to: stageCondition(2, 2), names: second });
        changes.push({ from: stageCondition(3, 3), to: stageCondition(3, 3), names: third });
      }
    } else if (hasThird) {
      changes.push({ from: stageCondition(3, 3), to: stageCondition(3, 3), names: third });
    }
    return { baseCondition, changes };
  }

  function transformNpNameOnly(text, data, suffix, fallbackHeading) {
    const plan = npNameOnlyPlan(data);
    if (!plan) return text;

    const baseHeading = clean(data.heading) || clean(fallbackHeading) || '宝具';
    let output = text;
    if (clean(data.heading)) {
      const oldBaseHeading = suffix ? `${baseHeading}[${suffix}]` : baseHeading;
      output = replaceExactLine(
        output,
        `***${oldBaseHeading}`,
        `***${npHeading(baseHeading, plan.baseCondition, suffix)}`
      );
    } else if (plan.changes.length) {
      const firstChange = plan.changes[0];
      const changeHeading = `***${npHeading(baseHeading, firstChange.from, suffix)}`;
      const changeIndex = output.indexOf(changeHeading);
      if (changeIndex >= 0) {
        const tableToken = '|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c';
        const tableIndex = output.lastIndexOf(tableToken, changeIndex);
        if (tableIndex >= 0) {
          output = `${output.slice(0, tableIndex)}***${npHeading(baseHeading, plan.baseCondition, suffix)}\n${output.slice(tableIndex)}`;
        }
      }
    }

    plan.changes.forEach((change) => {
      if (change.from === change.to) return;
      const oldPrefix = `#region(close,${change.from})\n***${npHeading(baseHeading, change.from, suffix)}`;
      const newPrefix = `#region(close,${change.to})\n***${npHeading(baseHeading, change.to, suffix)}`;
      output = replaceAll(output, oldPrefix, newPrefix);
    });
    return output;
  }

  function transformNpFull(text, data, suffix, fallbackHeading) {
    const baseHeading = clean(data.heading) || clean(fallbackHeading) || '宝具';
    const second = data && data.ascensionData ? data.ascensionData.second : null;
    const third = data && data.ascensionData ? data.ascensionData.third : null;
    const hasSecond = hasNpStageData(second);
    const hasThird = hasNpStageData(third);
    let output = text;

    if (!hasSecond) {
      const end = hasThird ? 2 : 3;
      output = replaceAll(
        output,
        `***${npHeading(baseHeading, stageCondition(1, 1), suffix)}`,
        `***${npHeading(baseHeading, stageCondition(1, end), suffix)}`
      );
    }

    if (hasSecond && !hasThird) {
      output = replaceAll(
        output,
        `***${npHeading(baseHeading, stageCondition(2, 2), suffix)}`,
        `***${npHeading(baseHeading, stageCondition(2, 3), suffix)}`
      );
    }
    return output;
  }

  function transformNpVariant(text, data, suffix, fallbackHeading) {
    if (!data || data.ascensionMode === 'none') return text;
    if (data.ascensionMode === 'nameOnly') return transformNpNameOnly(text, data, suffix, fallbackHeading);
    if (data.ascensionMode === 'full') return transformNpFull(text, data, suffix, fallbackHeading);
    return text;
  }

  function transformNobleOutput(text, np) {
    if (!np) return String(text == null ? '' : text);
    const fallbackHeading = clean(np.heading) || '宝具';
    let output = transformNpVariant(String(text == null ? '' : text), np, '', fallbackHeading);
    if (np.enhancedEnabled) output = transformNpVariant(output, np.enhanced, '強化後', fallbackHeading);
    if (np.enhanced2Enabled) output = transformNpVariant(output, np.enhanced2, '強化後2', fallbackHeading);
    return output;
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

  function transformSection(text, heading, transform) {
    const bounds = sectionBounds(text, heading);
    if (!bounds) return text;
    const body = text.slice(bounds.bodyStart, bounds.bodyEnd);
    const updated = transform(body);
    return `${text.slice(0, bounds.bodyStart)}${updated}${text.slice(bounds.bodyEnd)}`;
  }

  function applySpanOutput(text, state) {
    let output = transformSection(String(text == null ? '' : text), '保有スキル', (body) => transformOwnedOutput(body, state.ownedSkills));
    output = transformSection(output, '宝具', (body) => transformNobleOutput(body, state.noblePhantasms && state.noblePhantasms[0]));
    return output;
  }

  core.VERSION = VERSION;

  if (typeof originalBuildOwnedSkills === 'function') {
    core.buildOwnedSkillsWithAscension = function (skills, templates) {
      return transformOwnedOutput(originalBuildOwnedSkills(skills, templates), skills);
    };
  }

  if (typeof originalBuildNoblePhantasm === 'function') {
    core.buildNoblePhantasmWithAscension = function (np) {
      return transformNobleOutput(originalBuildNoblePhantasm(np), np);
    };
  }

  core.applyAll = function (sourceCode, rawState) {
    const state = core.normalizeState(rawState);
    const result = originalApplyAll(sourceCode, state);
    result.text = applySpanOutput(result.text, state);
    return result;
  };

  core.buildFreshPage = function (rawState) {
    const state = core.normalizeState(rawState);
    return applySpanOutput(originalBuildFreshPage(state), state);
  };

  core.expandAscensionStageHeadings = applySpanOutput;
})();
