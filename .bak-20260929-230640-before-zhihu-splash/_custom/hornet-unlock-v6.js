// Hornet unlock v6 (2026-08-29) — QX script-response-body
// TEMP — 测完删除. 目标: hnetwork-live.com 全系 (Hornet 真实主 API)
// 逻辑: session 改写 + 所有 JSON 响应 key 扫描(premium/blur/entitlement) + dump 关键
const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function out(s) { console.log(s); }
const KEY_RE = /premium|subscription|entitle|unlock|blur|restricted|paywall|paid|vip|incognito|visitor|lock|trial\b|plan|boost/i;

// --- 会话端点: 改写 ---
if (/\/api\/v3\/session(\?|$)/.test(url)) {
  if (!body) { out('HUNLOCK6-NOBODY|' + url); $done({}); return; }
  try {
    const obj = JSON.parse(body);
    const s = obj.session;
    if (!s) { out('HUNLOCK6-ERR|no-session|' + url); $done({}); return; }
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
            e.metadata.state = 'purchased'; e.metadata.source = 'premium_plan';
            e.metadata.product_id = 'premium_lp_1y'; e.metadata.experiment_scheduled_to = null;
          }
        }
      }
      ent_summary = s.entitlements.map(x => (x.entitlement && x.entitlement.feature) || '?').join(',');
    }
    out('HUNLOCK6-SUMMARY|' + url.slice(0, 90) + '|premium=' + JSON.stringify(s.account && s.account.premium) + '|ent=' + ent_summary);
    $done({ body: JSON.stringify(obj) });
    return;
  } catch (e) {
    out('HUNLOCK6-ERR|' + e + '|' + url);
    $done({}); return;
  }
}

// --- 其他响应: 全量 key 扫描 + 摘要 ---
if (!body) { out('HSNV|' + method + '|' + url.slice(0, 120) + '|len=0'); $done({}); return; }
out('HSNV|' + method + '|' + url.slice(0, 120) + '|len=' + body.length);
if (!KEY_RE.test(body)) { $done({}); return; }
try {
  const obj = JSON.parse(body);
  const hits = [];
  const walk = (v, path) => {
    if (hits.length >= 10) return;
    if (v === null || v === undefined) return;
    if (typeof v === 'object') {
      if (Array.isArray(v)) { v.forEach((x, i) => walk(x, path + '[' + i + ']')); return; }
      for (const [k, val] of Object.entries(v)) {
        if (KEY_RE.test(k)) hits.push(path + '.' + k + '=' + JSON.stringify(val).slice(0, 50));
        walk(val, path + '.' + k);
      }
    }
  };
  walk(obj, '$');
  if (hits.length) out('HIT|' + url.slice(0, 90) + '|' + hits.join(' || '));
} catch (e) {}
$done({});
