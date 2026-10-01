// Hornet read-only probe v3 (2026-08-29) — for Quantumult X script-response-body
// TEMP — 测完删除. Does NOT modify responses.
// Markers:
//   HNEAR2 |url|len — members count
//   HNEAR2-KEYS |...|(keys of quickies_member)
//   HNEAR2-PU |id|premium-ish fields for first 8 members
//   HSESS/HCHKSM/HTOT/HSNV(+-HIT) — same as v2
const KEY_RE = /premium|subscription|is_vip|vip|entitle|unlock|visitor|viewed|incognito|hide|paywall|trial\b|plan|tier|boost|halo|ads|remove_ads|buster|signature|checksum|sign|restricted|blur|lock/i;
const VAL_RE = /premium|unlimited|subscriber|entitled|unlocked/i;

const url = ($request && $request.url) || '';
const method = ($request && $request.method) || '';
const body = ($response && $response.body) ? String($response.body) : '';
function out(s) { console.log(s); }

try {
  if (/\/api\/v3\/session(\?|$)/.test(url) && !/chksm|totals/.test(url)) {
    out('HSESS|' + url + '|len=' + body.length + '|' + body.slice(0, 8000)); $done({}); return;
  }
  if (/chksm/.test(url)) { out('HCHKSM|' + url + '|len=' + body.length + '|' + body.slice(0, 1000)); $done({}); return; }
  if (/totals/.test(url)) { out('HTOT|' + url + '|len=' + body.length + '|' + body.slice(0, 1000)); $done({}); return; }
  if (/quickies_members\//.test(url)) {
    out('HNEAR2|' + url + '|len=' + body.length);
    try {
      const j = JSON.parse(body);
      const arr = (j.quickies_members || j.data || j.members || []).map(x => x.quickies_member || x);
      out('HNEAR2-COUNT|' + arr.length);
      if (arr.length) {
        out('HNEAR2-KEYS|' + Object.keys(arr[0]).join(','));
        for (let i = 0; i < Math.min(arr.length, 8); i++) {
          const m = arr[i]; const bits = [];
          for (const [k, v] of Object.entries(m)) {
            if (KEY_RE.test(k)) bits.push(k + '=' + JSON.stringify(v).slice(0, 50));
          }
          out('HNEAR2-PU|' + (m.id || m.hornet_x_profile_id || '?') + '|' + bits.join(' '));
        }
      }
    } catch (e) { out('HNEAR2-JSONERR|' + body.slice(0, 300)); }
    $done({}); return;
  }
  out('HSNV|' + method + '|' + url + '|len=' + body.length);
  if (!body) { $done({}); return; }
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
