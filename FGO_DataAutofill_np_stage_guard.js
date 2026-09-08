(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill ascension module is not loaded.');

  const VERSION = '2.6.2';
  const clean = internal.clean;
  const clone = internal.clone || ((value) => JSON.parse(JSON.stringify(value)));
  const originalApplyAll = core.applyAll;
  const originalBuildFreshPage = core.buildFreshPage;
  const originalBuildNoblePhantasm = core.buildNoblePhantasmWithAscension;

  function blankNpStage() {
    return {
      reading: '', name: '', rank: '', type: '対宝具', card: 'Buster',
      range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: ''
    };
  }

  function hasExplicitNpStageData(stage) {
    if (!stage || typeof stage !== 'object') return false;
    return Boolean(
      clean(stage.reading) || clean(stage.name) || clean(stage.rank) ||
      clean(stage.range) || clean(stage.maxTargets) || clean(stage.description) ||
      clean(stage.rawBlock)
    );
  }

  function sanitizeVariant(variant) {
    if (!variant || variant.ascensionMode !== 'full') return variant;
    if (!variant.ascensionData || typeof variant.ascensionData !== 'object') {
      variant.ascensionData = { second: blankNpStage(), third: blankNpStage() };
      return variant;
    }
    ['second', 'third'].forEach((key) => {
      if (!hasExplicitNpStageData(variant.ascensionData[key])) {
        variant.ascensionData[key] = blankNpStage();
      }
    });
    return variant;
  }

  function sanitizeNp(np) {
    if (!np || typeof np !== 'object') return np;
    sanitizeVariant(np);
    sanitizeVariant(np.enhanced);
    sanitizeVariant(np.enhanced2);
    return np;
  }

  function sanitizeState(rawState) {
    const state = core.normalizeState(rawState);
    const copied = clone(state);
    if (Array.isArray(copied.noblePhantasms)) copied.noblePhantasms.forEach(sanitizeNp);
    return copied;
  }

  core.VERSION = VERSION;

  core.applyAll = function (sourceCode, rawState) {
    return originalApplyAll(sourceCode, sanitizeState(rawState));
  };

  core.buildFreshPage = function (rawState) {
    return originalBuildFreshPage(sanitizeState(rawState));
  };

  if (typeof originalBuildNoblePhantasm === 'function') {
    core.buildNoblePhantasmWithAscension = function (np) {
      return originalBuildNoblePhantasm(sanitizeNp(clone(np)));
    };
  }

  core.hasExplicitNpAscensionStageData = hasExplicitNpStageData;
})();
