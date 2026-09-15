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
require('../FGO_DataAutofill_icon_refresh_patch.js');
require('../FGO_DataAutofill_bond_icon_picker_patch.js');
require('../FGO_DataAutofill_basic_profiles_patch.js');
require('../FGO_DataAutofill_basic_profiles_output_guard.js');

const core = global.FGODataAutofillCore;
const ui = global.FGODataAutofillUI;
assert.strictEqual(core.VERSION, '2.6.13');
assert.strictEqual(ui.skillIconCatalogPageUrl, 'https://w.atwiki.jp/siroi_human/pages/20.html');
assert.strictEqual(typeof ui.skillIconPopupHtml, 'function');
assert.strictEqual(typeof ui.refreshSkillIconCatalog, 'function');
assert.strictEqual(typeof ui.skillIconRefreshButtonHtml, 'function');
assert.strictEqual(ui.bondCraftEssenceIconPickerEnabled, true);
assert(ui.skillIconRefreshButtonHtml().includes('data-skill-icon-refresh'));
assert(ui.skillIconRefreshButtonHtml().includes('アイコン一覧を更新'));

const state = core.defaultState();
state.classGroups[0].skills[0].icon = '対魔力.png';
state.ownedSkills[0].icon = '攻撃力アップ.png';
state.ownedSkills[0].ascensionMode = 'full';
state.ownedSkills[0].ascensionData.second.icon = '防御力アップ.png';
state.ownedSkills[0].special.enabled = true;
state.ownedSkills[0].special.data.icon = 'NP増加.png';
state.bondCraftEssence.icon = '礼装効果.png';

const root = { innerHTML: '' };
ui.render(root, state);

assert(root.innerHTML.includes('data-skill-icon-picker-for="classGroups.0.skills.0.icon"'));
assert(root.innerHTML.includes('data-skill-icon-picker-for="ownedSkills.0.icon"'));
assert(root.innerHTML.includes('data-skill-icon-picker-for="ownedSkills.0.ascensionData.second.icon"'));
assert(root.innerHTML.includes('data-skill-icon-picker-for="ownedSkills.0.special.data.icon"'));
assert(root.innerHTML.includes('type="hidden" data-path="ownedSkills.0.icon" value="攻撃力アップ.png"'));
assert(root.innerHTML.includes('data-skill-icon-open'));
assert(root.innerHTML.includes('アイコンを選択'));
assert(!root.innerHTML.includes('data-skill-icon-catalog'));
assert(!root.innerHTML.includes('アイコン名を検索'));
assert(root.innerHTML.includes('data-skill-icon-picker-for="bondCraftEssence.icon"'));
assert(root.innerHTML.includes('type="hidden" data-path="bondCraftEssence.icon" value="礼装効果.png"'));
assert(root.innerHTML.includes('<span>効果アイコン</span>'));
assert(!root.innerHTML.includes('<span>礼装アイコン</span><input data-path="bondCraftEssence.icon"'));

const popup = ui.skillIconPopupHtml();
assert(popup.includes('data-skill-icon-modal'));
assert(popup.includes('role="dialog"'));
assert(popup.includes('アイコン名を検索'));
assert(popup.includes('data-skill-icon-catalog'));
assert(popup.includes('data-skill-icon-close'));

state.basic.profiles[0].gender = '性別不明';
assert.strictEqual(core.normalizeState(state).basic.gender, '性別不明');
const page = core.buildFreshPage(state);
assert(page.includes(':性別|-|'));

console.log('FGO_DataAutofill icon popup / bond CE / refresh / unknown gender tests passed');
