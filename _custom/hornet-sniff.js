// Hornet read-only probe v1 (2026-08-29) — for Quantumult X script-response-body
// TEMP — 测完删除. Does NOT modify responses; logs marker lines only.
// Markers: HSNV|METHOD|URL|len  (every response)
//          HSNV-HIT|URL|KEY:path:jsonval_short  (payload contains subscription/premium/vip/etc.)
//          HSNV-JSONERR|URL  (body unparsable; shows first 120 chars)
const KEY_RE = /premium|subscription|is_vip|vip|entitle|unlock|visitor|viewed|incognito|hide|paywall|trial\b|plan|tier|paywall|boost|halo|ads|remove_ads|buster/i;
const VAL_RE = /premium|unlimited|subscriber|entitled|unlocked/i;

const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
try {
  const body = ($response && $response.body) ? String($response.body) : '';
  console.log('HSNV|' + method + '|' + url + '|len=' + body.length);
  if (!body) { $done({}); return; }
  // quick low-cost gate: skip bodies without any interesting substring
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
          if (KEY_RE.test(k)) {
            hits.push('KEY:' + path + '.' + k + '=' + JSON.stringify(val).slice(0, 60));
          }
          walk(val, path + '.' + k);
        }
      } else if (t === 'string' && VAL_RE.test(v)) {
        hits.push('VAL:' + path + '=' + v.slice(0, 60));
      }
    };
    walk(obj, '$');
    if (hits.length) console.log('HSNV-HIT|' + url + '|' + hits.join(' || '));
  } catch (e) {
    console.log('HSNV-JSONERR|' + url + '|' + body.slice(0, 120));
  }
} catch (e) {
  console.log('HSNV-ERR|' + url + '|' + e);
}
$done({});
