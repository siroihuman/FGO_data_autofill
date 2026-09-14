(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const ui = globalThis.FGODataAutofillUI;
  const internal = globalThis.FGODataAutofillInternal;
  if (!ui || !internal) throw new Error('FGO Data Autofill icon picker is not loaded.');

  const VERSION = '2.6.6';
  const ICON_PAGE_URL = ui.skillIconCatalogPageUrl || 'https://w.atwiki.jp/siroi_human/pages/20.html';
  const escapeHtml = internal.escapeHtml;
  let refreshedCatalog = null;
  let lastPicker = null;
  let refreshing = false;

  if (core) core.VERSION = VERSION;

  function selectedValue() {
    const hidden = lastPicker && lastPicker.querySelector('input[type="hidden"][data-path]');
    return hidden ? hidden.value || '' : '';
  }

  function refreshButtonHtml() {
    return '<button type="button" class="fda-btn sub fda-icon-refresh" data-skill-icon-refresh>アイコン一覧を更新</button>';
  }

  function ensureRefreshButton() {
    if (typeof document === 'undefined') return null;
    const modal = document.querySelector('[data-skill-icon-modal]');
    if (!modal) return null;
    const tools = modal.querySelector('.fda-icon-picker-tools');
    if (tools && !tools.querySelector('[data-skill-icon-refresh]')) {
      tools.insertAdjacentHTML('beforeend', refreshButtonHtml());
    }
    return modal;
  }

  function iconButton(item, selected) {
    const active = item.filename === selected ? ' is-selected' : '';
    return `<button type="button" class="fda-icon-choice${active}" data-skill-icon-value="${escapeHtml(item.filename)}" data-skill-icon-src="${escapeHtml(item.src)}" title="${escapeHtml(item.filename)}">
      <img src="${escapeHtml(item.src)}" alt="" loading="lazy">
      <span>${escapeHtml(item.filename.replace(/\.png$/i, ''))}</span>
    </button>`;
  }

  function renderCatalog(catalog) {
    const modal = ensureRefreshButton();
    if (!modal) return;
    const target = modal.querySelector('[data-skill-icon-catalog]');
    const status = modal.querySelector('[data-skill-icon-status]');
    if (!target) return;

    if (!catalog || !catalog.length) {
      if (status) status.textContent = 'アイコン一覧を取得できませんでした。';
      return;
    }

    const selected = selectedValue();
    const grouped = new Map();
    catalog.forEach((item) => {
      const key = item.category || 'その他';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    target.innerHTML = Array.from(grouped.entries()).map(([category, items]) => `
      <section class="fda-icon-category" data-icon-category>
        <h4>${escapeHtml(category)}</h4>
        <div class="fda-icon-grid">${items.map((item) => iconButton(item, selected)).join('')}</div>
      </section>`).join('');
    if (status) status.textContent = `${catalog.length}件のアイコンを読み込みました。`;
  }

  function updatePickerPreview(picker, catalog) {
    if (!picker || !catalog) return;
    const hidden = picker.querySelector('input[type="hidden"][data-path]');
    const name = picker.querySelector('[data-icon-selected-name]');
    const imageBox = picker.querySelector('[data-icon-selected-image]');
    if (!hidden) return;
    const selected = hidden.value || '';
    if (name) name.textContent = selected || '未選択';
    const item = catalog.find((entry) => entry.filename === selected);
    if (imageBox) imageBox.innerHTML = item ? `<img src="${escapeHtml(item.src)}" alt="">` : '';
  }

  function refreshVisiblePreviews(catalog) {
    if (typeof document === 'undefined' || !catalog) return;
    document.querySelectorAll('[data-skill-icon-picker-for]').forEach((picker) => updatePickerPreview(picker, catalog));
  }

  function refreshCatalog() {
    const modal = ensureRefreshButton();
    if (!modal || refreshing || typeof fetch !== 'function') return Promise.resolve(refreshedCatalog || []);

    const button = modal.querySelector('[data-skill-icon-refresh]');
    const status = modal.querySelector('[data-skill-icon-status]');
    const filter = modal.querySelector('[data-skill-icon-filter]');
    refreshing = true;
    if (button) button.disabled = true;
    if (status) status.textContent = '最新のアイコン一覧を取得しています…';

    let requestUrl = ICON_PAGE_URL;
    try {
      const url = new URL(ICON_PAGE_URL, location.href);
      url.searchParams.set('_fda_icon_refresh', String(Date.now()));
      requestUrl = url.href;
    } catch (_) {}

    return fetch(requestUrl, { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((html) => {
        const catalog = typeof ui.parseSkillIconCatalog === 'function' ? ui.parseSkillIconCatalog(html) : [];
        if (!catalog.length) throw new Error('empty catalog');
        refreshedCatalog = catalog;
        if (filter) filter.value = '';
        renderCatalog(catalog);
        refreshVisiblePreviews(catalog);
        return catalog;
      })
      .catch(() => {
        if (status) status.textContent = 'アイコン一覧の更新に失敗しました。現在の一覧を維持しています。';
        return refreshedCatalog || [];
      })
      .finally(() => {
        refreshing = false;
        if (button) button.disabled = false;
      });
  }

  function installStyle() {
    if (typeof document === 'undefined' || document.getElementById('fda-icon-refresh-style')) return;
    const style = document.createElement('style');
    style.id = 'fda-icon-refresh-style';
    style.textContent = `
      .fda-icon-modal .fda-icon-picker-tools{display:flex;align-items:center;gap:8px}
      .fda-icon-modal .fda-icon-picker-tools input{min-width:0;flex:1;width:auto}
      .fda-icon-modal .fda-icon-refresh{white-space:nowrap}
      .fda-icon-modal .fda-icon-refresh:disabled{opacity:.55;cursor:wait}
      @media(max-width:720px){.fda-icon-modal .fda-icon-picker-tools{align-items:stretch;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  ui.refreshSkillIconCatalog = refreshCatalog;
  ui.skillIconRefreshButtonHtml = refreshButtonHtml;

  if (typeof document !== 'undefined') {
    installStyle();

    document.addEventListener('click', (event) => {
      const open = event.target.closest('[data-skill-icon-open]');
      if (open) {
        lastPicker = open.closest('[data-skill-icon-picker-for]');
        Promise.resolve().then(() => {
          ensureRefreshButton();
          if (refreshedCatalog) {
            renderCatalog(refreshedCatalog);
            refreshVisiblePreviews(refreshedCatalog);
          }
        });
        return;
      }

      const refresh = event.target.closest('[data-skill-icon-refresh]');
      if (refresh) {
        event.preventDefault();
        refreshCatalog();
        return;
      }

      const choice = event.target.closest('[data-skill-icon-value]');
      if (choice && lastPicker && refreshedCatalog) {
        Promise.resolve().then(() => updatePickerPreview(lastPicker, refreshedCatalog));
      }
    });
  }
})();
