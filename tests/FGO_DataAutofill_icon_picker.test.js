const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_runtime_patch.js');
require('../FGO_DataAutofill_ascension_patch.js');
require('../FGO_DataAutofill_np_stage_guard.js');
require('../FGO_DataAutofill_ascension_span_patch.js');
require('../FGO_DataAutofill_gender_patch.js');
require('../FGO_DataAutofill_ui.js');
require('../FGO_DataAutofill_ascension_ui_patch.js');
require('../FGO_DataAutofill_icon_picker_patch.js');

const core = global.FGODataAutofillCore;
const ui = global.FGODataAutofillUI;
assert.strictEqual(core.VERSION, '2.6.4');
assert.strictEqual(ui.skillIconCatalogPageUrl, 'https://w.atwiki.jp/siroi_human/pages/20.html');

const state = core.defaultState();
state.classGroups[0].skills[0].icon = '対魔力.png';
state.ownedSkills[0].icon = '攻撃力アップ.png';
state.ownedSkills[0].ascensionMode = 'full';
state.ownedSkills[0].ascensionData.second.icon = '防御力アップ.png';
state.ownedSkills[0].special.enabled = true;
state.ownedSkills[0].special.data.icon = 'NP増加.png';
state.bondCraftEssence.icon = '礼装アイコン.png';

const root = { innerHTML: '' };
ui.render(root, state);

assert(root.innerHTML.includes('data-skill-icon-picker-for="classGroups.0.skills.0.icon"'));
assert(root.innerHTML.includes('data-skill-icon-picker-for="ownedSkills.0.icon"'));
assert(root.innerHTML.includes('data-skill-icon-picker-for="ownedSkills.0.ascensionData.second.icon"'));
assert(root.innerHTML.includes('data-skill-icon-picker-for="ownedSkills.0.special.data.icon"'));
assert(root.innerHTML.includes('type="hidden" data-path="ownedSkills.0.icon" value="攻撃力アップ.png"'));
assert(root.innerHTML.includes('アイコン一覧から選択'));
assert(root.innerHTML.includes('アイコン名を検索'));
assert(root.innerHTML.includes('data-path="bondCraftEssence.icon"'));
assert(!root.innerHTML.includes('data-skill-icon-picker-for="bondCraftEssence.icon"'));

state.basic.gender = '性別不明';
assert.strictEqual(core.normalizeState(state).basic.gender, '性別不明');
const page = core.buildFreshPage(state);
assert(page.includes(':性別|-|'));

console.log('FGO_DataAutofill icon picker / unknown gender tests passed');
