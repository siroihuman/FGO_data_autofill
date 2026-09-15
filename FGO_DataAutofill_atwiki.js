(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const current = document.currentScript;
  const source = current && current.src ? current.src : '';
  const base = source ? source.replace(/[^/?#]+(?:[?#].*)?$/, '') : '';
  const VERSION = '2.6.13';
  const files = [
    'FGO_DataAutofill_core.js',
    'FGO_DataAutofill_runtime_patch.js',
    'FGO_DataAutofill_ascension_patch.js',
    'FGO_DataAutofill_np_stage_guard.js',
    'FGO_DataAutofill_ascension_span_patch.js',
    'FGO_DataAutofill_gender_patch.js',
    'FGO_DataAutofill_ui.js',
    'FGO_DataAutofill_ascension_ui_patch.js',
    'FGO_DataAutofill_icon_picker_patch.js',
    'FGO_DataAutofill_icon_refresh_patch.js',
    'FGO_DataAutofill_bond_icon_picker_patch.js',
    'FGO_DataAutofill_basic_profiles_patch.js',
    'FGO_DataAutofill_basic_profiles_output_guard.js',
    'FGO_DataAutofill_basic_profiles_dom_sync.js',
    'FGO_DataAutofill_boot.js'
  ];
  let sequence = Promise.resolve();
  files.forEach((file) => {
    sequence = sequence.then(() => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${base}${file}?v=${VERSION}`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${file}の読み込みに失敗しました。`));
      document.head.appendChild(script);
    }));
  });
  sequence.catch((error) => console.error('[FGO Data Autofill]', error));
})();
