// === TEMP 只读嗅探器: FT 中文网 (ftmailbox.cn) ===
// 目的: 看新版 FT App 对 ios_token_collect / ios-receipt-validation.php
//       发的是什么请求体、收的是什么响应 —— 用来判断"假收据"这条路是否还通。
// 只读: 不改动任何内容, 原样放行 ($done({})).
// 测完: 从配置里删掉对应规则 + 这个文件即可, 无残留。
// 日志里搜 FTSNIFF 即可定位。
(function () {
  try {
    var u = ($request && $request.url) ? String($request.url) : "";
    if (/ftmailbox\.cn/i.test(u)) {
      var reqBody = ($request && $request.body) ? String($request.body) : "";
      if (reqBody.length > 1500) reqBody = reqBody.slice(0, 1500) + "...[cut]";
      var rspBody = "";
      try {
        rspBody = ($response && $response.body) ? String($response.body) : "";
      } catch (e) {
        rspBody = "[unreadable body]";
      }
      if (rspBody.length > 1500) rspBody = rspBody.slice(0, 1500) + "...[cut]";
      console.log("FTSNIFF-URL|" + u);
      console.log("FTSNIFF-REQ|" + reqBody);
      console.log("FTSNIFF-RSP|" + rspBody);
    }
  } catch (e) {
    console.log("FTSNIFF-ERR|" + e);
  }
  $done({});
})();
