const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_atwiki.js');
const core = global.FGODataAutofillCore;
assert(core, 'core should be exposed');
assert.strictEqual(core.VERSION, '2.0.0');
assert.strictEqual(core.inferSkillIcon('陣地作成 B+'), '陣地作成.png');

const source = `*No.

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
|old|

//─┤保有スキル├─────────────────────────

**保有スキル
***Skill1：
|old|

//─┤宝具├────────────────────────────

**宝具
|old|

//─┤武器├────────────────────────────

**武器
|old|`;

const state = core.defaultState();
Object.assign(state.basic, {
  no: '109', trueName: 'エリセ・クリステンセン', className: 'アヴェンジャー',
  classIcon: '讐金.png', gender: '女性', height: '156cm', weight: '39kg'
});
Object.assign(state.parameters, { strength: 'E', endurance: 'C', agility: 'D', magic: 'A', luck: 'D', noble: 'A+' });
state.classGroups = [{
  heading: '', className: 'アヴェンジャー', classIcon: '讐金.png',
  skills: [{ name: '復讐者 B', icon: '復讐者.png', description: '一行目。\n二行目。', rawWiki: false, rawBlock: '' }]
}];
state.ownedSkills = [{
  label: 'Skill1', name: '灰と共に在る者たち A', icon: '即死耐性ダウン.png',
  description: '解説。', rawWiki: false, rawBlock: '', enhancedEnabled: true,
  enhanced: { name: '灰と共に在る者たち A+', icon: '即死耐性ダウン.png', description: '強化後。', rawWiki: false, rawBlock: '' }
}];
state.noblePhantasms = [{
  heading: '', reading: 'デン・レンセンデ・フランメン', name: '清めの炎は天を穿つ',
  rank: 'A+', type: '対軍宝具', card: 'Arts', range: '1～50', maxTargets: '500人',
  description: '宝具解説。', rawWiki: false, rawBlock: '', enhancedEnabled: false,
  enhanced: {}
}];
state.weapon = { name: '─', description: '武器解説。', rawWiki: false, rawBlock: '' };

const result = core.applyAll(source, state);
assert.strictEqual(result.fresh, false);
assert(result.text.startsWith('*No.109'));
assert(result.text.includes('BGCOLOR(#17184b):COLOR(white):No.109'));
assert(result.text.includes('[[エリセ・クリステンセン]]'));
assert(result.text.includes('&ref(讐金.png,icon/class,width=30)'));
assert(result.text.includes('|筋力|BGCOLOR(#ea5506):|||||E| |耐久|BGCOLOR(#ea5506):|BGCOLOR(#ea5506):|BGCOLOR(#ea5506):|||C|'));
assert(result.text.includes('&font(b,110%){復讐者 B}&ref(讐金.png,icon/class,title=アヴェンジャー'));
assert(result.text.includes('|~|一行目。&br()二行目。|'));
assert(result.text.includes('***Skill1：灰と共に在る者たち A'));
assert(result.text.includes('#region(close,強化後)'));
assert(result.text.includes('***Skill1[強化後]：灰と共に在る者たち A+'));
assert(result.text.includes('BGCOLOR(#9AF):CENTER:45'));
assert(result.text.includes('デン・レンセンデ・フランメン&br()清めの炎は天を穿つ'));
assert(result.text.includes('レンジ：1～50　最大補足：500人'));
assert(result.text.includes('&font(b,110%){【─】}'));
assert(result.text.includes('//─┤保有スキル├─────────────────────────'));
assert(!result.text.includes('|old|'));
assert.deepStrictEqual(result.report.missing, []);

const fresh = core.applyAll('', state);
assert.strictEqual(fresh.fresh, true);
assert(fresh.text.includes('*No.109'));
assert(fresh.text.includes('**クラススキル'));
assert(fresh.text.includes('**保有スキル'));
assert(fresh.text.includes('**宝具'));
assert(fresh.text.includes('**武器'));

const special = core.defaultState();
special.classGroups = [{ heading: '〔特殊〕', className: 'フォーリナー', classIcon: '降金.png', skills: [{ rawBlock: '|特殊クラススキル|', name: '', icon: '', description: '' }] }];
special.ownedSkills = [{ label: 'Skill4', name: '', icon: '', description: '', rawBlock: '|特殊保有スキル|', enhancedEnabled: false, enhanced: {} }];
special.noblePhantasms = [{ rawBlock: '|特殊宝具|', enhancedEnabled: false, enhanced: {} }];
special.weapon = { rawBlock: '|特殊武器|', name: '', description: '' };
const specialFresh = core.applyAll('', special).text;
assert(specialFresh.includes('***〔特殊〕'));
assert(specialFresh.includes('|特殊クラススキル|'));
assert(specialFresh.includes('|特殊保有スキル|'));
assert(specialFresh.includes('|特殊宝具|'));
assert(specialFresh.includes('|特殊武器|'));

console.log('FGO_DataAutofill tests passed');
