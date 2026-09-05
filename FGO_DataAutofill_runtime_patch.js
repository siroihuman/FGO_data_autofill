(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  const internal = globalThis.FGODataAutofillInternal;
  if (!core || !internal) throw new Error('FGO Data Autofill core is not loaded.');

  const VERSION = '2.4.0';
  const WEAPON_PLACEHOLDER = '__FDA_WEAPONS_PLACEHOLDER__';
  const clean = internal.clean;
  const clone = internal.clone;

  function toCurrentEnhancement2Label(value) {
    return String(value == null ? '' : value)
      .split('#region(close,強化2回目)').join('#region(close,強化後2)')
      .split('[強化2回目]').join('[強化後2]');
  }

  function toLegacyEnhancement2Label(value) {
    return String(value == null ? '' : value)
      .split('#region(close,強化後2)').join('#region(close,強化2回目)')
      .split('[強化後2]').join('[強化2回目]');
  }

  function newWeapon(data) {
    return Object.assign({
      name: '', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false
    }, data || {});
  }

  function normalizeWeapon(data) {
    const weapon = newWeapon(data);
    if (typeof core.normalizeMaxTargetTerminology === 'function') {
      weapon.description = core.normalizeMaxTargetTerminology(weapon.description);
    }
    return weapon;
  }

  function buildWeaponBlock(weapon) {
    const item = normalizeWeapon(weapon);
    if (clean(item.rawBlock)) return clean(item.rawBlock);
    return [
      '|BGCOLOR(#f5fffa):LEFT:1000|c',
      `|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【${clean(item.name) || '武器名'}】}|`,
      `|${core.skillDescription(item)}|`
    ].join('\n');
  }

  function buildWeapons(weapons) {
    const items = Array.isArray(weapons) && weapons.length ? weapons : [newWeapon()];
    return items.map(buildWeaponBlock).join('\n');
  }

  const originalDefaultState = core.defaultState;
  const originalNormalizeState = core.normalizeState;
  const originalBuildOwnedSkills = core.buildOwnedSkills;
  const originalBuildNoblePhantasms = core.buildNoblePhantasms;
  const originalBuildFreshPage = core.buildFreshPage;
  const originalApplyAll = core.applyAll;

  core.VERSION = VERSION;
  internal.newWeapon = newWeapon;

  core.defaultState = function () {
    const state = originalDefaultState();
    state.weapons = [newWeapon(state.weapon)];
    state.weapon = state.weapons[0];
    return state;
  };

  core.normalizeState = function (value) {
    const source = value && typeof value === 'object' ? value : {};
    const state = originalNormalizeState(source);
    let weapons;
    if (Array.isArray(source.weapons) && source.weapons.length) {
      weapons = source.weapons.map(normalizeWeapon);
    } else if (source.weapon && typeof source.weapon === 'object') {
      weapons = [normalizeWeapon(source.weapon)];
    } else {
      weapons = [normalizeWeapon(state.weapon)];
    }
    state.weapons = weapons.length ? weapons : [newWeapon()];
    state.weapon = state.weapons[0];
    return state;
  };

  core.buildWeapon = buildWeaponBlock;
  core.buildWeapons = buildWeapons;
  core.newWeapon = newWeapon;

  core.buildOwnedSkills = function (...args) {
    return toCurrentEnhancement2Label(originalBuildOwnedSkills.apply(this, args));
  };

  core.buildNoblePhantasms = function (...args) {
    return toCurrentEnhancement2Label(originalBuildNoblePhantasms.apply(this, args));
  };

  core.buildFreshPage = function (rawState) {
    const state = core.normalizeState(rawState);
    const legacyState = clone(state);
    legacyState.weapon = {
      name: '', description: '', rawWiki: true, rawBlock: WEAPON_PLACEHOLDER,
      isNoblePhantasm: false
    };
    let text = originalBuildFreshPage(legacyState);
    text = toCurrentEnhancement2Label(text);
    return text.replace(WEAPON_PLACEHOLDER, buildWeapons(state.weapons));
  };

  core.applyAll = function (sourceCode, rawState) {
    const state = core.normalizeState(rawState);
    const legacyState = clone(state);
    legacyState.weapon = {
      name: '', description: '', rawWiki: true, rawBlock: WEAPON_PLACEHOLDER,
      isNoblePhantasm: false
    };
    const legacySource = toLegacyEnhancement2Label(sourceCode);
    const result = originalApplyAll(legacySource, legacyState);
    result.text = toCurrentEnhancement2Label(result.text)
      .replace(WEAPON_PLACEHOLDER, buildWeapons(state.weapons));
    return result;
  };

  core.toCurrentEnhancement2Label = toCurrentEnhancement2Label;
  core.toLegacyEnhancement2Label = toLegacyEnhancement2Label;
})();
