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
require('../FGO_DataAutofill_basic_profiles_dom_sync.js');

const core = global.FGODataAutofillCore;
const ui = global.FGODataAutofillUI;
assert.strictEqual(core.VERSION, '2.6.13');
assert.strictEqual(ui.multipleBasicProfilesEnabled, true);
assert.strictEqual(typeof core.forceBasicProfileRows, 'function');
assert.strictEqual(typeof ui.syncBasicProfilesFromDom, 'function');

const migrated = core.normalizeState({
  basic: {
    no: '113', trueName: 'デウカリオン＆ピュラ', rarity: '4', className: 'ライダー',
    gender: '男性', height: '179', weight: '73'
  }
});
assert.strictEqual(migrated.basic.profiles.length, 1);
assert.deepStrictEqual(migrated.basic.profiles[0], { gender: '男性', height: '179', weight: '73', note: '' });

const state = core.defaultState();
Object.assign(state.basic, { no: '113', trueName: 'デウカリオン＆ピュラ', rarity: '4', className: 'ライダー' });
state.basic.profiles = [
  { gender: '男性', height: '179', weight: '73', note: 'デウカリオン' },
  { gender: '女性', height: '157', weight: '45', note: 'ピュラ' }
];

const rows = core.buildBasicProfileRows(core.normalizeState(state).basic);
assert.deepStrictEqual(rows, [
  '|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(騎金.png,icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別|男性&footnote(デウカリオン)|>|BGCOLOR(#e6e6fa):身長|179cm&footnote(デウカリオン)|>|BGCOLOR(#e6e6fa):体重|73kg&footnote(デウカリオン)|',
  '|~|~|~|~|~|~|~|~|女性&footnote(ピュラ)|~|~|157cm&footnote(ピュラ)|~|~|45kg&footnote(ピュラ)|'
]);

const blankAddedState = core.defaultState();
Object.assign(blankAddedState.basic, { rarity: '4', className: 'ライダー' });
blankAddedState.basic.profiles = [
  { gender: '男性', height: '179', weight: '73', note: '' },
  { gender: '', height: '', weight: '', note: '' }
];
const blankAddedRows = core.buildBasicProfileRows(core.normalizeState(blankAddedState).basic);
assert.strictEqual(blankAddedRows[1], '|~|~|~|~|~|~|~|~|~|~|~|~|~|~|~|');
assert(core.buildFreshPage(blankAddedState).includes(blankAddedRows[1]));

const partialBlankState = core.defaultState();
Object.assign(partialBlankState.basic, { rarity: '4', className: 'ライダー' });
partialBlankState.basic.profiles = [
  { gender: '男性', height: '179', weight: '73', note: 'デウカリオン' },
  { gender: '女性', height: '', weight: '45', note: 'ピュラ' }
];
const partialBlankRows = core.buildBasicProfileRows(core.normalizeState(partialBlankState).basic);
assert.strictEqual(partialBlankRows[1], '|~|~|~|~|~|~|~|~|女性&footnote(ピュラ)|~|~|~|~|~|45kg&footnote(ピュラ)|');

let page = core.buildFreshPage(state);
assert(page.includes(rows[0]));
assert(page.includes(rows[1]));

const oneRowOnly = page.split('\n').filter((line) => !/^\|~\|~\|~\|~\|~\|~\|~\|~\|/.test(line)).join('\n');
const guarded = core.forceBasicProfileRows(oneRowOnly, state);
assert(guarded.includes(rows[0]));
assert(guarded.includes(rows[1]));

const domState = core.defaultState();
Object.assign(domState.basic, { rarity: '4', className: 'ライダー' });
const domFields = [
  ['basic.profiles.0.gender', '男性'],
  ['basic.profiles.0.height', '179'],
  ['basic.profiles.0.weight', '73'],
  ['basic.profiles.0.note', 'デウカリオン'],
  ['basic.profiles.1.gender', '女性'],
  ['basic.profiles.1.height', '157'],
  ['basic.profiles.1.weight', '45'],
  ['basic.profiles.1.note', 'ピュラ']
].map(([path, value]) => ({ dataset: { path }, value }));
const fakeRoot = {
  querySelectorAll(selector) {
    assert.strictEqual(selector, '[data-path^="basic.profiles."]');
    return domFields;
  }
};
assert.strictEqual(ui.syncBasicProfilesFromDom(fakeRoot, domState), true);
assert.deepStrictEqual(domState.basic.profiles, [
  { gender: '男性', height: '179', weight: '73', note: 'デウカリオン' },
  { gender: '女性', height: '157', weight: '45', note: 'ピュラ' }
]);
const domPage = core.buildFreshPage(domState);
assert(domPage.includes(rows[0]));
assert(domPage.includes(rows[1]));

state.basic.profiles[1].gender = '性別不明';
page = core.buildFreshPage(state);
assert(page.includes('|~|~|~|~|~|~|~|~|-&footnote(ピュラ)|~|~|157cm&footnote(ピュラ)|~|~|45kg&footnote(ピュラ)|'));

const root = { innerHTML: '' };
ui.render(root, state);
assert(root.innerHTML.includes('data-path="basic.profiles.0.gender"'));
assert(root.innerHTML.includes('data-path="basic.profiles.0.note"'));
assert(root.innerHTML.includes('data-path="basic.profiles.1.gender"'));
assert(root.innerHTML.includes('data-action="add-basic-profile"'));
assert(root.innerHTML.includes('data-action="delete-basic-profile"'));
assert(!root.innerHTML.includes('例：'));

const single = core.defaultState();
Object.assign(single.basic, { rarity: '4', className: 'ライダー' });
single.basic.profiles[0] = { gender: '男性', height: '179', weight: '73', note: '' };
const source = core.buildFreshPage(single);
assert(source.includes('|>|>|BGCOLOR(#e6e6fa):Class|'));
const applied = core.applyAll(source, state).text;
assert(applied.includes(rows[0]));
assert(applied.includes('|~|~|~|~|~|~|~|~|-&footnote(ピュラ)|~|~|157cm&footnote(ピュラ)|~|~|45kg&footnote(ピュラ)|'));

console.log('FGO_DataAutofill multiple basic profile / blank inheritance / DOM sync / class-row matching tests passed');
