// Hornet unlock v2 (2026-08-29) — QX script-response-body
// TEMP — 测完删除. 基于网页端 JS 逆向修正:
//   tz.enum = [free, freemium, pay_to_use, disabled, purchased, unknown]
//   hasPremium = state === "purchased"
//   premium_plan.expires_at 为第二条判定路径
// 只改写 api.quickies.gay/api/v3/session, 其他透传.
const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function log(s) { console.log(s); }

if (!/\/api\/v3\/session(\?|$)/.test(url) || /chksm|totals/.test(url)) { $done({}); return; }
if (!body) { log('HUNLOCK2-NOBODY|' + url); $done({}); return; }

try {
  const obj = JSON.parse(body);
  const s = obj.session;
  if (!s) { log('HUNLOCK2-ERR|no-session|' + url); $done({}); return; }

  const FAR = '2099-12-31T23:59:59Z';

  // 1) account.premium
  if (s.account && s.account.premium) {
    const p = s.account.premium;
    p.active = true;
    p.subscription = true;
    p.valid_until = FAR;
    p.product_id = p.product_id || 'premium_lp_1y';
    p.cancelled = false;
    p.free_premium = false;
  }
  // 2) premium_plan — 第二条判定路径 (shape: expires_at/product_id/renewable)
  if (s.account) {
    s.account.premium_plan = {
      expires_at: FAR,
      product_id: 'premium_lp_1y',
      renewable: false
    };
  }
  // 3) entitlements: 全拉满 + hornet_x state 必须 = "purchased"
  if (Array.isArray(s.entitlements)) {
    let hx = null;
    for (const item of s.entitlements) {
      const e = item && item.entitlement;
      if (!e) continue;
      e.expires_at = FAR;
      if (e.metadata) {
        if (typeof e.metadata.limit === 'number') e.metadata.limit = 999;
        if (e.feature === 'hornet_x') {
          e.metadata.state = 'purchased';        // 枚举合法值!
          e.metadata.source = 'premium_plan';    // transaction 判定用
          e.metadata.experiment_scheduled_to = null;
          hx = e.metadata;
        }
      }
    }
    log('HUNLOCK2-OK|' + url + '|entitlements=' + s.entitlements.length + '|hx=' + JSON.stringify(hx));
    log('HUNLOCK2|premium=' + JSON.stringify(s.account.premium) + '|plan=' + JSON.stringify(s.account.premium_plan));
  } else {
    log('HUNLOCK2-ERR|no-entitlements|' + url);
  }

  $done({ body: JSON.stringify(obj) });
} catch (e) {
  log('HUNLOCK2-ERR|' + e + '|' + url + '|' + body.slice(0, 200));
  $done({});
}
