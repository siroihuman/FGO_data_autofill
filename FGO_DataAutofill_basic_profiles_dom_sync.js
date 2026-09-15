(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const ui = globalThis.FGODataAutofillUI;
  if (!core || !ui) throw new Error('FGO Data Autofill modules are not loaded.');

  const VERSION = '2.6.13';

  function blankProfile() {
    return { gender: '', height: '', weight: '', note: '' };
  }

  function syncBasicProfilesFromDom(root, state) {
    if (!root || !root.querySelectorAll || !state || !state.basic) return false;

    const fields = Array.from(root.querySelectorAll('[data-path^="basic.profiles."]'));
    if (!fields.length) return false;

    const profiles = new Map();
    fields.forEach((element) => {
      const path = element && element.dataset ? element.dataset.path : '';
      const match = /^basic\.profiles\.(\d+)\.(gender|height|weight|note)$/.exec(path || '');
      if (!match) return;
      const index = Number(match[1]);
      if (!profiles.has(index)) profiles.set(index, blankProfile());
      profiles.get(index)[match[2]] = element.value == null ? '' : String(element.value);
    });

    if (!profiles.size) return false;
    const ordered = Array.from(profiles.entries())
      .sort((a, b) => a[0] - b[0])
      .map((entry) => entry[1]);

    state.basic.profiles = ordered;
    state.basic.gender = ordered[0].gender;
    state.basic.height = ordered[0].height;
    state.basic.weight = ordered[0].weight;
    return true;
  }

  ui.syncBasicProfilesFromDom = syncBasicProfilesFromDom;
  core.VERSION = VERSION;
})();
