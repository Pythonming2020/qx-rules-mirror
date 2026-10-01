// Hornet read-only probe v4 (2026-08-29) — QX script-response-body
// TEMP — 测完删除. Targets: gethornet.com / hornetxapp.com / hornet.com (native app API)
// 仍在改写的 quickies session 不受影响 (规则 URL 覆盖不同域名).
// Markers:
//   HSESS2|url|len|body[:6000]  — native session / me / premium / entitlement / account / profile 类响应
//   HSNV|method|url|len         — 所有响应
//   HSNV-HIT as in v1
const KEY_RE = /premium|subscription|is_vip|vip|entitle|unlock|visitor|viewed|incognito|hide|paywall|trial\b|plan|tier|boost|halo|ads|remove_ads|buster|signature|checksum|sign|restricted|blur|lock/i;
const VAL_RE = /premium|unlimited|subscriber|entitled|unlocked/i;
const DUMP_RE = /session|me\b|\/me|premium|entitle|account|profile|plan|subscription|billing|paywall/i;

const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function out(s) { console.log(s); }

try {
  out('HSNV|' + method + '|' + url + '|len=' + body.length);
  if (!body) { $done({}); return; }
  if (DUMP_RE.test(url) && !/\.(css|js|png|jpg|jpeg|webp|svg|gif|woff2?|mp4)(\?|$)/i.test(url)) {
    out('HSESS2|' + url + '|len=' + body.length + '|' + body.slice(0, 6000));
    $done({}); return;
  }
  if (!KEY_RE.test(body) && !VAL_RE.test(body)) { $done({}); return; }
  try {
    const obj = JSON.parse(body);
    const hits = [];
    const walk = (v, path) => {
      if (hits.length >= 12) return;
      if (v === null || v === undefined) return;
      const t = typeof v;
      if (t === 'object') {
        if (Array.isArray(v)) { v.forEach((x, i) => walk(x, path + '[' + i + ']')); return; }
        for (const [k, val] of Object.entries(v)) {
          if (KEY_RE.test(k)) hits.push('KEY:' + path + '.' + k + '=' + JSON.stringify(val).slice(0, 60));
          walk(val, path + '.' + k);
        }
      } else if (t === 'string' && VAL_RE.test(v)) {
        hits.push('VAL:' + path + '=' + v.slice(0, 60));
      }
    };
    walk(obj, '$');
    if (hits.length) out('HSNV-HIT|' + url + '|' + hits.join(' || '));
  } catch (e) { out('HSNV-JSONERR|' + url + '|' + body.slice(0, 120)); }
} catch (e) { out('HSNV-ERR|' + url + '|' + e); }
$done({});
