/*
 * zhihu_adkill_v4.js — 信息流广告卡删除 (2026-08-22)
 * 依据: 2026-08-22 15:05 日志实证 — 广告卡 type=feed_advert, id=AD_*, 带 ad.ad_verb/za_ad_info_json
 * 判定: type==="feed_advert" || is_advertiser===true || (c.ad && c.ad.ad_verb) || (c.card_type 含 ad/advert/promote)
 * 只删纯广告卡, 保留 ComponentCard 等正常卡。
 * 报告: ZKILL|ts|before=N|after=M|removed=K + ZTAGS|<判定字段> (前5)
 */
const body = $response.body;
const url = $request.url || "";

let parsed;
try { parsed = JSON.parse(body); } catch (e) {
  console.log("ZKILLERR|parse|" + e);
  $done({ body });
  return;
}

let removed = 0;
const tags = [];
const before = Array.isArray(parsed && parsed.data) ? parsed.data.length : -1;

if (Array.isArray(parsed && parsed.data)) {
  parsed.data = parsed.data.filter((c) => {
    if (!c || typeof c !== "object") return true;
    const isAd = c.type === "feed_advert"
      || c.is_advertiser === true
      || (c.ad && (c.ad.ad_verb || c.ad.display_advertising_tag))
      || (c.card_type && /ad|advert|promote/i.test(String(c.card_type)));
    if (isAd) {
      removed++;
      if (tags.length < 5) {
        const t = (c.type ? "type=" + c.type : "") + (c.card_type ? ",card_type=" + c.card_type : "") +
                  (c.ad && c.ad.ad_verb ? ",ad_verb=" + c.ad.ad_verb : "") +
                  (c.is_advertiser !== undefined ? ",is_advertiser=" + c.is_advertiser : "");
        tags.push(t);
      }
    }
    return !isAd;
  });
}

const after = Array.isArray(parsed && parsed.data) ? parsed.data.length : -1;
console.log("ZKILL|ts|before=" + before + "|after=" + after + "|removed=" + removed);
if (tags.length) console.log("ZTAGS|" + tags.join(" || "));

if (removed > 0) {
  $done({ body: JSON.stringify(parsed) });
} else {
  $done({ body });
}
