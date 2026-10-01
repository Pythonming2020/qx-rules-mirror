// Hornet unlock v1 (2026-08-29) — QX script-response-body
// TEMP — 测完删除. 只改写 api.quickies.gay/api/v3/session 的 premium/entitlements,
// 其他请求一律透传. 回滚: 换回只读探针或删规则即可.
// 逻辑: parse JSON → 改字段 → 重新序列化返回.
const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';

function log(s) { console.log(s); }

// 只处理 session 端点, 其余 $done({}) 透传
if (!/\/api\/v3\/session(\?|$)/.test(url) || /chksm|totals/.test(url)) {
  if (body && /\/api\/v3\/session(\?|$)/.test(url)) log('HUNLOCK-SKIP|' + method + '|' + url);
  $done({});
  return;
}

try {
  const obj = JSON.parse(body);
  const s = obj.session;
  if (!s) { log('HUNLOCK-ERR|no-session|' + url); $done({}); return; }

  const FAR = '2099-12-31T23:59:59Z';

  // 1) account.premium 激活
  if (s.account && s.account.premium) {
    s.account.premium.active = true;
    s.account.premium.subscription = true;
    s.account.premium.valid_until = FAR;
    s.account.premium.product_id = s.account.premium.product_id || 'premium_lp_1y';
    s.account.premium.cancelled = false;
    s.account.premium.free_premium = false;
    // app_store_identifier 保持原值: Stripe 直付场景本就该为 null
  }

  // 2) entitlements 全部拉满
  if (Array.isArray(s.entitlements)) {
    let touched = 0;
    for (const item of s.entitlements) {
      const e = item && item.entitlement;
      if (!e) continue;
      e.expires_at = FAR;
      if (e.metadata) {
        if (e.metadata.state === 'pay_to_use') { e.metadata.state = 'active'; e.metadata.source = null; }
        if (typeof e.metadata.limit === 'number') e.metadata.limit = 999;
      }
      touched++;
    }
    log('HUNLOCK-OK|' + url + '|entitlements=' + s.entitlements.length + '|premium=' + JSON.stringify(s.account.premium));
    log('HUNLOCK|' + s.entitlements.map(x => (x.entitlement && x.entitlement.feature) + ':' + (x.entitlement && x.entitlement.expires_at)).join(' '));
  } else {
    log('HUNLOCK-ERR|no-entitlements|' + url);
  }

  const out = JSON.stringify(obj);
  $done({ body: out });
} catch (e) {
  log('HUNLOCK-ERR|' + e + '|' + url + '|' + body.slice(0, 200));
  $done({});
}
