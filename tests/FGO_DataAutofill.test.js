const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_runtime_patch.js');
require('../FGO_DataAutofill_ui.js');

const core = global.FGODataAutofillCore;
assert(core);
assert.strictEqual(core.VERSION, '2.4.0');
assert.strictEqual(typeof core.newWeapon, 'function');
assert.strictEqual(typeof core.buildWeapons, 'function');

const initial = core.defaultState();
assert(Array.isArray(initial.weapons));
assert.strictEqual(initial.weapons.length, 1);
assert.strictEqual(initial.weapons[0].name, '');

const migrated = core.normalizeState({
  weapon: { name: '旧武器', description: '旧解説', rawWiki: false, rawBlock: '' }
});
assert.strictEqual(migrated.weapons.length, 1);
assert.strictEqual(migrated.weapons[0].name, '旧武器');
assert.strictEqual(migrated.weapons[0].description, '旧解説');

const weapon1 = core.newWeapon({ name: '武器１', description: '解説' });
core.toggleNobleTemplate(weapon1, true);
weapon1.description = weapon1.description.replace('“”', '“ルビ”');
const weapon2 = core.newWeapon({ name: '武器２', description: '解説' });
const weaponCode = core.buildWeapons([weapon1, weapon2]);
assert(weaponCode.includes('&font(b,110%){【武器１】}'));
assert(weaponCode.includes('&font(b,110%){種別：対宝具　レンジ：　最大捕捉：人}&br()&font(b,105%){“ルビ”}&br()解説'));
assert(weaponCode.includes('&font(b,110%){【武器２】}'));
assert.strictEqual((weaponCode.match(/\|BGCOLOR\(#f5fffa\):LEFT:1000\|c/g) || []).length, 2);
assert(!weaponCode.includes('最大補足'));

const state = core.defaultState();
state.weapons = [weapon1, weapon2];
state.weapon = weapon1;
state.ownedSkills[0].name = '通常スキル';
state.ownedSkills[0].enhanced2Enabled = true;
state.ownedSkills[0].enhanced2.name = '二段階強化';
state.noblePhantasms[0].name = '通常宝具';
state.noblePhantasms[0].enhanced2Enabled = true;
state.noblePhantasms[0].enhanced2.name = '二段階強化宝具';

const fresh = core.applyAll('', state).text;
assert(fresh.includes('**武器'));
assert(fresh.includes('【武器１】'));
assert(fresh.includes('【武器２】'));
assert(fresh.includes('[強化後2]'));
assert(fresh.includes('#region(close,強化後2)'));
assert(!fresh.includes('強化2回目'));

const sourceWithComment = fresh.replace('**武器\n', '**武器\n//KEEP_WEAPON\n');
const reapplied = core.applyAll(sourceWithComment, state).text;
assert(reapplied.includes('//KEEP_WEAPON'));
assert.strictEqual((reapplied.match(/【武器１】/g) || []).length, 1);
assert.strictEqual((reapplied.match(/【武器２】/g) || []).length, 1);

const root = { innerHTML: '' };
global.FGODataAutofillUI.render(root, core.normalizeState(state));
assert(root.innerHTML.includes('ver 2.4.0'));
assert(root.innerHTML.includes('data-action="add-weapon"'));
assert(root.innerHTML.includes('武器を追加'));
assert(root.innerHTML.includes('weapons.0.name'));
assert(root.innerHTML.includes('weapons.1.name'));
assert(root.innerHTML.includes('data-noble-toggle="weapons.0"'));
assert(root.innerHTML.includes('宝具情報テンプレートを解説の先頭に挿入'));
assert(root.innerHTML.includes('強化後2データを出力'));
assert(root.innerHTML.includes('強化後2宝具を出力'));
assert(!root.innerHTML.includes('強化2回目'));

console.log('FGO_DataAutofill 2.4.0 tests passed');
