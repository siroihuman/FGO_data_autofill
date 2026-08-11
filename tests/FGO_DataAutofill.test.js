const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
const core = global.FGODataAutofillCore;
assert(core, 'core should be exposed');
assert.strictEqual(core.VERSION, '2.1.2');
assert.strictEqual(core.withUnit('156', 'cm'), '156cm');
assert.strictEqual(core.withUnit('156cm', 'cm'), '156cm');
assert.strictEqual(core.withUnit('', 'cm'), 'cm');
assert.strictEqual(core.withUnit('39', 'kg'), '39kg');
assert.strictEqual(core.getClassIcon('アヴェンジャー', 3), '讐銀.png');

const source = `*No.
// ページ先頭の独自コメントを保持

//─┤基本情報├──────────────────────────
*基本情報
|BGCOLOR(#98fb98):CENTER:46|BGCOLOR(#87ceeb):CENTER:46|BGCOLOR(#ffb6c1):CENTER:46|BGCOLOR(#e6e6fa):CENTER:58|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#e6e6fa):CENTER:20|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|c
|>|>|>|>|>|>|>|>|>|>|>|>|>|>|BGCOLOR(#17184b):COLOR(white):No.|
|>|>|BGCOLOR(#e6e6fa):真名|>|>|>|>|>|>|>|>|>|>|>|[[]]|
|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(剣金.png,icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別| |>|BGCOLOR(#e6e6fa):身長|cm|>|BGCOLOR(#e6e6fa):体重|kg|
//KEEP_BASIC
**パラメーター
|筋力| |耐久|
|敏捷|~|魔力|
|幸運|~|宝具|
//KEEP_PARAMETER

//─┤クラススキル├────────────────────────
**クラススキル
|old-class|
//KEEP_CLASS
//|COMMENTED_CLASS_TEMPLATE|

//─┤保有スキル├─────────────────────────
**保有スキル
***Skill1：
|old1|
//#region(close,強化後)
//***Skill1[強化後]：
//|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
//|~|CUSTOM_SKILL1_TEMPLATE|
//#endregion
***Skill2：
|old2|
//#region(close,強化後)
//***Skill2[強化後]：
//|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
//|~|CUSTOM_SKILL2_TEMPLATE|
//#endregion
***Skill3：
|old3|
//#region(close,強化後)
//***Skill3[強化後]：
//|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
//|~|CUSTOM_SKILL3_TEMPLATE|
//#endregion
//KEEP_OWNED
//***Skill：
//|OPTIONAL_GENERIC_TEMPLATE|

//─┤宝具├────────────────────────────
**宝具
|old-np|
//KEEP_NP
//Arts宝具：|BGCOLOR(#9AF):CENTER:45|

//─┤武器├────────────────────────────
**武器
|old-weapon|
//KEEP_WEAPON
//PAGE_END_KEEP`;

const state = core.defaultState();
Object.assign(state.basic, {
  no: '109', trueName: 'テスト', rarity: '3', className: 'アヴェンジャー',
  gender: '女性', height: '156', weight: '39'
});
Object.assign(state.parameters, { strength: 'E', endurance: 'C', agility: 'D', magic: 'A', luck: 'D', noble: 'A+' });
state.classGroups = [{ heading: '', skills: [{ name: '復讐者 B', icon: '復讐者.png', description: '解説' }] }];
state.ownedSkills = [1, 2, 3].map((n) => ({
  label: `Skill${n}`, name: `スキル${n}`, icon: `スキル${n}.png`, description: `解説${n}`,
  rawWiki: false, rawBlock: '', isNoblePhantasm: false, enhancedEnabled: false,
  enhanced: { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false }
}));
state.noblePhantasms = [{
  heading: '', reading: '読み', name: '宝具名', rank: 'A', type: '対軍宝具', card: 'Arts',
  range: '1～50', maxTargets: '500人', description: '宝具解説', rawWiki: false, rawBlock: '',
  enhancedEnabled: false, enhanced: {}
}];
state.weapon = { name: '─', description: '', rawWiki: false, rawBlock: '' };

const result = core.applyAll(source, state);
assert.strictEqual(result.fresh, false);
assert(result.text.includes('身長|156cm|'));
assert(result.text.includes('体重|39kg|'));
assert(result.text.includes('&ref(讐銀.png,icon/class,width=30)'));
for (const marker of [
  '// ページ先頭の独自コメントを保持', '//KEEP_BASIC', '//KEEP_PARAMETER', '//KEEP_CLASS',
  '//|COMMENTED_CLASS_TEMPLATE|', '//KEEP_OWNED', '//***Skill：', '//|OPTIONAL_GENERIC_TEMPLATE|',
  '//KEEP_NP', '//Arts宝具：|BGCOLOR(#9AF):CENTER:45|', '//KEEP_WEAPON', '//PAGE_END_KEEP'
]) assert(result.text.includes(marker), `missing preserved marker: ${marker}`);

const p1 = result.text.indexOf('***Skill1：スキル1');
const r1 = result.text.indexOf('//***Skill1[強化後]：');
const p2 = result.text.indexOf('***Skill2：スキル2');
const r2 = result.text.indexOf('//***Skill2[強化後]：');
const p3 = result.text.indexOf('***Skill3：スキル3');
const r3 = result.text.indexOf('//***Skill3[強化後]：');
assert(p1 >= 0 && p1 < r1 && r1 < p2 && p2 < r2 && r2 < p3 && p3 < r3,
  'each enhancement region must be immediately associated with its skill');
assert(result.text.includes('//|~|CUSTOM_SKILL1_TEMPLATE|'));
assert(result.text.includes('//|~|CUSTOM_SKILL2_TEMPLATE|'));
assert(result.text.includes('//|~|CUSTOM_SKILL3_TEMPLATE|'));

state.ownedSkills[1].enhancedEnabled = true;
state.ownedSkills[1].enhanced = {
  name: 'スキル2強化', icon: 'スキル2.png', description: '強化解説',
  rawWiki: false, rawBlock: '', isNoblePhantasm: false
};
const enabled = core.applyAll(source, state).text;
const ep1 = enabled.indexOf('***Skill1：スキル1');
const er1 = enabled.indexOf('//***Skill1[強化後]：');
const ep2 = enabled.indexOf('***Skill2：スキル2');
const activeR2 = enabled.indexOf('***Skill2[強化後]：スキル2強化');
const ep3 = enabled.indexOf('***Skill3：スキル3');
assert(ep1 < er1 && er1 < ep2 && ep2 < activeR2 && activeR2 < ep3);
assert(!enabled.includes('//|~|CUSTOM_SKILL2_TEMPLATE|'));
assert(enabled.includes('//|~|CUSTOM_SKILL1_TEMPLATE|'));
assert(enabled.includes('//|~|CUSTOM_SKILL3_TEMPLATE|'));

const fresh = core.applyAll('', state).text;
assert(fresh.includes('身長|156cm|'));
assert(fresh.includes('体重|39kg|'));
assert(fresh.indexOf('***Skill1：スキル1') < fresh.indexOf('//***Skill1[強化後]：'));
assert(fresh.indexOf('//***Skill1[強化後]：') < fresh.indexOf('***Skill2：スキル2'));
assert(fresh.indexOf('***Skill2[強化後]：スキル2強化') < fresh.indexOf('***Skill3：スキル3'));

console.log('FGO_DataAutofill 2.1.2 tests passed');
