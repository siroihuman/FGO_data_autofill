(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill core is not loaded.');

  const VERSION = '2.6.5';
  const clone = internal.clone || ((value) => JSON.parse(JSON.stringify(value)));
  const clean = internal.clean;
  const originalApplyAll = core.applyAll;
  const originalBuildFreshPage = core.buildFreshPage;

  function outputState(rawState) {
    const state = core.normalizeState(rawState);
    const copied = clone(state);
    if (copied.basic && clean(copied.basic.gender) === '性別不明') copied.basic.gender = '-';
    return copied;
  }

  core.VERSION = VERSION;

  core.applyAll = function (sourceCode, rawState) {
    return originalApplyAll(sourceCode, outputState(rawState));
  };

  core.buildFreshPage = function (rawState) {
    return originalBuildFreshPage(outputState(rawState));
  };
})();
