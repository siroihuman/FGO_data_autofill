const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_runtime_patch.js');
require('../FGO_DataAutofill_ascension_patch.js');
require('../FGO_DataAutofill_np_stage_guard.js');
require('../FGO_DataAutofill_ascension_span_patch.js');

const core = global.FGODataAutofillCore;
assert.strictEqual(core.VERSION, '2.6.3');

const state = core.defaultState();
const skill = state.ownedSkills[0];
skill.name = '通常スキル';
skill.description = '通常効果';

skill.ascensionMode = 'nameOnly';
skill.ascensionNames.second = '';
skill.ascensionNames.third = '第三再臨スキル';
let owned = core.buildOwnedSkillsWithAscension(state.ownedSkills, {});
assert(owned.includes('***Skill1[第一・第二再臨時]：通常スキル'));
assert(owned.includes('***Skill1[第三再臨時]：第三再臨スキル'));

skill.ascensionNames.second = '第二再臨スキル';
skill.ascensionNames.third = '';
owned = core.buildOwnedSkillsWithAscension(state.ownedSkills, {});
assert(owned.includes('***Skill1[第一再臨時]：通常スキル'));
assert(owned.includes('#region(第二・第三再臨時)'));
assert(owned.includes('***Skill1[第二・第三再臨時]：第二再臨スキル'));

skill.ascensionMode = 'full';
skill.ascensionData.second = { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false };
skill.ascensionData.third = { name: '第三再臨スキル', icon: '0.png', description: '第三効果', rawWiki: false, rawBlock: '', isNoblePhantasm: false };
owned = core.buildOwnedSkillsWithAscension(state.ownedSkills, {});
assert(owned.includes('***Skill1[第一・第二再臨時]：通常スキル'));
assert(owned.includes('***Skill1[第三再臨時]：第三再臨スキル'));

skill.ascensionData.second = { name: '第二再臨スキル', icon: '0.png', description: '第二効果', rawWiki: false, rawBlock: '', isNoblePhantasm: false };
skill.ascensionData.third = { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false };
owned = core.buildOwnedSkillsWithAscension(state.ownedSkills, {});
assert(owned.includes('***Skill1[第一再臨時]：通常スキル'));
assert(owned.includes('***Skill1[第二・第三再臨時]：第二再臨スキル'));

const np = state.noblePhantasms[0];
Object.assign(np, {
  heading: '宝具', reading: '通常', name: '通常宝具', rank: 'A', type: '対人宝具',
  card: 'Arts', range: '1', maxTargets: '1人', description: '通常効果'
});

np.ascensionMode = 'nameOnly';
np.ascensionNames.second = { reading: '', name: '' };
np.ascensionNames.third = { reading: '第三', name: '第三宝具' };
let noble = core.buildNoblePhantasmWithAscension(np);
assert(noble.includes('***宝具[第一・第二再臨時]'));
assert(noble.includes('***宝具[第三再臨時]'));

np.ascensionNames.second = { reading: '第二', name: '第二宝具' };
np.ascensionNames.third = { reading: '', name: '' };
noble = core.buildNoblePhantasmWithAscension(np);
assert(noble.includes('***宝具[第一再臨時]'));
assert(noble.includes('#region(close,第二・第三再臨時)'));
assert(noble.includes('***宝具[第二・第三再臨時]'));

np.ascensionMode = 'full';
np.ascensionNames.second = { reading: '', name: '' };
np.ascensionNames.third = { reading: '', name: '' };
np.ascensionData.second = {
  reading: '', name: '', rank: '', type: '対宝具', card: 'Buster',
  range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: ''
};
np.ascensionData.third = {
  reading: '第三', name: '第三宝具', rank: 'A', type: '対人宝具', card: 'Arts',
  range: '1', maxTargets: '1人', description: '第三効果', rawWiki: false, rawBlock: ''
};
noble = core.buildNoblePhantasmWithAscension(np);
assert(noble.includes('***宝具[第一・第二再臨時]'));
assert(noble.includes('***宝具[第三再臨時]'));

np.ascensionData.second = {
  reading: '第二', name: '第二宝具', rank: 'A', type: '対人宝具', card: 'Arts',
  range: '1', maxTargets: '1人', description: '第二効果', rawWiki: false, rawBlock: ''
};
np.ascensionData.third = {
  reading: '', name: '', rank: '', type: '対宝具', card: 'Buster',
  range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: ''
};
noble = core.buildNoblePhantasmWithAscension(np);
assert(noble.includes('***宝具[第一再臨時]'));
assert(noble.includes('***宝具[第二・第三再臨時]'));

np.ascensionData.second = {
  reading: '', name: '', rank: '', type: '対宝具', card: 'Buster',
  range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: ''
};
np.ascensionData.third = {
  reading: '', name: '', rank: '', type: '対宝具', card: 'Buster',
  range: '', maxTargets: '', description: '', rawWiki: false, rawBlock: ''
};
noble = core.buildNoblePhantasmWithAscension(np);
assert(noble.includes('***宝具[第一・第二・第三再臨時]'));

console.log('FGO_DataAutofill ascension span tests passed');
