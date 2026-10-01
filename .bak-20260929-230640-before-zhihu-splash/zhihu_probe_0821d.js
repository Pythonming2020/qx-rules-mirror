/*
 * zhihu_probe_0821d.js — v6 宽覆盖探针 (read-only)
 * 覆盖: 详情页(answers/questions/articles) + 相关推荐 + 评论 + 视频 + bazaar 等
 * 目标: 找到"帖子内广告卡"藏身的接口和精确判定字段
 * 策略:
 *   1. 全量扫所有卡片, 打印 type + id + za/extra 关键字段
 *   2. 深挖 za 对象 (埋点) — 广告埋点通常带 adzone/adclass/creativity 之类
 *   3. 递归搜整棵树里任何含 ad/promot/commercial/sponsor 的键名
 * 安全: 只读, $done({body}) 原样放行。超大 body 跳过。
 */
const body = $response.body;
const url = $request.url || "";

if (body && body.length > 500000) {
  console.log("V6TOOBIG|" + url.slice(0, 120));
  $done({ body });
  return;
}

let parsed;
try { parsed = JSON.parse(body); } catch (e) {
  console.log("V6ERR|parse|" + e);
  $done({ body });
  return;
}

const tag = /topstory\/recommend/.test(url) ? "ts"
          : /page-modular/.test(url) ? "pm"
          : /answers\//.test(url) ? "ans"
          : /questions\//.test(url) ? "qs"
          : /articles\//.test(url) ? "ar"
          : /related/.test(url) ? "rel"
          : /comments/.test(url) ? "cm"
          : /videos?/.test(url) ? "vi"
          : /bazaar/.test(url) ? "bz"
          : /appview/.test(url) ? "av"
          : "ot";

// ---- 1. 全量卡片概览 (兼容 data 或相关推荐数组) ----
const cards = Array.isArray(parsed && parsed.data) ? parsed.data
              : Array.isArray(parsed && parsed.related) ? parsed.related
              : Array.isArray(parsed) ? parsed
              : null;
if (Array.isArray(cards)) {
  console.log("V6_CARDS|" + tag + "|n=" + cards.length + "|url=" + url.split("?")[0].slice(-60));
  cards.forEach((c, i) => {
    if (i > 25) return;
    if (!c || typeof c !== "object") return;
    const id = c.id || "";
    const t = c.type || "";
    let zaKeys = "";
    if (c.za && typeof c.za === "object") zaKeys = Object.keys(c.za).slice(0, 15).join(",");
    let exKeys = "", sig = [];
    if (c.extra && typeof c.extra === "object") {
      exKeys = Object.keys(c.extra).slice(0, 20).join(",");
      for (const k of ["ad", "is_ad", "ad_type", "ad_class", "commercial_type", "card_class", "is_advertiser", "business_type"]) {
        if (k in c.extra) sig.push(k + "=" + JSON.stringify(c.extra[k]).slice(0, 40));
      }
    }
    // 卡片本级常见广告判定字段
    for (const k of ["is_advertiser", "card_type", "ad", "ad_type", "commercial_type"]) {
      if (k in c) sig.push(k + "=" + JSON.stringify(c[k]).slice(0, 40));
    }
    if (sig.length) exKeys += "|SIG:" + sig.join(",");
    console.log(`V6_CARD|${tag}|[${i}]|type=${t}|id=${id}|za=[${zaKeys}]|extra=[${exKeys}]`);
  });

  // ---- 2. 深挖第一张卡的 za 完整内容(样例) ----
  if (cards[0] && cards[0].za) {
    try {
      console.log("V6_ZA0|" + tag + "|" + JSON.stringify(cards[0].za).slice(0, 600));
    } catch(e){}
  }
} else {
  console.log("V6_NOCARDS|" + tag + "|top=" + Object.keys(parsed || {}).join(",").slice(0, 120) + "|url=" + url.split("?")[0].slice(-60));
}

// ---- 3. 全树搜广告类键名 (深度优先, 记录路径) ----
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
const dirty = fk.filter(k => !/badge|Read|read|preload|extra|avatar|head|gradient|shadow/i.test(k));
console.log("V6_ADSCAN|" + tag + "|hits=" + fk.length + "|dirty=" + dirty.length);
dirty.slice(0, 30).forEach(k => console.log("V6_ADK|" + tag + "|" + k + " = " + found[k]));

$done({ body });
