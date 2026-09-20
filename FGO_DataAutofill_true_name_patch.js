(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill modules are not loaded.');

  const VERSION = '2.6.14';
  const clean = internal.clean;
  const originalApplyAll = core.applyAll;
  const originalBuildFreshPage = core.buildFreshPage;

  function trueNameTarget(basic) {
    const source = clean(basic && basic.trueName);
    const match = /^\[\[([^\]]+)\]\]$/.exec(source);
    if (!match) return source;
    const body = match[1];
    const separator = body.lastIndexOf('>');
    return clean(separator >= 0 ? body.slice(separator + 1) : body);
  }

  function formatRevealedTrueName(basic) {
    const revealed = clean(basic && basic.trueNameRevealed);
    if (!revealed) return '';
    if (/^\[\[.*\]\]$/.test(revealed)) return revealed;
    const target = trueNameTarget(basic || {});
    return target ? `[[${revealed}>${target}]]` : `[[${revealed}]]`;
  }

  function revealedRow(basic) {
    const value = formatRevealedTrueName(basic);
    return value
      ? `|>|>|BGCOLOR(#e6e6fa):真名判明|>|>|>|>|>|>|>|>|>|>|>|${value}|`
      : '';
  }

  function applyRevealedTrueNameRow(text, rawState) {
    const state = core.normalizeState(rawState);
    const row = revealedRow(state.basic || {});
    const lines = String(text == null ? '' : text).split('\n');
    const revealPattern = /^\|>\|>\|BGCOLOR\(#e6e6fa\):真名判明\|/;

    let firstReveal = -1;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (!revealPattern.test(lines[index])) continue;
      firstReveal = index;
      lines.splice(index, 1);
    }

    if (!row) return { text: lines.join('\n'), changed: firstReveal >= 0 };

    const trueNameIndex = lines.findIndex((line) => /^\|>\|>\|BGCOLOR\(#e6e6fa\):真名\|/.test(line));
    if (trueNameIndex < 0) return { text: lines.join('\n'), changed: firstReveal >= 0 };
    lines.splice(trueNameIndex + 1, 0, row);
    return { text: lines.join('\n'), changed: true };
  }

  function stripLegacyBasicTrueNameTemplate(text) {
    return String(text == null ? '' : text)
      .replace(/\n\/\/#region\(close,真名\)\n\/\/\n\/\/#endregion\(\)\n/, '\n');
  }

  function markReport(report) {
    if (!report || !Array.isArray(report.replaced)) return;
    if (!report.replaced.includes('真名判明')) report.replaced.push('真名判明');
  }

  core.applyAll = function (sourceCode, rawState) {
    const result = originalApplyAll(sourceCode, rawState);
    let text = result.text;
    if (result.fresh) text = stripLegacyBasicTrueNameTemplate(text);
    const applied = applyRevealedTrueNameRow(text, rawState);
    result.text = applied.text;
    if (applied.changed) markReport(result.report);
    return result;
  };

  core.buildFreshPage = function (rawState) {
    const text = stripLegacyBasicTrueNameTemplate(originalBuildFreshPage(rawState));
    return applyRevealedTrueNameRow(text, rawState).text;
  };

  core.VERSION = VERSION;
  core.formatRevealedTrueName = formatRevealedTrueName;
  core.applyRevealedTrueNameRow = applyRevealedTrueNameRow;
})();
