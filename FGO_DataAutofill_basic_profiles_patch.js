(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const ui = globalThis.FGODataAutofillUI;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !ui || !internal) throw new Error('FGO Data Autofill modules are not loaded.');

  const VERSION = '2.6.8';
  const clean = internal.clean;
  const escapeHtml = internal.escapeHtml;
  const originalDefaultState = core.defaultState;
  const originalNormalizeState = core.normalizeState;
  const originalBuildFreshPage = core.buildFreshPage;
  const originalApplyAll = core.applyAll;
  const originalRender = ui.render;

  function blankProfile(data) {
    const source = data && typeof data === 'object' ? data : {};
    return {
      gender: source.gender == null ? '' : String(source.gender),
      height: source.height == null ? '' : String(source.height),
      weight: source.weight == null ? '' : String(source.weight),
      note: source.note == null ? '' : String(source.note)
    };
  }

  function ensureProfiles(state) {
    if (!state || !state.basic) return state;
    const basic = state.basic;
    let profiles = Array.isArray(basic.profiles) ? basic.profiles.map(blankProfile) : [];
    if (!profiles.length) {
      profiles = [blankProfile({ gender: basic.gender, height: basic.height, weight: basic.weight })];
    }
    basic.profiles = profiles;
    basic.gender = profiles[0].gender;
    basic.height = profiles[0].height;
    basic.weight = profiles[0].weight;
    return state;
  }

  core.defaultState = function () {
    return ensureProfiles(originalDefaultState());
  };

  core.normalizeState = function (value) {
    return ensureProfiles(originalNormalizeState(value));
  };

  function outputGender(value) {
    const text = clean(value);
    return text === '性別不明' ? '-' : text;
  }

  function withFootnote(value, note) {
    const text = String(value == null ? '' : value);
    const annotation = clean(note);
    return annotation && text ? `${text}&footnote(${annotation})` : text;
  }

  function profileRows(basic) {
    const profiles = Array.isArray(basic.profiles) && basic.profiles.length
      ? basic.profiles.map(blankProfile)
      : [blankProfile({ gender: basic.gender, height: basic.height, weight: basic.weight })];
    const classIcon = core.getClassIcon(basic.className, basic.rarity);
    return profiles.map((profile, index) => {
      const gender = withFootnote(outputGender(profile.gender), profile.note);
      const heightValue = clean(profile.height) ? core.withUnit(profile.height, 'cm') : '';
      const weightValue = clean(profile.weight) ? core.withUnit(profile.weight, 'kg') : '';
      const height = withFootnote(heightValue, profile.note);
      const weight = withFootnote(weightValue, profile.note);
      if (index === 0) {
        return `|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(${classIcon},icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別|${gender}|>|BGCOLOR(#e6e6fa):身長|${height}|>|BGCOLOR(#e6e6fa):体重|${weight}|`;
      }
      return `|~|~|~|~|~|~|~|~|${gender}|~|~|${height}|~|~|${weight}|`;
    });
  }

  function replaceProfileRows(text, basic) {
    const lines = String(text == null ? '' : text).split('\n');
    const index = lines.findIndex((line) => /^\|>\|>\|>\|BGCOLOR\(#e6e6fa\):Class\|/.test(line));
    if (index < 0) return text;
    let end = index + 1;
    while (end < lines.length && /^\|~\|~\|~\|~\|~\|~\|~\|~\|/.test(lines[end])) end += 1;
    lines.splice(index, end - index, ...profileRows(basic));
    return lines.join('\n');
  }

  core.buildFreshPage = function (rawState) {
    const state = core.normalizeState(rawState);
    return replaceProfileRows(originalBuildFreshPage(state), state.basic);
  };

  core.applyAll = function (sourceCode, rawState) {
    const state = core.normalizeState(rawState);
    const result = originalApplyAll(sourceCode, state);
    result.text = replaceProfileRows(result.text, state.basic);
    return result;
  };

  const field = (label, html, wide) => `<label class="fda-field${wide ? ' fda-wide' : ''}"><span>${escapeHtml(label)}</span>${html}</label>`;
  const input = (path, value) => `<input data-path="${escapeHtml(path)}" value="${escapeHtml(value == null ? '' : value)}">`;
  const checkbox = (path, checked, label) => `<label class="fda-check"><input type="checkbox" data-path="${escapeHtml(path)}"${checked ? ' checked' : ''}>${escapeHtml(label)}</label>`;

  function classOptions(selected) {
    return `<option value="">選択してください</option>${Object.keys(core.CLASS_DATA).map((name) => `<option value="${escapeHtml(name)}"${name === selected ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('')}`;
  }

  function rarityOptions(selected) {
    return [1, 2, 3, 4, 5].map((rarity) => `<option value="${rarity}"${String(rarity) === String(selected) ? ' selected' : ''}>★${rarity}</option>`).join('');
  }

  function profileEditor(profile, index, count) {
    const base = `basic.profiles.${index}`;
    return `<div class="fda-subcard"><div class="fda-head"><strong>基本情報 ${index + 1}</strong>${count > 1 ? `<button type="button" class="fda-btn danger" data-action="delete-basic-profile" data-index="${index}">削除</button>` : ''}</div><div class="fda-grid">
      ${field('性別', input(`${base}.gender`, profile.gender))}
      ${field('身長', input(`${base}.height`, profile.height))}
      ${field('体重', input(`${base}.weight`, profile.weight))}
      ${field('注記', input(`${base}.note`, profile.note))}
    </div></div>`;
  }

  function basicSection(state) {
    const basic = state.basic;
    const profiles = basic.profiles || [blankProfile()];
    return `<section class="fda-sec"><h3>No・基本情報</h3><div class="fda-grid">
      ${field('No.', input('basic.no', basic.no))}${field('真名', input('basic.trueName', basic.trueName))}
      ${field('レアリティ', `<select data-path="basic.rarity">${rarityOptions(basic.rarity)}</select>`)}${field('クラス', `<select data-basic-class>${classOptions(basic.className)}</select>`)}
    </div>${checkbox('basic.trueNameRawWiki', basic.trueNameRawWiki, '真名をWiki記法のまま出力')}
    ${profiles.map((profile, index) => profileEditor(profile, index, profiles.length)).join('')}
    <div class="fda-actions"><button type="button" class="fda-btn sub" data-action="add-basic-profile">基本情報を追加</button></div>
    </section>`;
  }

  function replaceBasicSection(html, replacement) {
    const startToken = '<section class="fda-sec"><h3>No・基本情報</h3>';
    const endToken = '<section class="fda-sec"><h3>パラメーター</h3>';
    const start = html.indexOf(startToken);
    const end = html.indexOf(endToken, start + startToken.length);
    if (start < 0 || end < 0) return html;
    return `${html.slice(0, start)}${replacement}${html.slice(end)}`;
  }

  ui.render = function (root, rawState) {
    const state = core.normalizeState(rawState);
    originalRender(root, state);
    root.innerHTML = replaceBasicSection(root.innerHTML, basicSection(state));
  };

  core.VERSION = VERSION;
  core.buildBasicProfileRows = profileRows;
  ui.multipleBasicProfilesEnabled = true;
})();
