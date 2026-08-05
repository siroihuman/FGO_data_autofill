const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../FGO_DataAutofill_core.js');
require('../FGO_DataAutofill_ui.js');
const core = global.FGODataAutofillCore;
assert(core, 'core should be exposed');
assert.strictEqual(core.VERSION, '2.1.0');

const root = { innerHTML: '' };
global.FGODataAutofillUI.render(root, core.defaultState());
assert(root.innerHTML.includes('ver 2.1.0'));
assert(root.innerHTML.includes('レアリティ'));
assert(root.innerHTML.includes('data-basic-class'));
assert(!root.innerHTML.includes('クラス表記'));
assert(!root.innerHTML.includes('クラスアイコン'));
assert(!root.innerHTML.includes('エリセ・クリステンセン'));
assert(!root.innerHTML.includes('陣地作成'));
assert(root.innerHTML.includes('宝具：宝具情報テンプレートをフレーバーテキストの先頭に追加'));
assert(root.innerHTML.includes('宝具：宝具情報テンプレートを解説の先頭に追加'));

const classCodes = {
  セイバー: '剣', アーチャー: '弓', ランサー: '槍', ライダー: '騎', キャスター: '術',
  アサシン: '殺', バーサーカー: '狂', シールダー: '盾', ルーラー: '裁',
  アヴェンジャー: '讐', ムーンキャンサー: '月', アルターエゴ: '分',
  フォーリナー: '降', プリテンダー: '詐', ビースト: '獣'
};
for (const [className, code] of Object.entries(classCodes)) {
  assert.strictEqual(core.getClassIcon(className, 5), `${code}金.png`);
  assert.strictEqual(core.getClassIcon(className, 4), `${code}金.png`);
  assert.strictEqual(core.getClassIcon(className, 3), `${code}銀.png`);
  assert.strictEqual(core.getClassIcon(className, 2), `${code}銅.png`);
  assert.strictEqual(core.getClassIcon(className, 1), `${code}銅.png`);
}
assert.strictEqual(core.getClassIcon('', 5), '0.png');
assert.strictEqual(core.inferSkillIcon('復讐者 B'), '復讐者.png');

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
  no: '001', trueName: 'テストサーヴァント', rarity: '3', className: 'アヴェンジャー',
  gender: '女性', height: '150cm', weight: '40kg'
});
Object.assign(state.parameters, { strength: 'E', endurance: 'C', agility: 'D', magic: 'A', luck: 'D', noble: 'A+' });
state.classGroups = [{
  heading: '', className: 'セイバー', classIcon: '剣金.png',
  skills: [{
    name: '復讐者 B', icon: '復讐者.png', description: '一行目。\n二行目。', rawWiki: false,
    rawBlock: '', isNoblePhantasm: true
  }]
}];
state.ownedSkills = [{
  label: 'Skill1', name: 'テストスキル A', icon: 'テストスキル.png',
  description: '通常解説。', rawWiki: false, rawBlock: '', isNoblePhantasm: true,
  enhancedEnabled: true,
  enhanced: {
    name: 'テストスキル A+', icon: 'テストスキル.png', description: '強化後解説。',
    rawWiki: false, rawBlock: '', isNoblePhantasm: true
  }
}];
state.noblePhantasms = [{
  heading: '', reading: 'テスト', name: '試験宝具', rank: 'A+', type: '対軍宝具', card: 'Arts',
  range: '1～50', maxTargets: '500人', description: '宝具解説。', rawWiki: false, rawBlock: '',
  enhancedEnabled: false, enhanced: {}
}];
state.weapon = { name: '─', description: '武器解説。', rawWiki: false, rawBlock: '' };

const result = core.applyAll(source, state);
assert.strictEqual(result.fresh, false);
assert(result.text.startsWith('*No.001'));
assert(result.text.includes('BGCOLOR(#17184b):COLOR(white):No.001'));
assert(result.text.includes('[[テストサーヴァント]]'));
assert(result.text.includes('&ref(讐銀.png,icon/class,width=30)'));
assert(result.text.includes('&font(b,110%){復讐者 B}&ref(讐銀.png,icon/class,title=アヴェンジャー'));
assert(result.text.includes(`|~|${core.SKILL_NOBLE_PREFIX}一行目。&br()二行目。|`));
assert(result.text.includes(`|~|${core.SKILL_NOBLE_PREFIX}通常解説。|`));
assert(result.text.includes(`|~|${core.SKILL_NOBLE_PREFIX}強化後解説。|`));
assert(result.text.includes('***Skill1：テストスキル A'));
assert(result.text.includes('#region(close,強化後)'));
assert(result.text.includes('***Skill1[強化後]：テストスキル A+'));
assert(result.text.includes('BGCOLOR(#9AF):CENTER:45'));
assert(result.text.includes('テスト&br()試験宝具'));
assert(result.text.includes('レンジ：1～50　最大補足：500人'));
assert(result.text.includes('&font(b,110%){【─】}'));
assert(result.text.includes('//─┤保有スキル├─────────────────────────'));
assert(!result.text.includes('|old|'));
assert.deepStrictEqual(result.report.missing, []);

const normalized = core.normalizeState(state);
assert.strictEqual(normalized.basic.classIcon, '讐銀.png');
assert(normalized.classGroups.every((group) => group.className === 'アヴェンジャー'));
assert(normalized.classGroups.every((group) => group.classIcon === '讐銀.png'));

const fresh = core.applyAll('', state);
assert.strictEqual(fresh.fresh, true);
assert(fresh.text.includes('*No.001'));
assert(fresh.text.includes('**クラススキル'));
assert(fresh.text.includes('**保有スキル'));
assert(fresh.text.includes('**宝具'));
assert(fresh.text.includes('**武器'));

const special = core.defaultState();
Object.assign(special.basic, { rarity: '2', className: 'フォーリナー' });
special.classGroups = [{ heading: '〔特殊〕', skills: [{ rawBlock: '|特殊クラススキル|', name: '', icon: '', description: '' }] }];
special.ownedSkills = [{ label: 'Skill4', name: '', icon: '', description: '', rawBlock: '|特殊保有スキル|', enhancedEnabled: false, enhanced: {} }];
special.noblePhantasms = [{ rawBlock: '|特殊宝具|', enhancedEnabled: false, enhanced: {} }];
special.weapon = { rawBlock: '|特殊武器|', name: '', description: '' };
const specialFresh = core.applyAll('', special).text;
assert(specialFresh.includes('&ref(降銅.png,icon/class,width=30)'));
assert(specialFresh.includes('***〔特殊〕'));
assert(specialFresh.includes('|特殊クラススキル|'));
assert(specialFresh.includes('|特殊保有スキル|'));
assert(specialFresh.includes('|特殊宝具|'));
assert(specialFresh.includes('|特殊武器|'));

console.log('FGO_DataAutofill tests passed');
