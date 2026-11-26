#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère la variante QX sûre de StartUpAds (墨鱼 2.0).

Pourquoi : le module amont MITM des domaines bancaires / paiement / WeChat.
Sur iPhone, un domaine épinglé (cert pinning) casse l'app au lieu de filtrer.
On retire donc ces domaines (et leurs règles) de la copie servie au téléphone.

Source mirroitée (réécrite vers notre dépôt par sync.py) :
  mirror/ifflagged_Romeo/StartUpAds.conf

Sortie (jamais écrasée par sync.py) :
  _custom/StartUpAds-qx.conf
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOURCES = [
    ("mirror/ifflagged_Romeo/StartUpAds.conf", "_custom/StartUpAds-qx.conf",
     "墨鱼去开屏 2.0 · 银行/支付/微信域名已剔除"),
]

# sous-chaînes de domaine à ne PAS MITM (banque, paiement, wechat)
DENY = [
    "abchina.com.cn", "bankcomm.com", "bankcomm.cn", "ccb.com", "pingan.com",
    "js96008.com", "boc.cn", "icbc.com.cn", "cmbchina.com", "unionpay",
    "95516.com", "alipay.com", "tenpay.com", "weixin.qq.com", "wechat.com",
    "weixin110.qq.com", "spdbccc.com.cn",
]


def denied(text):
    low = text.lower().replace("\\", "")
    return any(d in low for d in DENY)


def filter_hostname_line(line):
    prefix, _, rest = line.partition("=")
    hosts = [h.strip() for h in rest.split(",") if h.strip()]
    kept = [h for h in hosts if not denied(h)]
    removed = len(hosts) - len(kept)
    return f"{prefix}= " + ", ".join(kept), removed


def build(src, dst, title):
    path = os.path.join(ROOT, src)
    text = open(path, encoding="utf-8", errors="replace").read()
    out = []
    removed_rules = 0
    removed_hosts = 0
    for line in text.splitlines():
        s = line.strip()
        if re.match(r"^\s*hostname\s*=", line, re.I):
            line, n = filter_hostname_line(line)
            removed_hosts += n
            out.append(line)
            continue
        if " url " in s and denied(s):
            removed_rules += 1
            continue
        out.append(line)
    header = [
        f"#!name={title}",
        f"#!desc=自持副本，由 scripts/build_startupads_custom.py 从 {src} 生成；",
        "#!     剔除银行/支付/微信域名，避免证书锁定导致 App 断网。请勿手改。",
        f"#!date={__import__('datetime').date.today().isoformat()}",
        "",
    ]
    os.makedirs(os.path.join(ROOT, "_custom"), exist_ok=True)
    with open(os.path.join(ROOT, dst), "w", encoding="utf-8") as f:
        f.write("\n".join(header + out) + "\n")
    print(f"{dst}: règles retirées={removed_rules}, hôtes retirés={removed_hosts}")


def main():
    for src, dst, title in SOURCES:
        if not os.path.exists(os.path.join(ROOT, src)):
            print(f"ERREUR: source absente: {src}", file=sys.stderr)
            return 1
        build(src, dst, title)
    return 0


if __name__ == "__main__":
    sys.exit(main())
