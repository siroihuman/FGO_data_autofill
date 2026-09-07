const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_runtime_patch.js');
require('../FGO_DataAutofill_ascension_patch.js');
require('../FGO_DataAutofill_ui.js');
require('../FGO_DataAutofill_ascension_ui_patch.js');

const core = global.FGODataAutofillCore;
const ui = global.FGODataAutofillUI;
assert(core);
assert(ui);
assert.strictEqual(core.VERSION, '2.5.0');

const state = core.defaultState();
assert.strictEqual(state.ownedSkills.length, 3);
assert.strictEqual(state.noblePhantasms.length, 1);
assert.deepStrictEqual(state.ownedSkills[0].ascensionNames, { second: '', third: '' });
assert.deepStrictEqual(state.noblePhantasms[0].ascensionNames, {
  second: { reading: '', name: '' },
  third: { reading: '', name: '' }
});

const oversized = core.defaultState();
oversized.ownedSkills.push(global.FGODataAutofillInternal.newOwnedSkill(3));
oversized.noblePhantasms.push(global.FGODataAutofillInternal.newNoblePhantasm());
const fixed = core.normalizeState(oversized);
assert.strictEqual(fixed.ownedSkills.length, 3, 'owned skills must stay fixed at 3');
assert.strictEqual(fixed.noblePhantasms.length, 1, 'NP must stay fixed at 1');
assert.deepStrictEqual(fixed.ownedSkills.map((skill) => skill.label), ['Skill1', 'Skill2', 'Skill3']);
assert.strictEqual(fixed.noblePhantasms[0].heading, '');

const root = { innerHTML: '' };
ui.render(root, state);
assert(root.innerHTML.includes('形態・グループを追加'), 'class group add must remain');
assert(root.innerHTML.includes('このグループにスキルを追加'), 'class skill add must remain');
assert(root.innerHTML.includes('classGroups.0.heading'), 'class skill heading must remain');
assert(!root.innerHTML.includes('add-owned-skill'));
assert(!root.innerHTML.includes('delete-owned-skill'));
assert(!root.innerHTML.includes('見出し番号'));
assert(!root.innerHTML.includes('add-np'));
assert(!root.innerHTML.includes('delete-np'));
assert(!root.innerHTML.includes('小見出し'));
assert(root.innerHTML.includes('ownedSkills.0.ascensionNames.second'));
assert(root.innerHTML.includes('ownedSkills.0.ascensionNames.third'));
assert(root.innerHTML.includes('noblePhantasms.0.ascensionNames.second.reading'));
assert(root.innerHTML.includes('noblePhantasms.0.ascensionNames.third.name'));

state.ownedSkills[0].name = '第一名称';
state.ownedSkills[0].description = '通常解説';
state.ownedSkills[0].ascensionNames.second = '第二名称';
state.ownedSkills[0].ascensionNames.third = '第三名称';
state.ownedSkills[0].enhancedEnabled = true;
state.ownedSkills[0].enhanced.name = '第一名称・強化';
state.ownedSkills[0].enhanced.description = '強化解説';
state.ownedSkills[0].enhanced.ascensionNames.second = '第二名称・強化';
state.ownedSkills[0].enhanced2Enabled = true;
state.ownedSkills[0].enhanced2.name = '第一名称・強化後2';
state.ownedSkills[0].enhanced2.description = '強化後2解説';
state.ownedSkills[0].enhanced2.ascensionNames.third = '第三名称・強化後2';

const np = state.noblePhantasms[0];
Object.assign(np, {
  reading: 'だいいち', name: '第一宝具', rank: 'A', type: '対人宝具', card: 'Arts',
  range: '1', maxTargets: '1人', description: '宝具解説'
});
np.ascensionNames.second = { reading: 'だいに', name: '第二宝具' };
np.ascensionNames.third = { reading: 'だいさん', name: '第三宝具' };
np.enhancedEnabled = true;
Object.assign(np.enhanced, {
  reading: 'だいいち・かい', name: '第一宝具・改', rank: 'A+', type: '対人宝具', card: 'Arts',
  range: '1', maxTargets: '1人', description: '宝具強化解説'
});
np.enhanced.ascensionNames.third = { reading: 'だいさん・かい', name: '第三宝具・改' };

const output = core.applyAll('', state).text;
assert(output.includes('***Skill1：第一名称'));
assert(output.includes('#region(close,第二再臨後)'));
assert(output.includes('***Skill1：第二名称'));
assert(output.includes('***Skill1：第三名称'));
assert(output.includes('***Skill1[強化後]：第二名称・強化'));
assert(output.includes('***Skill1[強化後2]：第三名称・強化後2'));
assert(output.includes('だいに&br()第二宝具'));
assert(output.includes('だいさん&br()第三宝具'));
assert(output.includes('だいさん・かい&br()第三宝具・改'));
assert(!output.includes('強化2回目'));

console.log('FGO_DataAutofill ascension/fixed-slot tests passed');
