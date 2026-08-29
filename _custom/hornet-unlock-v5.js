// Hornet unlock v5 (2026-08-29) — QX script-response-body
// TEMP — 测完删除. 修正: hornetx.com(实际 webview 域名, 此前笔误 hornetxapp.com)
// 功能: session 改写 + hornet-map/map.json dump + near blur 检查 + 其余 HSNV
const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function out(s) { console.log(s); }

// --- session(quickies.gay 或 gethornet.com): 改写 ---
if (/\/api\/v3\/session(\?|$)/.test(url)) {
  if (!body) { out('HUNLOCK5-NOBODY|' + url); $done({}); return; }
  try {
    const obj = JSON.parse(body);
    const s = obj.session;
    if (!s) { out('HUNLOCK5-ERR|no-session|' + url); $done({}); return; }
    const FAR = '2099-12-31T23:59:59Z';
    if (s.account && s.account.premium) {
      const p = s.account.premium;
      p.active = true; p.subscription = true; p.valid_until = FAR;
      p.product_id = p.product_id || 'premium_lp_1y';
      p.app_store_identifier = p.app_store_identifier || 'S1076726773';
      p.cancelled = false; p.free_premium = false;
    }
    if (s.account) {
      s.account.premium_plan = { expires_at: FAR, product_id: 'premium_lp_1y', renewable: false };
    }
    let ent_summary = 'ABSENT';
    if (Array.isArray(s.entitlements) && s.entitlements.length) {
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
          }
        }
      }
      ent_summary = s.entitlements.map(x => (x.entitlement && x.entitlement.feature) || '?').join(',');
    }
    out('HUNLOCK5-SUMMARY|' + url.split('/api/')[0].match(/[\w.]+$/)[0] + '|premium=' + JSON.stringify(s.account && s.account.premium) + '|entitlements=' + ent_summary);
    $done({ body: JSON.stringify(obj) });
    return;
  } catch (e) {
    out('HUNLOCK5-ERR|' + e + '|' + url);
    $done({}); return;
  }
}

// --- hornet-map / map.json / _next/data: dump 看 blur/premium 判定 ---
if (/hornet-map|map\.json|_next\/data/.test(url)) {
  out('HUNLOCK5-MAP|' + url.slice(0, 120) + '|len=' + body.length + '|' + body.slice(0, 4000));
  $done({}); return;
}

// --- quickies members/near: 检查 blur 字段 ---
if (/quickies_members\//.test(url)) {
  out('HUNLOCK5-NEAR|len=' + body.length);
  try {
    const j = JSON.parse(body);
    const arr = (j.quickies_members || []).map(x => x.quickies_member || x);
    if (arr.length) {
      const kws = Object.keys(arr[0]).filter(k => /blur|unblur|paid|premium|locked|photo|avatar|thumb/i.test(k));
      out('HUNLOCK5-NEARKEYS|' + (kws.join(',') || 'NONE'));
      out('HUNLOCK5-NEARP0|' + JSON.stringify({ blur: arr[0].blur, unblurred: arr[0].unblurred, photo_url: arr[0].quickies_photos && arr[0].quickies_photos.length } || {}));
    }
  } catch (e) {}
  $done({}); return;
}

// --- 其余: 轻量 ---
out('HSNV|' + method + '|' + url + '|len=' + body.length);
$done({});
