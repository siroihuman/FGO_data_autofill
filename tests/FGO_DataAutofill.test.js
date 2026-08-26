const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_ui.js');
const core = global.FGODataAutofillCore;
assert(core);
assert.strictEqual(core.VERSION, '2.3.0');
assert(core.SKILL_NOBLE_PREFIX.includes('最大捕捉'));
assert(!core.SKILL_NOBLE_PREFIX.includes('最大補足'));

const initial = core.defaultState();
assert.strictEqual(initial.ownedSkills[0].enhanced2Enabled, false);
assert(initial.ownedSkills[0].enhanced2);
assert.strictEqual(initial.noblePhantasms[0].enhanced2Enabled, false);
assert(initial.noblePhantasms[0].enhanced2);

const root = { innerHTML: '' };
global.FGODataAutofillUI.render(root, initial);
assert(root.innerHTML.includes('ver 2.3.0'));
assert(root.innerHTML.includes('強化2回目データを出力'));
assert(root.innerHTML.includes('強化2回目宝具を出力'));
assert(root.innerHTML.includes('最大捕捉'));
assert(!root.innerHTML.includes('最大補足'));

const source = `*No.
//KEEP_TOP

//─┤基本情報├──────────────────────────
*基本情報
|BGCOLOR(#98fb98):CENTER:46|BGCOLOR(#87ceeb):CENTER:46|BGCOLOR(#ffb6c1):CENTER:46|BGCOLOR(#e6e6fa):CENTER:58|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#e6e6fa):CENTER:20|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|c
|>|>|>|>|>|>|>|>|>|>|>|>|>|>|BGCOLOR(#17184b):COLOR(white):No.|
|>|>|BGCOLOR(#e6e6fa):真名|>|>|>|>|>|>|>|>|>|>|>|[[]]|
|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(剣金.png,icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別| |>|BGCOLOR(#e6e6fa):身長|cm|>|BGCOLOR(#e6e6fa):体重|kg|
**パラメーター
|筋力| |耐久|
|敏捷|~|魔力|
|幸運|~|宝具|

//─┤クラススキル├────────────────────────
**クラススキル
|old-class|
//KEEP_CLASS

//─┤保有スキル├─────────────────────────
**保有スキル
***Skill1：
|old1|
//#region(close,強化後)
//***Skill1[強化後]：
//|CUSTOM_ENHANCE1|
//#endregion
//#region(close,強化2回目)
//***Skill1[強化2回目]：
//|CUSTOM_ENHANCE2|
//#endregion
***Skill2：
|old2|
//#region(close,強化後)
//***Skill2[強化後]：
//|CUSTOM2_ENHANCE1|
//#endregion
***Skill3：
|old3|
//#region(close,強化後)
//***Skill3[強化後]：
//|CUSTOM3_ENHANCE1|
//#endregion
//KEEP_OWNED

//─┤宝具├────────────────────────────
**宝具
|old-np|
//KEEP_NP

//─┤絆礼装├────────────────────────────
**絆礼装
|old-bond|
//KEEP_BOND

//─┤武器├────────────────────────────
**武器
|old-weapon|
//KEEP_WEAPON`;

const state = core.defaultState();
Object.assign(state.basic, { no: '109', trueName: 'テスト', rarity: '3', className: 'アヴェンジャー', gender: '女性', height: '156', weight: '39' });
Object.assign(state.parameters, { strength: 'E', endurance: 'C', agility: 'D', magic: 'A', luck: 'D', noble: 'A+' });
state.classGroups = [{ heading: '', skills: [{ name: '復讐者 B', icon: '復讐者.png', description: '説明', rawWiki: false, rawBlock: '', isNoblePhantasm: false }] }];
state.ownedSkills = [1,2,3].map((n) => ({
  label: `Skill${n}`, name: `スキル${n}`, icon: `スキル${n}.png`, description: `解説${n}`,
  rawWiki: false, rawBlock: '', isNoblePhantasm: false,
  enhancedEnabled: false, enhanced: { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false },
  enhanced2Enabled: false, enhanced2: { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false }
}));
state.noblePhantasms = [{
  heading: '', reading: '読み', name: '宝具名', rank: 'A', type: '対軍宝具', card: 'Arts', range: '1～50', maxTargets: '500人', description: '宝具解説', rawWiki: false, rawBlock: '',
  enhancedEnabled: false, enhanced: {}, enhanced2Enabled: false, enhanced2: {}
}];
state.bondCraftEssence = { name: '絆の証', icon: '絆の証.png', description: '礼装説明。', rawWiki: false, rawBlock: '' };
state.weapon = { name: '─', description: '', rawWiki: false, rawBlock: '' };

const disabled = core.applyAll(source, state).text;
const s1 = disabled.indexOf('***Skill1：スキル1');
const e11 = disabled.indexOf('//***Skill1[強化後]：');
const e12 = disabled.indexOf('//***Skill1[強化2回目]：');
const s2 = disabled.indexOf('***Skill2：スキル2');
assert(s1 < e11 && e11 < e12 && e12 < s2, 'Skill1 -> 強化後 -> 強化2回目 -> Skill2');
assert(disabled.includes('//|CUSTOM_ENHANCE1|'));
assert(disabled.includes('//|CUSTOM_ENHANCE2|'));
assert(disabled.includes('//***Skill2[強化2回目]：'), 'missing second default disabled template');
assert(disabled.includes('//***Skill3[強化2回目]：'), 'missing second default disabled template');
assert(disabled.includes('//KEEP_OWNED'));

state.ownedSkills[0].enhancedEnabled = true;
Object.assign(state.ownedSkills[0].enhanced, { name: 'スキル1改', icon: 'スキル1.png', description: '強化1', rawWiki: false, rawBlock: '', isNoblePhantasm: false });
state.ownedSkills[0].enhanced2Enabled = true;
Object.assign(state.ownedSkills[0].enhanced2, { name: 'スキル1極', icon: 'スキル1.png', description: '強化2', rawWiki: false, rawBlock: '', isNoblePhantasm: false });
state.noblePhantasms[0].enhancedEnabled = true;
Object.assign(state.noblePhantasms[0].enhanced, { reading: '読み改', name: '宝具名改', rank: 'A+', type: '対軍宝具', card: 'Arts', range: '1～60', maxTargets: '600人', description: '宝具強化1', rawWiki: false, rawBlock: '' });
state.noblePhantasms[0].enhanced2Enabled = true;
Object.assign(state.noblePhantasms[0].enhanced2, { reading: '読み極', name: '宝具名極', rank: 'A++', type: '対軍宝具', card: 'Arts', range: '1～70', maxTargets: '700人', description: '宝具強化2', rawWiki: false, rawBlock: '' });

const enabled = core.applyAll(source, state).text;
const es1 = enabled.indexOf('***Skill1：スキル1');
const ae1 = enabled.indexOf('***Skill1[強化後]：スキル1改');
const ae2 = enabled.indexOf('***Skill1[強化2回目]：スキル1極');
const es2 = enabled.indexOf('***Skill2：スキル2');
assert(es1 < ae1 && ae1 < ae2 && ae2 < es2);
assert(enabled.includes('#region(close,強化2回目)'));
assert(enabled.includes('宝具名改'));
assert(enabled.includes('宝具名極'));
assert(enabled.indexOf('宝具名改') < enabled.indexOf('宝具名極'));
assert(enabled.includes('最大捕捉：600人'));
assert(enabled.includes('最大捕捉：700人'));
assert(!enabled.includes('最大補足'));

const oldState = core.defaultState();
oldState.ownedSkills[0].enhanced2Enabled = true;
const normalized = core.normalizeState(oldState);
assert.strictEqual(normalized.ownedSkills[0].enhancedEnabled, true, 'second enhancement requires first');
oldState.noblePhantasms[0].enhanced2Enabled = true;
const normalizedNp = core.normalizeState(oldState);
assert.strictEqual(normalizedNp.noblePhantasms[0].enhancedEnabled, true, 'second NP enhancement requires first');

const oldTerm = core.defaultState();
oldTerm.classGroups[0].skills[0].description = '&font(b,110%){種別：対宝具　レンジ：1　最大補足：1人}&br()本文';
const normalizedTerm = core.normalizeState(oldTerm);
assert(normalizedTerm.classGroups[0].skills[0].description.includes('最大捕捉'));
assert(!normalizedTerm.classGroups[0].skills[0].description.includes('最大補足'));

const fresh = core.applyAll('', state).text;
assert(fresh.includes('***Skill1[強化後]：スキル1改'));
assert(fresh.includes('***Skill1[強化2回目]：スキル1極'));
assert(fresh.includes('宝具名改'));
assert(fresh.includes('宝具名極'));
assert(fresh.indexOf('***Skill1[強化後]：') < fresh.indexOf('***Skill1[強化2回目]：'));

console.log('FGO_DataAutofill 2.3.0 tests passed');
