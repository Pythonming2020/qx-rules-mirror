/*
 * zhihu_adkill_v3.js — 删除原型 (removal prototype)
 * 目标端点:
 *   - api.zhihu.com/topstory/recommend  -> 删 is_advertiser===true 的卡片
 *   - page-modular.zhihu.com/templates  -> 删带 za_ad_info/ad/ad_verb 的广告模块
 * 行为: 真删除 + 报告删前/删后长度与被删元素判定字段。
 */
const body = $response.body;
const url = $request.url || "";

function findArray(obj) {
  // 返回最可能的"列表"数组: 名为 data / templates / items / list 的数组, 否则第一个数组
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object") {
    for (const k of ["data", "templates", "items", "list", "cards"]) {
      if (Array.isArray(obj[k])) return obj[k];
    }
    for (const k of Object.keys(obj)) {
      if (Array.isArray(obj[k]) && obj[k].length > 0) return obj[k];
    }
  }
  return null;
}

function isAdItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.is_advertiser === true) return true;
  if (item.ad === 1 || item.ad === true) return true;
  if (item.za_ad_info || item.za_ad_info_json || item.ad_verb) return true;
  if (typeof item.card_type === "string" && /ad|advert|commercial|promo/i.test(item.card_type)) return true;
  return false;
}

function elemTag(item) {
  // 用于日志核对的判定字段
  return JSON.stringify({
    card_type: item.card_type,
    type: item.type,
    id: item.id,
    is_advertiser: item.is_advertiser,
    ad: item.ad,
    title: (item.title || "").slice(0, 24)
  });
}

let parsed = null;
try { parsed = JSON.parse(body); } catch (e) {
  console.log("ZPARSEERR|" + url);
  $done({ body });
  return;
}

const isTop = /topstory\/recommend/.test(url);
const isMod = /page-modular\.zhihu\.com\/templates/.test(url);

let removed = 0;
let tags = [];

if (isTop || isMod) {
  const arr = findArray(parsed);
  if (arr) {
    const before = arr.length;
    const keep = [];
    for (const it of arr) {
      if (isAdItem(it)) { removed++; tags.push(elemTag(it)); }
      else keep.push(it);
    }
    // 写回原数组位置
    if (Array.isArray(parsed)) {
      parsed.length = 0; parsed.push(...keep);
    } else {
      for (const k of ["data", "templates", "items", "list", "cards"]) {
        if (Array.isArray(parsed[k])) { parsed[k] = keep; break; }
      }
      // 兜底: 第一个数组
      for (const k of Object.keys(parsed)) {
        if (Array.isArray(parsed[k]) && parsed[k].length === before) { parsed[k] = keep; break; }
      }
    }
    console.log("ZKILL|" + (isTop ? "topstory" : "page-modular") +
      "|before=" + before + "|after=" + keep.length + "|removed=" + removed);
    if (tags.length) console.log("ZTAGS|" + tags.slice(0, 5).join(" || "));
  } else {
    console.log("ZNOARR|" + (isTop ? "topstory" : "page-modular"));
  }
}

$done({ body: JSON.stringify(parsed) });
