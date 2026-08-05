(function () {
  'use strict';
  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  const ui = globalThis.FGODataAutofillUI;
  if (!core || !internal || !ui) throw new Error('FGO Data Autofill modules are not loaded.');
  const { defaultState, normalizeState, applyAll, syncClassData } = core;
  const { ROOT_ID, STATE_KEY, clone, newClassSkill, newClassGroup, newOwnedSkill, newNoblePhantasm } = internal;
  const { installStyle, render } = ui;

  function setPath(object, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const parent = keys.reduce((current, key) => current[key], object);
    parent[last] = value;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    return Promise.resolve();
  }

  function saveState(state) {
    try {
      const saved = clone(state);
      saved.outputCode = '';
      saved.message = '';
      saved.report = null;
      window.name = STATE_KEY + JSON.stringify(saved);
    } catch (_) {
      // 保存不可の環境でも本体は継続する。
    }
  }

  function loadState() {
    try {
      if (!window.name.startsWith(STATE_KEY)) return null;
      return normalizeState(JSON.parse(window.name.slice(STATE_KEY.length)));
    } catch (_) {
      return null;
    }
  }

  function mount(root) {
    let state = loadState() || defaultState();

    function refresh() {
      render(root, state);
    }

    root.addEventListener('input', (event) => {
      const element = event.target;
      const path = element.dataset.path;
      if (!path) return;
      setPath(state, path, element.type === 'checkbox' ? element.checked : element.value);
      saveState(state);
    });

    root.addEventListener('change', (event) => {
      const element = event.target;
      if (element.dataset.path) {
        setPath(state, element.dataset.path, element.type === 'checkbox' ? element.checked : element.value);
        if (element.dataset.path === 'basic.rarity') syncClassData(state);
        saveState(state);
        if (element.dataset.path === 'basic.rarity' || (element.type === 'checkbox' && /enhancedEnabled$/.test(element.dataset.path))) refresh();
        return;
      }
      if (element.hasAttribute('data-basic-class')) {
        state.basic.className = element.value;
        syncClassData(state);
        saveState(state); refresh(); return;
      }
      if (element.dataset.npCard) {
        setPath(state, `${element.dataset.npCard}.card`, element.value);
        saveState(state);
      }
    });

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'add-class-group') { state.classGroups.push(newClassGroup()); syncClassData(state); }
      else if (action === 'delete-class-group' && state.classGroups.length > 1) state.classGroups.splice(Number(button.dataset.group), 1);
      else if (action === 'add-class-skill') state.classGroups[Number(button.dataset.group)].skills.push(newClassSkill());
      else if (action === 'delete-class-skill') {
        const group = state.classGroups[Number(button.dataset.group)];
        if (group.skills.length > 1) group.skills.splice(Number(button.dataset.skill), 1);
      }
      else if (action === 'add-owned-skill') state.ownedSkills.push(newOwnedSkill(state.ownedSkills.length));
      else if (action === 'delete-owned-skill' && state.ownedSkills.length > 1) state.ownedSkills.splice(Number(button.dataset.index), 1);
      else if (action === 'add-np') state.noblePhantasms.push(newNoblePhantasm());
      else if (action === 'delete-np' && state.noblePhantasms.length > 1) state.noblePhantasms.splice(Number(button.dataset.index), 1);
      else if (action === 'apply') {
        syncClassData(state);
        const result = applyAll(state.sourceCode, state);
        state.outputCode = result.text;
        state.report = result.report;
        const replaced = result.report.replaced.length;
        const missing = result.report.missing.length;
        state.message = result.fresh
          ? '元のコードが空欄のため、新規ページ全体を生成しました。'
          : `反映完了：${replaced}項目${missing ? `／未検出${missing}項目（${result.report.missing.join('、')}）` : ''}`;
      }
      else if (action === 'copy-all') {
        copyText(state.outputCode).then(() => {
          state.message = '反映後コードをコピーしました。'; refresh();
        });
        return;
      }
      else if (action === 'clear-output') {
        state.outputCode = ''; state.message = ''; state.report = null;
      }
      else return;
      saveState(state); refresh();
    });

    refresh();
  }

  function boot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      (document.querySelector('#wikibody,#contents,#content,main') || document.body).appendChild(root);
    }
    if (root.dataset.mounted) return;
    root.dataset.mounted = '1';
    installStyle();
    mount(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
