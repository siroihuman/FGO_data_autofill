const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_ui.js');
const core = global.FGODataAutofillCore;
assert(core);
assert.strictEqual(core.VERSION, '2.2.0');

const templateSkill = { description: '通常説明。', isNoblePhantasm: false };
core.toggleNobleTemplate(templateSkill, true);
assert.strictEqual(templateSkill.isNoblePhantasm, true);
assert(templateSkill.description.startsWith(core.SKILL_NOBLE_PREFIX));
assert(templateSkill.description.endsWith('通常説明。'));
templateSkill.description = templateSkill.description.replace('種別：対宝具', '種別：対人宝具');
assert.strictEqual(core.skillDescription(templateSkill), templateSkill.description);
core.toggleNobleTemplate(templateSkill, true);
assert.strictEqual((templateSkill.description.match(/種別：/g) || []).length, 1, 'edited template must not be duplicated');

const exactTemplate = { description: core.SKILL_NOBLE_PREFIX + '本文', isNoblePhantasm: true };
core.toggleNobleTemplate(exactTemplate, false);
assert.strictEqual(exactTemplate.description, '本文');

const root = { innerHTML: '' };
global.FGODataAutofillUI.render(root, core.defaultState());
assert(root.innerHTML.includes('ver 2.2.0'));
assert(root.innerHTML.includes('<h3>絆礼装</h3>'));
assert(root.innerHTML.includes('bondCraftEssence.name'));
assert(root.innerHTML.includes('bondCraftEssence.icon'));
assert(root.innerHTML.includes('bondCraftEssence.description'));
assert(root.innerHTML.includes('data-noble-toggle="classGroups.0.skills.0"'));
assert(root.innerHTML.includes('宝具情報テンプレートをフレーバーテキストの先頭に挿入'));
const bondSection = root.innerHTML.split('<h3>絆礼装</h3>')[1].split('</section>')[0];
assert(!bondSection.includes('data-noble-toggle'));

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
//|old-enhance1|
//#endregion
***Skill2：
|old2|
//#region(close,強化後)
//***Skill2[強化後]：
//|old-enhance2|
//#endregion
***Skill3：
|old3|
//#region(close,強化後)
//***Skill3[強化後]：
//|old-enhance3|
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
Object.assign(state.basic, {
  no: '109', trueName: 'テスト', rarity: '3', className: 'アヴェンジャー',
  gender: '女性', height: '156', weight: '39'
});
Object.assign(state.parameters, { strength: 'E', endurance: 'C', agility: 'D', magic: 'A', luck: 'D', noble: 'A+' });
state.classGroups = [{ heading: '', skills: [{ name: '復讐者 B', icon: '復讐者.png', description: '説明', rawWiki: false, rawBlock: '', isNoblePhantasm: false }] }];
core.toggleNobleTemplate(state.classGroups[0].skills[0], true);
state.classGroups[0].skills[0].description = state.classGroups[0].skills[0].description.replace('種別：対宝具', '種別：対人宝具');
state.ownedSkills = [1,2,3].map((n) => ({
  label: `Skill${n}`, name: `スキル${n}`, icon: `スキル${n}.png`, description: `解説${n}`,
  rawWiki: false, rawBlock: '', isNoblePhantasm: false, enhancedEnabled: false,
  enhanced: { name: '', icon: '0.png', description: '', rawWiki: false, rawBlock: '', isNoblePhantasm: false }
}));
state.noblePhantasms = [{
  heading: '', reading: '読み', name: '宝具名', rank: 'A', type: '対軍宝具', card: 'Arts',
  range: '1～50', maxTargets: '500人', description: '宝具解説', rawWiki: false, rawBlock: '', enhancedEnabled: false, enhanced: {}
}];
state.bondCraftEssence = { name: '絆の証', icon: '絆の証.png', description: '礼装説明。', rawWiki: false, rawBlock: '' };
state.weapon = { name: '─', description: '', rawWiki: false, rawBlock: '' };

const result = core.applyAll(source, state);
assert.strictEqual(result.fresh, false);
assert(result.text.includes('身長|156cm|'));
assert(result.text.includes('体重|39kg|'));
assert(result.text.includes('&ref(讐銀.png,icon/class,width=30)'));
assert(result.text.includes('種別：対人宝具'));
assert.strictEqual((result.text.match(/種別：対人宝具/g) || []).length, 1);
assert(result.text.includes('**絆礼装'));
assert(result.text.includes('&ref(絆の証.png,icon/skill,height=48)'));
assert(result.text.includes('&font(b,110%){絆の証}&ref(讐銀.png,icon/class,title=アヴェンジャー'));
assert(result.text.includes('|~|礼装説明。|'));
assert(result.text.includes('//KEEP_BOND'));
for (const marker of ['//KEEP_TOP','//KEEP_CLASS','//KEEP_OWNED','//KEEP_NP','//KEEP_BOND','//KEEP_WEAPON']) {
  assert(result.text.includes(marker), marker);
}
const p1 = result.text.indexOf('***Skill1：スキル1');
const r1 = result.text.indexOf('//***Skill1[強化後]：');
const p2 = result.text.indexOf('***Skill2：スキル2');
const r2 = result.text.indexOf('//***Skill2[強化後]：');
const p3 = result.text.indexOf('***Skill3：スキル3');
const r3 = result.text.indexOf('//***Skill3[強化後]：');
assert(p1 < r1 && r1 < p2 && p2 < r2 && r2 < p3 && p3 < r3);

const oldWithoutBond = source.replace(/\n\/\/─┤絆礼装├[^\n]*\n\*\*絆礼装\n\|old-bond\|\n\/\/KEEP_BOND\n/g, '\n');
const inserted = core.applyAll(oldWithoutBond, state).text;
assert(inserted.includes('**絆礼装'));
assert(inserted.indexOf('**絆礼装') < inserted.indexOf('**武器'));
assert(inserted.includes('絆の証'));

const fresh = core.applyAll('', state).text;
assert(fresh.includes('//─┤絆礼装├────────────────────────────'));
assert(fresh.includes('**絆礼装'));
assert(fresh.includes('絆の証'));
assert(fresh.indexOf('**絆礼装') < fresh.indexOf('**武器'));

console.log('FGO_DataAutofill 2.2.0 tests passed');