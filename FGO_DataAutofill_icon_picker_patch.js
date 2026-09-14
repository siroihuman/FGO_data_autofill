(function () {
  'use strict';

  const ui = globalThis.FGODataAutofillUI;
  const internal = globalThis.FGODataAutofillInternal;
  if (!ui || !internal) throw new Error('FGO Data Autofill UI is not loaded.');

  const VERSION = '2.6.5';
  const ICON_PAGE_URL = 'https://w.atwiki.jp/siroi_human/pages/20.html';
  const escapeHtml = internal.escapeHtml;
  const originalRender = ui.render;
  const originalInstallStyle = ui.installStyle;
  let catalogPromise = null;
  let catalogCache = null;
  let activePicker = null;
  let modalElement = null;

  function getPath(object, path) {
    return path.split('.').reduce((current, key) => current == null ? undefined : current[key], object);
  }

  function isSkillIconPath(path) {
    return /^(?:classGroups\.|ownedSkills\.).*\.icon$/.test(path);
  }

  function selectedHtml(path, value) {
    const name = String(value == null ? '' : value);
    return `<div class="fda-icon-selected" data-icon-selected-for="${escapeHtml(path)}">
      <div class="fda-icon-selected-image" data-icon-selected-image></div>
      <div class="fda-icon-selected-meta"><span class="fda-icon-selected-label">選択中</span><strong data-icon-selected-name>${escapeHtml(name || '未選択')}</strong></div>
      <div class="fda-icon-selected-actions">
        <button type="button" class="fda-btn sub" data-skill-icon-open>アイコンを選択</button>
        <button type="button" class="fda-btn sub fda-icon-clear" data-skill-icon-clear>選択解除</button>
      </div>
    </div>`;
  }

  function pickerHtml(path, value, label) {
    return `<div class="fda-field fda-skill-icon-field" data-skill-icon-picker-for="${escapeHtml(path)}">
      <span>${escapeHtml(label)}</span>
      <input type="hidden" data-path="${escapeHtml(path)}" value="${escapeHtml(value == null ? '' : value)}">
      ${selectedHtml(path, value)}
    </div>`;
  }

  function replaceIconFields(html, state) {
    const pattern = /<label class="fda-field"><span>([^<]*アイコン)<\/span><input data-path="((?:classGroups|ownedSkills)\.[^"]+\.icon)"[^>]*><\/label>/g;
    return html.replace(pattern, (whole, label, path) => {
      if (!isSkillIconPath(path)) return whole;
      return pickerHtml(path, getPath(state, path), label);
    });
  }

  function normalizeFilename(src) {
    try {
      const url = new URL(src, ICON_PAGE_URL);
      return decodeURIComponent(url.pathname.split('/').pop() || '');
    } catch (_) {
      return '';
    }
  }

  function cleanCategory(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .replace(/サンプル画像\(64x64\).*$/i, '')
      .trim();
  }

  function parseCatalog(html) {
    if (typeof DOMParser === 'undefined') return [];
    const documentObject = new DOMParser().parseFromString(html, 'text/html');
    const tables = Array.from(documentObject.querySelectorAll('table'));
    let targetTable = null;
    let maxImages = 0;
    tables.forEach((table) => {
      const count = table.querySelectorAll('img[src*="/siroi_human/attach/20/"]').length;
      if (count > maxImages) {
        maxImages = count;
        targetTable = table;
      }
    });
    if (!targetTable) return [];

    let category = 'その他';
    const items = [];
    const seen = new Set();
    Array.from(targetTable.querySelectorAll('tr')).forEach((row) => {
      const images = Array.from(row.querySelectorAll('img[src*="/siroi_human/attach/20/"]'));
      if (!images.length) {
        const text = cleanCategory(row.textContent);
        if (text && text.length <= 40 && !/wiki構文|サンプル画像/i.test(text)) category = text;
        return;
      }
      images.forEach((image) => {
        const src = image.getAttribute('src') || '';
        const filename = normalizeFilename(src);
        if (!filename || seen.has(filename)) return;
        seen.add(filename);
        let absolute = src;
        try { absolute = new URL(src, ICON_PAGE_URL).href; } catch (_) {}
        items.push({ filename, src: absolute, category });
      });
    });
    return items;
  }

  function loadCatalog() {
    if (catalogCache) return Promise.resolve(catalogCache);
    if (catalogPromise) return catalogPromise;
    if (typeof fetch !== 'function') return Promise.resolve([]);
    catalogPromise = fetch(ICON_PAGE_URL, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((html) => {
        catalogCache = parseCatalog(html);
        return catalogCache;
      })
      .catch(() => []);
    return catalogPromise;
  }

  function iconButton(item, selected) {
    const active = item.filename === selected ? ' is-selected' : '';
    return `<button type="button" class="fda-icon-choice${active}" data-skill-icon-value="${escapeHtml(item.filename)}" data-skill-icon-src="${escapeHtml(item.src)}" title="${escapeHtml(item.filename)}">
      <img src="${escapeHtml(item.src)}" alt="" loading="lazy">
      <span>${escapeHtml(item.filename.replace(/\.png$/i, ''))}</span>
    </button>`;
  }

  function modalHtml() {
    return `<div class="fda-icon-modal" data-skill-icon-modal hidden>
      <div class="fda-icon-modal-backdrop" data-skill-icon-close></div>
      <section class="fda-icon-modal-panel" role="dialog" aria-modal="true" aria-label="スキルアイコン選択">
        <div class="fda-icon-modal-head">
          <div><strong>スキルアイコン選択</strong><div class="fda-icon-modal-current" data-skill-icon-modal-current>未選択</div></div>
          <button type="button" class="fda-icon-modal-close" data-skill-icon-close aria-label="閉じる">×</button>
        </div>
        <div class="fda-icon-picker-tools"><input type="search" data-skill-icon-filter placeholder="アイコン名を検索"></div>
        <div class="fda-icon-picker-status" data-skill-icon-status>アイコン一覧を読み込んでいます…</div>
        <div class="fda-icon-picker-catalog" data-skill-icon-catalog></div>
      </section>
    </div>`;
  }

  function ensureModal() {
    if (typeof document === 'undefined') return null;
    if (modalElement && document.body.contains(modalElement)) return modalElement;
    const host = document.createElement('div');
    host.innerHTML = modalHtml();
    modalElement = host.firstElementChild;
    document.body.appendChild(modalElement);
    return modalElement;
  }

  function selectedValue(picker) {
    const hidden = picker && picker.querySelector('input[type="hidden"][data-path]');
    return hidden ? hidden.value || '' : '';
  }

  function updateSelectedPreview(picker, catalog) {
    if (!picker) return;
    const hidden = picker.querySelector('input[type="hidden"][data-path]');
    const name = picker.querySelector('[data-icon-selected-name]');
    const imageBox = picker.querySelector('[data-icon-selected-image]');
    if (!hidden) return;
    const selected = hidden.value || '';
    if (name) name.textContent = selected || '未選択';
    const item = (catalog || catalogCache || []).find((entry) => entry.filename === selected);
    if (imageBox) imageBox.innerHTML = item ? `<img src="${escapeHtml(item.src)}" alt="">` : '';
  }

  function refreshAllSelectedPreviews(root, catalog) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[data-skill-icon-picker-for]').forEach((picker) => updateSelectedPreview(picker, catalog));
  }

  function renderModalCatalog(catalog) {
    const modal = ensureModal();
    if (!modal) return;
    const status = modal.querySelector('[data-skill-icon-status]');
    const target = modal.querySelector('[data-skill-icon-catalog]');
    if (!target) return;
    if (!catalog.length) {
      if (status) status.textContent = 'アイコン一覧の読み込みに失敗しました。ページを再読み込みしてください。';
      target.innerHTML = '';
      return;
    }
    if (status) status.textContent = `${catalog.length}件のアイコンを読み込みました。`;
    const selected = selectedValue(activePicker);
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
  }

  function updateModalSelection() {
    const modal = ensureModal();
    if (!modal) return;
    const selected = selectedValue(activePicker);
    const current = modal.querySelector('[data-skill-icon-modal-current]');
    if (current) current.textContent = selected || '未選択';
    modal.querySelectorAll('[data-skill-icon-value]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.skillIconValue === selected);
    });
  }

  function applyFilter(query) {
    const modal = ensureModal();
    if (!modal) return;
    const needle = String(query == null ? '' : query).trim().toLowerCase();
    modal.querySelectorAll('[data-skill-icon-value]').forEach((button) => {
      const name = String(button.dataset.skillIconValue || '').toLowerCase();
      button.hidden = Boolean(needle && !name.includes(needle));
    });
    modal.querySelectorAll('[data-icon-category]').forEach((category) => {
      category.hidden = !Array.from(category.querySelectorAll('[data-skill-icon-value]')).some((button) => !button.hidden);
    });
  }

  function openModal(picker) {
    const modal = ensureModal();
    if (!modal || !picker) return;
    activePicker = picker;
    modal.hidden = false;
    document.documentElement.classList.add('fda-icon-modal-open');
    const filter = modal.querySelector('[data-skill-icon-filter]');
    if (filter) filter.value = '';
    updateModalSelection();
    const status = modal.querySelector('[data-skill-icon-status]');
    if (status) status.textContent = 'アイコン一覧を読み込んでいます…';
    const target = modal.querySelector('[data-skill-icon-catalog]');
    if (target && !catalogCache) target.innerHTML = '';
    loadCatalog().then((catalog) => {
      if (!modal.hidden) {
        renderModalCatalog(catalog);
        updateModalSelection();
      }
      updateSelectedPreview(activePicker, catalog);
    });
    if (filter) filter.focus();
  }

  function closeModal() {
    if (!modalElement) return;
    modalElement.hidden = true;
    document.documentElement.classList.remove('fda-icon-modal-open');
    activePicker = null;
  }

  function setSelectedIcon(filename) {
    if (!activePicker) return;
    const hidden = activePicker.querySelector('input[type="hidden"][data-path]');
    if (!hidden) return;
    hidden.value = filename || '';
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
    updateSelectedPreview(activePicker, catalogCache || []);
    updateModalSelection();
  }

  ui.installStyle = function () {
    originalInstallStyle();
    if (typeof document === 'undefined' || document.getElementById('fda-icon-picker-style')) return;
    const style = document.createElement('style');
    style.id = 'fda-icon-picker-style';
    style.textContent = `
      #fgo-data-autofill .fda-skill-icon-field{grid-column:1/-1}
      #fgo-data-autofill .fda-icon-selected{display:flex;align-items:center;gap:10px;border:1px solid #c7d6e3;border-radius:8px;padding:8px;background:#fff;min-height:66px}
      #fgo-data-autofill .fda-icon-selected-image{width:52px;height:52px;display:grid;place-items:center;border:1px solid #d7e2eb;border-radius:7px;background:#f8fafc;flex:0 0 52px}
      #fgo-data-autofill .fda-icon-selected-image img{max-width:48px;max-height:48px}
      #fgo-data-autofill .fda-icon-selected-meta{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
      #fgo-data-autofill .fda-icon-selected-meta strong{overflow-wrap:anywhere}
      #fgo-data-autofill .fda-icon-selected-label{font-size:11px;color:#64748b}
      #fgo-data-autofill .fda-icon-selected-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      html.fda-icon-modal-open{overflow:hidden}
      .fda-icon-modal[hidden]{display:none!important}
      .fda-icon-modal{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px}
      .fda-icon-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(2px)}
      .fda-icon-modal-panel{position:relative;width:min(1060px,calc(100vw - 32px));max-height:min(84vh,900px);display:flex;flex-direction:column;background:#fff;border:1px solid #aebfd0;border-radius:12px;box-shadow:0 18px 55px rgba(15,23,42,.35);padding:14px;overflow:hidden}
      .fda-icon-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #d7e2eb;padding-bottom:10px}
      .fda-icon-modal-head strong{font-size:17px}
      .fda-icon-modal-current{font-size:12px;color:#64748b;margin-top:3px;overflow-wrap:anywhere}
      .fda-icon-modal-close{border:0;background:transparent;font-size:28px;line-height:1;cursor:pointer;color:#475569;padding:0 5px}
      .fda-icon-picker-tools{margin:10px 0 5px}
      .fda-icon-picker-tools input{width:100%;border:1px solid #aebfd0;border-radius:6px;padding:9px;background:#fff;font:inherit}
      .fda-icon-picker-status{font-size:12px;color:#64748b;margin:4px 0 8px}
      .fda-icon-picker-catalog{overflow:auto;padding-right:4px}
      .fda-icon-category{margin:9px 0 13px}
      .fda-icon-category h4{margin:0 0 6px;font-size:13px;color:#334155;position:sticky;top:0;background:#fff;padding:4px 0;z-index:1}
      .fda-icon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}
      .fda-icon-choice{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:88px;border:1px solid #ccd9e5;border-radius:7px;background:#fff;padding:5px;cursor:pointer;color:#334155}
      .fda-icon-choice:hover{border-color:#477fad;background:#f2f7fb}
      .fda-icon-choice.is-selected{border:2px solid #35698f;background:#eaf4fb;padding:4px}
      .fda-icon-choice img{width:48px;height:48px;object-fit:contain}
      .fda-icon-choice span{font-size:10px;line-height:1.2;overflow-wrap:anywhere;text-align:center}
      @media(max-width:720px){
        #fgo-data-autofill .fda-icon-selected{align-items:flex-start;flex-wrap:wrap}
        #fgo-data-autofill .fda-icon-selected-actions{width:100%;justify-content:flex-start}
        .fda-icon-modal{padding:8px}.fda-icon-modal-panel{width:calc(100vw - 16px);max-height:92vh}.fda-icon-grid{grid-template-columns:repeat(auto-fill,minmax(78px,1fr))}
      }
    `;
    document.head.appendChild(style);
  };

  ui.render = function (root, rawState) {
    const state = globalThis.FGODataAutofillCore && globalThis.FGODataAutofillCore.normalizeState
      ? globalThis.FGODataAutofillCore.normalizeState(rawState) : rawState;
    originalRender(root, state);
    root.innerHTML = replaceIconFields(root.innerHTML, state);
    if (root && root.querySelectorAll) {
      loadCatalog().then((catalog) => refreshAllSelectedPreviews(root, catalog));
    }
  };

  ui.skillIconCatalogPageUrl = ICON_PAGE_URL;
  ui.parseSkillIconCatalog = parseCatalog;
  ui.skillIconPopupHtml = modalHtml;

  if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
      const open = event.target.closest('[data-skill-icon-open]');
      if (open) {
        const picker = open.closest('[data-skill-icon-picker-for]');
        if (picker) openModal(picker);
        return;
      }

      const choice = event.target.closest('[data-skill-icon-value]');
      if (choice && activePicker) {
        setSelectedIcon(choice.dataset.skillIconValue || '');
        closeModal();
        return;
      }

      const clear = event.target.closest('[data-skill-icon-clear]');
      if (clear) {
        const picker = clear.closest('[data-skill-icon-picker-for]');
        const hidden = picker && picker.querySelector('input[type="hidden"][data-path]');
        if (!hidden) return;
        hidden.value = '';
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        updateSelectedPreview(picker, catalogCache || []);
        return;
      }

      if (event.target.closest('[data-skill-icon-close]')) closeModal();
    });

    document.addEventListener('input', (event) => {
      const filter = event.target.closest('[data-skill-icon-filter]');
      if (filter) applyFilter(filter.value);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modalElement && !modalElement.hidden) closeModal();
    });
  }
})();
