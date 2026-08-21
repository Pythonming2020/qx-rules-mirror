/*
 * zhihu_struct_probe.js — 只读结构探针 v4
 * 把响应的"第一层字段 + 每个顶层数组的前几个元素的字段签名"打出来，
 * 用于确认广告到底藏在哪个数组、用哪个字段判定。
 * 不修改 body。
 */
const body = $response.body;
const url = $request.url || "";

function fieldSig(obj) {
  // 返回对象顶层字段名集合
  if (Array.isArray(obj)) return "Array[" + obj.length + "]";
  if (obj && typeof obj === "object") return "{" + Object.keys(obj).slice(0, 30).join(",") + "}";
  return typeof obj;
}

let parsed = null;
try { parsed = JSON.parse(body); } catch (e) {
  console.log("SPARSEERR|" + url);
  $done({ body });
  return;
}

const tag = /topstory\/recommend/.test(url) ? "topstory"
          : /page-modular\.zhihu\.com\/templates/.test(url) ? "pagemod"
          : "other";

console.log("SP_STRUCT|" + tag + "|top=" + fieldSig(parsed));

// 列出顶层所有数组字段及其元素签名
function walk(prefix, obj, depth) {
  if (depth > 3) return;
  if (Array.isArray(obj)) {
    console.log("SP_ARR|" + tag + "|" + prefix + "|len=" + obj.length);
    // 打印前 3 个元素的字段签名 + 关键判定字段值
    for (let i = 0; i < Math.min(3, obj.length); i++) {
      const el = obj[i];
      if (el && typeof el === "object") {
        const keys = Object.keys(el).slice(0, 40).join(",");
        const idp = JSON.stringify({
          type: el.type, card_type: el.card_type,
          is_advertiser: el.is_advertiser, ad: el.ad,
          card_id: el.card_id, id: el.id,
          target: el.target_type, style: el.style_type
        });
        console.log("SP_EL|" + tag + "|" + prefix + "[" + i + "]|keys=" + keys);
        console.log("SP_KW|" + tag + "|" + prefix + "[" + i + "]|" + idp);
      }
    }
    // 递归第一层子对象里的数组
    for (let i = 0; i < Math.min(3, obj.length); i++) {
      const el = obj[i];
      if (el && typeof el === "object") {
        for (const k of Object.keys(el)) {
          if (Array.isArray(el[k])) walk(prefix + "[" + i + "]." + k, el[k], depth + 1);
        }
      }
    }
  } else if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      if (Array.isArray(obj[k])) walk(prefix + "." + k, obj[k], depth + 1);
    }
  }
}
walk("root", parsed, 0);

$done({ body });
