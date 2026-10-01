/*
 * zhihu_probe_0821e.js — v7 探针 (read-only, 覆盖详情域 page-info)
 * 在 v6 (0821d) 基础上:
 *   1. 覆盖 page-info.zhihu.com/answers/v2 等详情页接口 (tag: ans/qs/pin/rel)
 *   2. 卡片候选键扩展: data/datas/related/related_data/recommend/recommend_data/items/list
 *   3. 全树广告键扫描不变 (过滤 badge/Read/preload 误报)
 * 安全: 只读, $done({body}) 原样放行。超大 body 跳过。
 */
const body = $response.body;
const url = $request.url || "";

if (body && body.length > 500000) {
  console.log("V7TOOBIG|" + url.slice(0, 120));
  $done({ body });
  return;
}

let parsed;
try { parsed = JSON.parse(body); } catch (e) {
  console.log("V7ERR|parse|" + e);
  $done({ body });
  return;
}

const tag = /page-info\.zhihu\.com\/answers/.test(url) ? "ans"
          : /page-info\.zhihu\.com\/(question|questions)/.test(url) ? "qs"
          : /page-info\.zhihu\.com\/.*(related|recommend)/.test(url) ? "rel"
          : /page-info\.zhihu\.com/.test(url) ? "pin"
          : /topstory\/recommend/.test(url) ? "ts"
          : /page-modular/.test(url) ? "pm"
          : /answers\//.test(url) ? "ans2"
          : /articles\//.test(url) ? "ar"
          : /comments/.test(url) ? "cm"
          : /videos?/.test(url) ? "vi"
          : /bazaar/.test(url) ? "bz"
          : "ot";

// ---- 1. 卡片候选 ----
let cards = null;
for (const k of ["data", "datas", "related", "related_data", "recommend", "recommend_data", "items", "list", "feed"]) {
  if (parsed && Array.isArray(parsed[k])) { cards = parsed[k]; break; }
}
if (!cards && Array.isArray(parsed)) cards = parsed;

if (Array.isArray(cards)) {
  console.log("V7_CARDS|" + tag + "|n=" + cards.length + "|url=" + url.split("?")[0].slice(-70));
  cards.forEach((c, i) => {
    if (i > 30) return;
    if (!c || typeof c !== "object") return;
    const id = c.id ? String(c.id).slice(0, 30) : "";
    const t = c.type ? String(c.type).slice(0, 30) : "";
    let zaKeys = "";
    if (c.za && typeof c.za === "object") zaKeys = Object.keys(c.za).slice(0, 15).join(",");
    let exKeys = "", sig = [];
    if (c.extra && typeof c.extra === "object") {
      exKeys = Object.keys(c.extra).slice(0, 20).join(",");
      for (const k of ["ad", "is_ad", "ad_type", "ad_class", "commercial_type", "card_class", "is_advertiser", "business_type", "is_promote"]) {
        if (k in c.extra) sig.push(k + "=" + JSON.stringify(c.extra[k]).slice(0, 40));
      }
    }
    for (const k of ["is_advertiser", "card_type", "ad", "ad_type", "commercial_type", "is_promote"]) {
      if (k in c) sig.push(k + "=" + JSON.stringify(c[k]).slice(0, 40));
    }
    if (sig.length) exKeys += "|SIG:" + sig.join(",");
    console.log(`V7_CARD|${tag}|[${i}]|type=${t}|id=${id}|za=[${zaKeys}]|extra=[${exKeys}]`);
  });

  if (cards[0] && cards[0].za) {
    try { console.log("V7_ZA0|" + tag + "|" + JSON.stringify(cards[0].za).slice(0, 500)); } catch(e){}
  }
} else {
  console.log("V7_NOCARDS|" + tag + "|top=" + Object.keys(parsed || {}).join(",").slice(0, 150) + "|url=" + url.split("?")[0].slice(-70));
}

// ---- 2. 全树搜广告键 ----
const found = {};
function scan(obj, path, depth) {
  if (depth > 6) return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < Math.min(obj.length, 10); i++) scan(obj[i], path + "[" + i + "]", depth + 1);
  } else if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (/ad|advert|promot|sponsor|commercial/i.test(k)) {
        const key = path + "." + k;
        if (!found[key]) found[key] = JSON.stringify(obj[k]).slice(0, 80);
      }
      scan(obj[k], path + "." + k, depth + 1);
    }
  }
}
scan(parsed, "", 0);
const fk = Object.keys(found);
const dirty = fk.filter(k => !/badge|Read|read|preload|extra|avatar|head|gradient|shadow|thread|placeholder/i.test(k));
console.log("V7_ADSCAN|" + tag + "|hits=" + fk.length + "|dirty=" + dirty.length);
dirty.slice(0, 30).forEach(k => console.log("V7_ADK|" + tag + "|" + k + " = " + found[k]));

$done({ body });
