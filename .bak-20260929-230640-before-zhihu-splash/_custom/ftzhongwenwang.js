/******************************
FT中文网 外区
特别说明：微信登录
@ios151
可以搭配快捷指令使用@leepyer
地址：https://www.icloud.com/shortcuts/652791ed6b8d45fb8f6ff4f43e525405获取文章内容
加上这个参数?webview=ftcapp就能返回全文
***********************

[rewrite_local]
^https:\/\/.*\.cloudfront\.net\/index\.php\/jsapi\/paywall url script-response-body https://raw.githubusercontent.com/Pythonming2020/qx-rules-mirror/main/_custom/ftzhongwenwang.js
[mitm] 
hostname = *.cloudfront.net

*******************************/
var payload = {
  "paywall": 0,
  "premium": 1,
  "expire": "4092599349",
  "standard": 1,
  "v": 2099,
  "campaign_code": "",
  "latest_duration": "yearly",
  "addon": 0
};

// 加固: 原版直接 JSON.parse($response.body) -> FT 限流时返回纯文本会抛异常,
// 导致 $done 不被调用、响应原样放行(付费墙照旧). 现在改为容错:
// 能解析就地合并, 解析失败也照样下发 premium 对象.
try {
  var ddm = JSON.parse($response.body);
  if (ddm && typeof ddm === "object") {
    Object.assign(ddm, payload);
    $done({ body: JSON.stringify(ddm) });
  } else {
    $done({ body: JSON.stringify(payload) });
  }
} catch (e) {
  $done({ body: JSON.stringify(payload) });
}
