(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill core is not loaded.');

  const VERSION = '2.6.14';
  const clean = internal.clean;
  const originalApplyAll = core.applyAll;
  const originalBuildFreshPage = core.buildFreshPage;

  function blankProfile(data) {
    const source = data && typeof data === 'object' ? data : {};
    return {
      gender: source.gender == null ? '' : String(source.gender),
      height: source.height == null ? '' : String(source.height),
      weight: source.weight == null ? '' : String(source.weight),
      note: source.note == null ? '' : String(source.note)
    };
  }

  function profilesFor(rawState) {
    const state = core.normalizeState(rawState);
    const basic = state.basic || {};
    const profiles = Array.isArray(basic.profiles) && basic.profiles.length
      ? basic.profiles.map(blankProfile)
      : [blankProfile({ gender: basic.gender, height: basic.height, weight: basic.weight })];
    return { state, basic, profiles };
  }

  function outputGender(value) {
    const text = clean(value);
    return text === '性別不明' ? '-' : text;
  }

  function withFootnote(value, note) {
    const text = String(value == null ? '' : value);
    const annotation = clean(note);
    return annotation && text ? `${text}&footnote(${annotation})` : text;
  }

  function buildRows(rawState) {
    const { basic, profiles } = profilesFor(rawState);
    const classIcon = core.getClassIcon(basic.className, basic.rarity);
    return profiles.map((profile, index) => {
      const gender = withFootnote(outputGender(profile.gender), profile.note);
      const height = withFootnote(clean(profile.height) ? core.withUnit(profile.height, 'cm') : '', profile.note);
      const weight = withFootnote(clean(profile.weight) ? core.withUnit(profile.weight, 'kg') : '', profile.note);
      if (index === 0) {
        return `|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(${classIcon},icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別|${gender}|>|BGCOLOR(#e6e6fa):身長|${height}|>|BGCOLOR(#e6e6fa):体重|${weight}|`;
      }
      const inheritedGender = clean(profile.gender) ? gender : '~';
      const inheritedHeight = clean(profile.height) ? height : '~';
      const inheritedWeight = clean(profile.weight) ? weight : '~';
      return `|~|~|~|~|~|~|~|~|${inheritedGender}|~|~|${inheritedHeight}|~|~|${inheritedWeight}|`;
    });
  }

  function forceProfileRows(text, rawState) {
    const rows = buildRows(rawState);
    const lines = String(text == null ? '' : text).split('\n');
    const start = lines.findIndex((line) => /^\|>\|>\|BGCOLOR\(#e6e6fa\):Class\|/.test(line));
    if (start < 0) return text;

    let end = start + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (/^\|~\|~\|~\|~\|~\|~\|~\|~\|/.test(line)) {
        end += 1;
        continue;
      }
      break;
    }
    lines.splice(start, end - start, ...rows);
    return lines.join('\n');
  }

  core.applyAll = function (sourceCode, rawState) {
    const result = originalApplyAll(sourceCode, rawState);
    result.text = forceProfileRows(result.text, rawState);
    return result;
  };

  core.buildFreshPage = function (rawState) {
    return forceProfileRows(originalBuildFreshPage(rawState), rawState);
  };

  core.VERSION = VERSION;
  core.forceBasicProfileRows = forceProfileRows;
})();
