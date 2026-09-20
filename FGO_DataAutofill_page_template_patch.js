(function () {
  'use strict';

  const core = globalThis.FGODataAutofillCore;
  if (!core) throw new Error('FGO Data Autofill core is not loaded.');

  const VERSION = '2.6.14';
  const originalApplyAll = core.applyAll;

  const PAGE_TEMPLATE = String.raw`*No.
#divclass(fgowiki-clearfix){{{
#divclass(srv_menu){
#contents(fromhere=true)}
#divclass(gallery){{
}}
}}}


//─┤基本情報├──────────────────────────

*基本情報
|BGCOLOR(#98fb98):CENTER:46|BGCOLOR(#87ceeb):CENTER:46|BGCOLOR(#ffb6c1):CENTER:46|BGCOLOR(#e6e6fa):CENTER:58|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#e6e6fa):CENTER:20|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:50|BGCOLOR(#f5fffa):CENTER:100|c
|>|>|>|>|>|>|>|>|>|>|>|>|>|>|BGCOLOR(#17184b):COLOR(white):No.|
|>|>|BGCOLOR(#e6e6fa):真名|>|>|>|>|>|>|>|>|>|>|>|[[]]|
|>|>|BGCOLOR(#e6e6fa):Class|>|>|&ref(剣金.png,icon/class,width=30)|>|BGCOLOR(#e6e6fa):性別| |>|BGCOLOR(#e6e6fa):身長|cm|>|BGCOLOR(#e6e6fa):体重|kg|
**パラメーター
|BGCOLOR(#000):COLOR(#fff):CENTER:60|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#000):COLOR(#fff):CENTER:25|BGCOLOR(#000):0|BGCOLOR(#000):COLOR(#fff):CENTER:60|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#683f36):CENTER:20|BGCOLOR(#000):COLOR(#fff):CENTER:25|c
|筋力| |耐久|
|敏捷|~|魔力|
|幸運|~|宝具|


//─┤クラススキル├────────────────────────

**クラススキル
|BGCOLOR(#e6e6fa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
|&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【スキル名】}&ref(.png,icon/class,title=セイバー,height=25,width=25)|
|~||

|BGCOLOR(#e6e6fa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
|&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【スキル名】}&ref(.png,icon/class,title=セイバー,height=25,width=25)|
|~||

//|BGCOLOR(#e6e6fa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【スキル名】}&ref(.png,icon/class,title=セイバー,height=25,width=25)|
//|~||

//|BGCOLOR(#e6e6fa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【スキル名】}&ref(.png,icon/class,title=セイバー,height=25,width=25)|
//|~|&font(b,110%){種別：対宝具　レンジ：　最大捕捉：人}&br()&font(b,105%){“”}&br()|


//─┤保有スキル├─────────────────────────

**保有スキル
***Skill1：
|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
|~| |
//#region(close,強化後)
//***Skill1[強化後]：
//|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
//|~| |
//#endregion
***Skill2：
|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
|~| |
//#region(close,強化後)
//***Skill2[強化後]：
//|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
//|~| |
//#endregion
***Skill3：
|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
|~| |
//#region(close,強化後)
//***Skill3[強化後]：
//|BGCOLOR(#f5fffa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
//|BGCOLOR(#e6e6fa):CENTER:&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:解説|
//|~| |
//#endregion


//─┤宝具├────────────────────────────

**宝具
////真名隠し状態の宝具が作中にある場合はコメントアウトを外す
////#divclass(truenameNoble){{{
//|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c
//|>|>|~&br()？？？|
//|ランク|種別|解説|
//|BGCOLOR(#F88):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c
//|？|？？？|&font(b,110%){レンジ：　最大捕捉：人}|
//#region(close,真名判明後)
//***真名判明後&nobold(){}

|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c
|>|>|~&br()|
|ランク|種別|解説|
|BGCOLOR(#F88):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c
||対宝具|&font(b,110%){レンジ：　最大捕捉：人}&br()|
//#region(close,強化後)
//#br
////真名隠し状態の宝具が作中にある場合はコメントアウトを外す
//#divclass(truenameNoble){{{

//|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c
//|>|>|~&br()|
//|ランク|種別|解説|
//|BGCOLOR(#F88):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c
//||対宝具|&font(b,110%){レンジ：　最大捕捉：人}&br()|

////真名隠し状態の宝具が作中にある場合はコメントアウトを外す
//#endregion
//#endregion
//}}}

////真名隠し状態の宝具が作中にある場合はコメントアウトを外す
////#divclass(truenameNoble){{{
//|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c
//|>|>|~&br()？？？|
//|ランク|種別|解説|
//|BGCOLOR(#F88):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c
//|？|？？？|&font(b,110%){レンジ：　最大捕捉：人}|
//#region(close,真名判明後)
//***真名判明後&nobold(){}

|BGCOLOR(#e6e6fa):CENTER:65|BGCOLOR(#e6e6fa):CENTER:85|BGCOLOR(#e6e6fa):CENTER:1000|c
|>|>|~&br()|
|ランク|種別|解説|
|BGCOLOR(#F88):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c
||対宝具|&font(b,110%){レンジ：　最大捕捉：人}&br()|

////真名隠し状態の宝具が作中にある場合はコメントアウトを外す
//#endregion
//}}}

//Arts宝具：|BGCOLOR(#9AF):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c
//Quick宝具：|BGCOLOR(#AF9):CENTER:45|BGCOLOR(#f5fffa):CENTER:65|BGCOLOR(#f5fffa):LEFT:1000|c


//─┤絆礼装├────────────────────────────

**絆礼装
|BGCOLOR(#e6e6fa):CENTER:45|BGCOLOR(#f5fffa):LEFT:1000|c
|&ref(0.png,icon/skill,height=48)|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【礼装名】}&ref(.png,icon/class,title=セイバー,height=25,width=25)|
|~||


//─┤武器├────────────────────────────

**武器
|BGCOLOR(#f5fffa):LEFT:1000|c
|BGCOLOR(#e6e6fa):CENTER:&font(b,110%){【武器名】}|
| |`;

  function buildFreshPage(rawState) {
    return originalApplyAll(PAGE_TEMPLATE, rawState).text;
  }

  core.buildFreshPage = buildFreshPage;
  core.applyAll = function (sourceCode, rawState) {
    const source = String(sourceCode == null ? '' : sourceCode);
    if (!source.trim()) {
      return {
        text: buildFreshPage(rawState),
        report: { replaced: ['新規ページ全体'], missing: [] },
        fresh: true
      };
    }
    return originalApplyAll(sourceCode, rawState);
  };

  core.VERSION = VERSION;
  core.PAGE_TEMPLATE = PAGE_TEMPLATE;
})();
