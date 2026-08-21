// Zhihu full-body ad-key scanner v2 (read-only, 2026-08-21)
// Logs ZURL/ZLEN/ADKEYS/ADSAMPLE — never modifies the response.
(function () {
  try {
    var url = $request.url || "?";
    var body = $response.body || "";
    var len = body.length;
    if (!body || len < 2) { console.log("ZURL|" + url); console.log("ZEMPTY"); $done({}); return; }
    if (len > 3000000) { console.log("ZURL|" + url); console.log("ZTOOBIG|" + len); $done({}); return; }
    var keyRe = /\"([A-Za-z_]{0,24}(?:ad|Ad|AD)[A-Za-z_]{0,24}|splash[A-Za-z_]{0,16}|launch[_A-Za-z]{0,16}|preload[A-Za-z_]{0,16}|sponsor[A-Za-z_]{0,16}|commercial[A-Za-z_]{0,16}|promot[A-Za-z_]{0,16}|business[A-Za-z_]{0,16}|popover[A-Za-z_]{0,16})\"\s*:/g;
    var counts = {};
    var m;
    while ((m = keyRe.exec(body)) !== null) {
      var k = m[1].toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
    var summary = Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})
      .slice(0, 15).map(function(k){ return k + ":" + counts[k]; }).join(",");
    console.log("ZURL|" + url);
    console.log("ZLEN|" + len);
    if (summary) {
      console.log("ADKEYS|" + summary);
      var top = summary.split(",")[0].split(":")[0];
      var idx = body.toLowerCase().indexOf("\"" + top);
      if (idx >= 0) {
        var ctx = body.substring(Math.max(0, idx - 80), idx + 160).replace(/\s+/g, " ");
        console.log("ADSAMPLE|" + ctx);
      }
    } else {
      console.log("NOADKEYS");
    }
  } catch (e) {
    console.log("ZERR|" + e);
  }
  $done({});
})();
