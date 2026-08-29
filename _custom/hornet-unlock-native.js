// Hornet unlock v3 (native) (2026-08-29) — QX script-response-body
// TEMP — 测完删除. 目标: gethornet.com/api/v3/session (Hornet 原生 App 会员判定源)
// 逻辑: 改 premium/premium_plan + entitlements(若存在); 其他响应透传;
// 同时 log: HUNLOCK3-SUMMARY(摘要) / HUNLOCK3-PAYWALL(select_paywall 响应) / HSNV(其余)
const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function out(s) { console.log(s); }

// --- 会话端点: 改写 ---
if (/\/api\/v3\/session(\?|$)/.test(url)) {
  if (!body) { out('HUNLOCK3-NOBODY|' + url); $done({}); return; }
  try {
    const obj = JSON.parse(body);
    const s = obj.session;
    if (!s) { out('HUNLOCK3-ERR|no-session|' + url); $done({}); return; }
    const FAR = '2099-12-31T23:59:59Z';
    if (s.account && s.account.premium) {
      const p = s.account.premium;
      p.active = true; p.subscription = true; p.valid_until = FAR;
      p.product_id = p.product_id || 'premium_lp_1y'; p.cancelled = false; p.free_premium = false;
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
          if (e.feature === 'hornet_x' && e.metadata.state) {
            e.metadata.state = 'purchased';
            e.metadata.source = 'premium_plan';
            e.metadata.experiment_scheduled_to = null;
          }
        }
      }
      ent_summary = s.entitlements.map(x => (x.entitlement && x.entitlement.feature) || '?').join(',');
    }
    out('HUNLOCK3-SUMMARY|premium=' + JSON.stringify(s.account && s.account.premium) + '|plan=' + JSON.stringify(s.account && s.account.premium_plan) + '|entitlements=' + ent_summary);
    $done({ body: JSON.stringify(obj) });
    return;
  } catch (e) {
    out('HUNLOCK3-ERR|' + e + '|' + url);
    $done({}); return;
  }
}

// --- 付费墙选择端点: 透传 + 观察 ---
if (/select_paywall/.test(url)) {
  out('HUNLOCK3-PAYWALL|' + url.split('?')[0] + '|len=' + body.length + '|' + body.slice(0, 1200));
  $done({}); return;
}

// --- 其余: 轻量记录 ---
out('HSNV|' + method + '|' + url + '|len=' + body.length);
$done({});
