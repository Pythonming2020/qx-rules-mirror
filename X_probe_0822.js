/*
 * X_probe_0822.js — X App API 探针 (read-only, 2026-08-22)
 * 目标: 找出 iOS X App 时间线/广告的真实端点与判定字段
 * 策略:
 *   1. 打印响应 URL (前120字符)
 *   2. 若 JSON: 统计 instructions/entries 结构 + promoted 相关键路径 + 广告条目计数
 *   3. 只读, $done({body}) 原样放行; 超大 body 跳过
 */
const body = $response.body;
const url = $request.url || "";

if (body && body.length > 800000) {
  console.log("XTOOBIG|" + url.slice(0, 120));
  $done({ body });
  return;
}

let parsed;
try { parsed = JSON.parse(body); } catch (e) {
  console.log("XERR|parse|" + e);
  $done({ body });
  return;
}

console.log("XURL|" + url.slice(0, 120));

// ---- 1. 广告键全树扫描(路径 → 值摘要) ----
const found = {};
function scan(obj, path, depth) {
  if (depth > 7) return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < Math.min(obj.length, 8); i++) scan(obj[i], path + "[" + i + "]", depth + 1);
  } else if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (/promot|advert|sponsor|ad-|ads|ad_|_ad/i.test(k)) {
        const key = path + "." + k;
        if (!found[key]) found[key] = JSON.stringify(obj[k]).slice(0, 100);
      }
      scan(obj[k], path + "." + k, depth + 1);
    }
  }
}
scan(parsed, "", 0);
const fk = Object.keys(found);
console.log("X_ADSCAN|hits=" + fk.length);
fk.slice(0, 25).forEach(k => console.log("X_ADK|" + k + " = " + found[k]));

// ---- 2. 时间线结构摘要(HomeTimeline 形如 data.home.home_timeline_urt.instructions[]) ----
try {
  const tl = parsed.data?.home?.home_timeline_urt;
  if (tl && Array.isArray(tl.instructions)) {
    let entries = 0, promoted = 0, types = {};
    for (const ins of tl.instructions) {
      if (Array.isArray(ins.entries)) {
        for (const e of ins.entries) {
          entries++;
          const id = e.entryId || "";
          if (id && id.toLowerCase().includes("promot")) promoted++;
          else if (e.content?.itemContent?.promotedMetadata) promoted++;
          types[e.entryType || e.type || "?"] = (types[e.entryType || e.type || "?"] || 0) + 1;
        }
      }
    }
    console.log("X_TL|entries=" + entries + "|promoted=" + promoted + "|types=" + JSON.stringify(types).slice(0, 150));
  } else {
    console.log("X_NOSUMMARY|top=" + Object.keys(parsed.data || {}).join(",").slice(0, 120));
  }
} catch (e) {
  console.log("X_SSERR|" + e);
}

$done({ body });
