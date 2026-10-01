// === FT 中文网 · 合并加固脚本 (paywall + get_story_more_info) ===
// 取代 chxm1023/cloudfront.js 的对应规则 (原脚本第一行就 JSON.parse,
// FT 限流时返回非 JSON 会抛异常, 每分钟上百条 [JS] 报错, 且那一次请求的
// 解锁动作完全失效).
//
// 本脚本:
//   - /jsapi/paywall, /mobile/verify : 无论服务器返回什么, 都下发 premium 对象
//   - /jsapi/get_story_more_info     : 能解析 -> paywall=0 + accessright=1
//                                      解析失败 -> 原样放行 + 打 FTPASS 标记
//
// FTPASS 标记格式: FTPASS-NONJSON|status|content-type|enc|len|url|body前120字
//   status/content-type 是关键: 用来判断那 54 字节到底是什么(429? 403? 200+纯文本?)

var url = ($request && $request.url) ? String($request.url) : "";

var PREMIUM = {
  "paywall": 0,
  "premium": 1,
  "expire": "4092599349",
  "standard": 1,
  "v": 2099,
  "campaign_code": "",
  "latest_duration": "yearly",
  "addon": 1
};

var body = "";
try {
  body = ($response && $response.body) ? String($response.body) : "";
} catch (e) {
  body = "";
}

var status = ($response && $response.status) ? $response.status : "?";
var ctype = "";
try {
  var h = ($response && $response.headers) ? $response.headers : {};
  ctype = h["Content-Type"] || h["content-type"] || h["Content-type"] || "";
} catch (e) {
  ctype = "";
}
var enc = "";
try {
  var h2 = ($response && $response.headers) ? $response.headers : {};
  enc = h2["Content-Encoding"] || h2["content-encoding"] || "";
} catch (e) {
  enc = "";
}

if (/\/jsapi\/paywall|\/mobile\/verify/.test(url)) {
  var ddm = null;
  try { ddm = JSON.parse(body); } catch (e) { ddm = null; }
  if (ddm && typeof ddm === "object") {
    Object.assign(ddm, PREMIUM);
    $done({ body: JSON.stringify(ddm) });
  } else {
    $done({ body: JSON.stringify(PREMIUM) });
  }
} else {
  var d = null;
  try { d = JSON.parse(body); } catch (e) { d = null; }
  if (d && typeof d === "object") {
    d.paywall = 0;
    d.accessright = "1";
    $done({ body: JSON.stringify(d) });
  } else {
    var tail = url.split("/jsapi/get_story_more_info")[1] || url;
    console.log("FTPASS-NONJSON|" + status + "|" + ctype + "|" + enc + "|" + body.length
      + "|" + String(tail).slice(0, 40) + "|" + body.slice(0, 120));
    $done({});
  }
}
