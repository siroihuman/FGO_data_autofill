const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_runtime_patch.js');
require('../FGO_DataAutofill_ascension_patch.js');
require('../FGO_DataAutofill_ui.js');
require('../FGO_DataAutofill_ascension_ui_patch.js');

const core = global.FGODataAutofillCore;
const ui = global.FGODataAutofillUI;
assert.strictEqual(core.VERSION, '2.6.0');

const state = core.defaultState();
assert.strictEqual(state.ownedSkills.length, 3);
assert.strictEqual(state.noblePhantasms.length, 1);
assert.strictEqual(state.ownedSkills[0].ascensionMode, 'none');
assert.strictEqual(state.noblePhantasms[0].ascensionMode, 'none');

const root = { innerHTML: '' };
ui.render(root, state);
assert(root.innerHTML.includes('形態・グループを追加'));
assert(root.innerHTML.includes('このグループにスキルを追加'));
assert(root.innerHTML.includes('classGroups.0.heading'));
assert(!root.innerHTML.includes('add-owned-skill'));
assert(!root.innerHTML.includes('add-np'));
assert(root.innerHTML.includes('ownedSkills.0.label'));
assert(root.innerHTML.includes('noblePhantasms.0.heading'));
assert(root.innerHTML.includes('ascensionMode'));
assert(root.innerHTML.includes('special.enabled'));

// No.044' style: only the heading changes; the common table is not duplicated.
state.ownedSkills[0].name = '魔女の棲む森 A';
state.ownedSkills[0].description = '共通効果';
state.ownedSkills[0].ascensionMode = 'nameOnly';
state.ownedSkills[0].ascensionNames.third = '創成（支配者） A++';
let owned = core.buildOwnedSkillsWithAscension(state.ownedSkills, {});
const base = owned.indexOf('***Skill1：魔女の棲む森 A');
const region = owned.indexOf('#region(第三再臨後)');
const changed = owned.indexOf('***Skill1：創成（支配者） A++');
const regionEnd = owned.indexOf('#endregion', region);
const table = owned.indexOf('|BGCOLOR(#f5fffa):CENTER:45', base);
assert(base < region && region < changed && changed < regionEnd && regionEnd < table);
assert.strictEqual((owned.match(/共通効果/g) || []).length, 1);

// No.034 style: full data differs by ascension stage.
state.ownedSkills[2].ascensionMode = 'full';
state.ownedSkills[2].name = '未来分岐の観測 A+';
state.ownedSkills[2].description = '第一効果';
Object.assign(state.ownedSkills[2].ascensionData.second, { name: '現在脈動の抱擁 B+', description: '第二効果' });
Object.assign(state.ownedSkills[2].ascensionData.third, { name: '泉より紡ぐ記録 A', description: '第三効果' });
owned = core.buildOwnedSkillsWithAscension(state.ownedSkills, {});
assert(owned.includes('***Skill3[第一再臨]：未来分岐の観測 A+'));
assert(owned.includes('***Skill3[第二再臨]：現在脈動の抱擁 B+'));
assert(owned.includes('***Skill3[第三再臨]：泉より紡ぐ記録 A'));
assert(owned.includes('第一効果') && owned.includes('第二効果') && owned.includes('第三効果'));

// No.024' style: conditional special data is emitted in a custom region.
const np = state.noblePhantasms[0];
Object.assign(np, { reading: '通常ルビ', name: '通常宝具', rank: 'EX', type: '対精神宝具', card: 'Quick', range: '1', maxTargets: '1人', description: '通常効果' });
np.special.enabled = true;
np.special.condition = 'オーボエの呪言状態の場合';
Object.assign(np.special.data, { reading: 'Great Old Ones', name: '古き神々による支配', rank: 'EX', type: '対星宝具', card: 'Quick', range: '1', maxTargets: '1人', description: '特殊効果' });
let noble = core.buildNoblePhantasmWithAscension(np);
assert(noble.includes('#region(close,オーボエの呪言状態の場合)'));
assert(noble.includes('Great Old Ones&br()古き神々による支配'));
assert(noble.includes('特殊効果'));

np.special.enabled = false;
np.ascensionMode = 'nameOnly';
np.ascensionNames.third = { reading: 'ナグ／イェブ', name: '冒瀆の双子' };
noble = core.buildNoblePhantasmWithAscension(np);
assert(noble.includes('#region(close,第三再臨後)'));
assert(noble.includes('***第三再臨後&nobold(){}'));
assert(noble.includes('ナグ／イェブ&br()冒瀆の双子'));
assert(!noble.includes('強化2回目'));

console.log('FGO_DataAutofill variant tests passed');
