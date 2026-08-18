(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const current = document.currentScript;
  const source = current && current.src ? current.src : '';
  const base = source ? source.replace(/[^/?#]+(?:[?#].*)?$/, '') : '';
  const files = ['FGO_DataAutofill_core.js', 'FGO_DataAutofill_ui.js', 'FGO_DataAutofill_boot.js'];
  let sequence = Promise.resolve();
  files.forEach((file) => {
    sequence = sequence.then(() => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${base}${file}?v=2.2.0`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${file}の読み込みに失敗しました。`));
      document.head.appendChild(script);
    }));
  });
  sequence.catch((error) => console.error('[FGO Data Autofill]', error));
})();