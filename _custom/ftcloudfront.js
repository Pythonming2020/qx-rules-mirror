// === FT 中文网 · 合并加固脚本 (paywall + get_story_more_info) ===
// 取代 chxm1023/cloudfront.js 的对应规则 (原脚本第一行就 JSON.parse,
// FT 限流时返回纯文本会抛异常, 每分钟上百条 [JS] 报错, 且那一次请求的
// 解锁动作完全失效).
//
// 本脚本:
//   - /jsapi/paywall, /mobile/verify : 无论服务器返回什么, 都下发 premium 对象
//   - /jsapi/get_story_more_info     : 能解析 -> paywall=0 + accessright=1
//                                      解析失败(限流) -> 原样放行 + 打 FTPASS 标记
// 说明: 限流是 FT 服务端的动作, 脚本无法凭空造出正文; 这里只做优雅降级,
//       并把服务器真正返回的那段文本记进日志, 用于下一步判断。

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
    console.log("FTPASS-NONJSON|" + url.slice(0, 110) + "|" + body.slice(0, 140));
    $done({});
  }
}
