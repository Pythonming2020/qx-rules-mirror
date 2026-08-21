/*
 * zhihu_probe_0821c.js — v5 深挖探针 (read-only)
 * 目标: 找到信息流广告卡在 data[] 里的精确判定字段
 * 策略:
 *   1. 全量扫 data[] 每张卡, 打印 type + id + za/extra 内的关键字段
 *   2. 深挖 za 对象 (埋点) — 广告埋点通常带 adzone/adclass/creativity 之类
 *   3. 递归搜整棵树里任何含 ad/promot/commercial/sponsor 的键名
 */
const body = $response.body;
const url = $request.url || "";

let parsed;
try { parsed = JSON.parse(body); } catch (e) {
  console.log("V5ERR|parse|" + e);
  $done({ body });
  return;
}

const tag = /topstory\/recommend/.test(url) ? "ts"
          : /page-modular/.test(url) ? "pm"
          : "other";

// ---- 1. 全量卡片概览 ----
const cards = parsed && parsed.data;
if (Array.isArray(cards)) {
  console.log("V5_CARDS|" + tag + "|n=" + cards.length);
  cards.forEach((c, i) => {
    const id = c.id || "";
    const t = c.type || "";
    // za 对象的顶层键
    let zaKeys = "";
    if (c.za && typeof c.za === "object") zaKeys = Object.keys(c.za).slice(0,15).join(",");
    // extra 的顶层键
    let exKeys = "";
    if (c.extra && typeof c.extra === "object") {
      exKeys = Object.keys(c.extra).slice(0,20).join(",");
      // extra 里常见广告信号值
      const sig = [];
      for (const k of ["ad","is_ad","ad_type","ad_class","commercial_type","card_class"]) {
        if (k in c.extra) sig.push(k+"="+JSON.stringify(c.extra[k]).slice(0,30));
      }
      if (sig.length) exKeys += "|SIG:" + sig.join(",");
    }
    // style 键
    let stKeys = "";
    if (c.style && typeof c.style === "object") stKeys = Object.keys(c.style).slice(0,10).join(",");
    console.log(`V5_CARD|${tag}|[${i}]|type=${t}|id=${id}|za=[${zaKeys}]|extra=[${exKeys}]`);
  });

  // ---- 2. 深挖第一张卡的 za 完整内容(样例) ----
  if (cards[0] && cards[0].za) {
    try {
      console.log("V5_ZA0|" + tag + "|" + JSON.stringify(cards[0].za).slice(0, 600));
    } catch(e){}
  }

  // ---- 3. 全树搜广告类键名 (深度优先, 记录路径) ----
  const found = {};
  function scan(obj, path, depth) {
    if (depth > 6) return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < Math.min(obj.length, 10); i++) scan(obj[i], path+"["+i+"]", depth+1);
    } else if (obj && typeof obj === "object") {
      for (const k of Object.keys(obj)) {
        if (/ad|advert|promot|sponsor|commercial/i.test(k)) {
          const key = path + "." + k;
          if (!found[key]) found[key] = JSON.stringify(obj[k]).slice(0, 80);
        }
        scan(obj[k], path+"."+k, depth+1);
      }
    }
  }
  scan(parsed, "", 0);
  const fk = Object.keys(found);
  console.log("V5_ADSCAN|" + tag + "|hits=" + fk.length);
  fk.slice(0, 25).forEach(k => console.log("V5_ADK|" + tag + "|" + k + " = " + found[k]));
} else {
  console.log("V5_NOCARDS|" + tag + "|top=" + Object.keys(parsed||{}).join(","));
}

$done({ body });
