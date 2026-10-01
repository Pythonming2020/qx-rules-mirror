// Hornet no-cache header stripper (2026-08-29) — QX script-request-header
// TEMP — 配合 hornet-unlock-v2: 删 If-None-Match/If-Modified-Since,
// 强制服务器返回完整 200, 避免 304 空响应绕过改写.
let headers = $request.headers;
delete headers['If-None-Match'];
delete headers['If-Modified-Since'];
$done({ headers });
