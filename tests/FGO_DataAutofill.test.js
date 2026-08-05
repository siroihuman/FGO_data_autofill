const assert = require('assert');

global.__FGO_DATA_AUTOFILL_TEST__ = true;
require('../v1.0.0/FGO_DataAutofill_atwiki.js');

const core = global.FGODataAutofillCore;
assert(core, 'core should be exposed');

assert.strictEqual(core.inferSkillIcon('陣地作成 B+'), '陣地作成.png');
assert.strictEqual(core.inferSkillIcon('領域外の生命 EX'), '領域外の生命.png');

const normalGroups = [{
  heading: '',
  className: 'キャスター',
  classIcon: '術金.png',
  skills: [{
    name: '陣地作成 B+',
    icon: '陣地作成.png',
    flavor: '魔術師として、自らに有利な陣地を作り上げる。\n“工房”と“祭壇”の形成が可能。',
    rawWiki: false
  }]
}];

const normal = core.replaceClassSkillSection(core.DEFAULT_TEMPLATE, normalGroups);
assert.strictEqual(normal.replaced, true);
assert(normal.text.includes('|&ref(陣地作成.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){陣地作成 B+}&ref(術金.png,icon/class,title=キャスター,height=25,width=25)|'));
assert(normal.text.includes('|~|魔術師として、自らに有利な陣地を作り上げる。&br()“工房”と“祭壇”の形成が可能。|'));
assert(normal.text.includes('//─┤保有スキル├─────────────────────────'));
assert(normal.text.includes('**保有スキル'));
assert(!normal.text.includes('【スキル名】'));

const specialGroups = [
  {
    heading: '〔通常〕', className: 'キャスター', classIcon: '術金.png',
    skills: [{ name: '陣地作成 B+', icon: '陣地作成.png', flavor: '通常形態。', rawWiki: false }]
  },
  {
    heading: '〔特殊形態〕', className: 'フォーリナー', classIcon: '降金.png',
    skills: [{ name: '領域外の生命 EX', icon: '領域外の生命.png', flavor: '&font(b,110%){特殊記法}&br()', rawWiki: true }]
  }
];
const special = core.replaceClassSkillSection(core.DEFAULT_TEMPLATE, specialGroups);
assert(special.text.includes('***〔通常〕'));
assert(special.text.includes('***〔特殊形態〕'));
assert(special.text.includes('title=フォーリナー'));
assert(special.text.includes('|~|&font(b,110%){特殊記法}&br()|'));

const missing = core.replaceClassSkillSection('*基本情報\n本文', normalGroups);
assert.strictEqual(missing.replaced, false);
assert.strictEqual(missing.text, '*基本情報\n本文');

console.log('FGO_DataAutofill tests passed');
