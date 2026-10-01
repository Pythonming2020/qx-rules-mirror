// Hornet unlock v4 (native) (2026-08-29) — QX script-response-body
// TEMP — 测完删除. 在 v3 基础上:
//   1) premium.app_store_identifier 补齐(此前为 null, 疑似客户端判定条件)
//   2) entitlements 的 hornet_x metadata 补 product_id
//   3) dump app_stores/apple/products 与 near 的 blur/unblur 字段
const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function out(s) { console.log(s); }

// --- 会话端点: 改写 ---
if (/\/api\/v3\/session(\?|$)/.test(url)) {
  if (!body) { out('HUNLOCK4-NOBODY|' + url); $done({}); return; }
  try {
    const obj = JSON.parse(body);
    const s = obj.session;
    if (!s) { out('HUNLOCK4-ERR|no-session|' + url); $done({}); return; }
    const FAR = '2099-12-31T23:59:59Z';
    if (s.account && s.account.premium) {
      const p = s.account.premium;
      p.active = true; p.subscription = true; p.valid_until = FAR;
      p.product_id = p.product_id || 'premium_lp_1y';
      p.app_store_identifier = p.app_store_identifier || 'S1076726773'; // 非空(格式近似 apple subs id)
      p.cancelled = false; p.free_premium = false;
    }
    if (s.account) {
      s.account.premium_plan = { expires_at: FAR, product_id: 'premium_lp_1y', renewable: false };
    }
    let ent_summary = 'ABSENT';
    if (Array.isArray(s.entitlements) && s.entitlements.length) {
      let hx_state = null;
      for (const item of s.entitlements) {
        const e = item && item.entitlement;
        if (!e) continue;
        e.expires_at = FAR;
        if (e.metadata) {
          if (typeof e.metadata.limit === 'number') e.metadata.limit = 999;
          if (e.feature === 'hornet_x') {
            e.metadata.state = 'purchased';
            e.metadata.source = 'premium_plan';
            e.metadata.product_id = 'premium_lp_1y';
            e.metadata.experiment_scheduled_to = null;
            hx_state = e.metadata.state;
          }
        }
      }
      ent_summary = s.entitlements.map(x => (x.entitlement && x.entitlement.feature) || '?').join(',') + '|hx=' + hx_state;
    }
    out('HUNLOCK4-SUMMARY|premium=' + JSON.stringify(s.account && s.account.premium) + '|plan=' + JSON.stringify(s.account && s.account.premium_plan) + '|entitlements=' + ent_summary);
    $done({ body: JSON.stringify(obj) });
    return;
  } catch (e) {
    out('HUNLOCK4-ERR|' + e + '|' + url);
    $done({}); return;
  }
}

// --- app_stores: dump ---
if (/app_stores\/apple/.test(url)) {
  out('HUNLOCK4-PROD|' + url.split('?')[0] + '|len=' + body.length + '|' + body.slice(0, 1500));
  $done({}); return;
}

// --- members/near: 查 blur/unblur 字段 ---
if (/members\/near/.test(url)) {
  out('HUNLOCK4-NEAR|len=' + body.length);
  try {
    const j = JSON.parse(body);
    const arr = (j.members || []).map(x => x.member || x);
    if (arr.length) {
      out('HUNLOCK4-NEARKEYS|' + Object.keys(arr[0]).filter(k => /blur|unblur|paid|premium|locked|visible/i.test(k)).join(',') || 'NO-BLUR-KEYS');
    }
  } catch (e) {}
  $done({}); return;
}

// --- 其余: 轻量记录 ---
out('HSNV|' + method + '|' + url + '|len=' + body.length);
$done({});
