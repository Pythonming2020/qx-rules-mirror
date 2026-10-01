// Hornet unlock v8 (2026-08-29) — QX script-response-body
// TEMP — 测完删除. 核心: battles/products + gifts/catalog 响应清除 lockedMeta/premiumGift,
// 让客户端把 VIP 礼物渲染为可用 (灰剪影/会员墙消失).
const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function out(s) { console.log(s); }
const KEY_RE = /premium|subscription|entitle|unlock|blur|restricted|paywall|paid|vip|incognito|visitor|lock|trial|plan|boost/i;

// --- 礼物目录: 清除锁定元数据 ---
if (/battles\/products|gifts\/catalog/.test(url)) {
  if (!body) { out('HUNLOCK8-NOBODY|' + url.slice(0, 100)); $done({}); return; }
  try {
    const obj = JSON.parse(body);
    let removed = 0, items = 0;
    const strip = (node) => {
      if (node === null || node === undefined) return;
      if (Array.isArray(node)) { node.forEach(strip); return; }
      if (typeof node !== 'object') return;
      for (const [k, v] of Object.entries(node)) {
        if (k === 'lockedMeta' || k === 'locked_meta') { delete node[k]; removed++; continue; }
        if (k === 'premiumGift' || k === 'isPremium') { node[k] = false; continue; }
        if (k === 'vipTier') { node[k] = 0; continue; }
        strip(v);
      }
    };
    if (obj.items) { items = obj.items.length; strip(obj.items); }
    else if (obj.gifts) { items = obj.gifts.length; strip(obj.gifts); }
    else { strip(obj); }
    out('HUNLOCK8-GIFTS|' + url.slice(0, 90) + '|items=' + items + '|removedLocked=' + removed);
    $done({ body: JSON.stringify(obj) });
    return;
  } catch (e) {
    out('HUNLOCK8-ERR|' + e + '|' + url.slice(0, 90));
    $done({}); return;
  }
}

// --- 会话端点: 改写 (保留) ---
if (/\/api\/v3\/session(\?|$)/.test(url)) {
  if (!body) { out('HUNLOCK8-NOBODY|' + url.slice(0, 90)); $done({}); return; }
  try {
    const obj = JSON.parse(body);
    const s = obj.session;
    if (s && s.account && s.account.premium) {
      const FAR = '2099-12-31T23:59:59Z';
      const p = s.account.premium;
      p.active = true; p.subscription = true; p.valid_until = FAR;
      p.product_id = p.product_id || 'premium_lp_1y';
      p.app_store_identifier = p.app_store_identifier || 'S1076726773';
      p.cancelled = false; p.free_premium = false;
      s.account.premium_plan = { expires_at: FAR, product_id: 'premium_lp_1y', renewable: false };
      out('HUNLOCK8-SUMMARY|' + url.slice(0, 80) + '|premium=' + JSON.stringify(p));
    }
    $done({ body: JSON.stringify(obj) });
    return;
  } catch (e) { out('HUNLOCK8-ERR|' + e); $done({}); return; }
}

// --- users/me / grid / members: dump ---
if (/users\/me|members\/|grid|feeds?\/|visitors|withun|profile\/|\/me(\?|$)/.test(url)) {
  out('HIDMP8|' + method + '|' + url.slice(0, 130) + '|len=' + body.length + '|' + body.slice(0, 4000));
  $done({}); return;
}

// --- 其他: key scan ---
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
