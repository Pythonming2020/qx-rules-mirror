#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Surveille les scripts du module Spotify (et le .conf) : signale les mises a jour
upstream qui exigent d'actualiser le module dans Quantumult X.

Sortie SILENCIEUSE si rien n'a change (le cron reste muet).
Sortie = rapport court quand un fichier surveille change, ou quand il n'a pas bouge
depuis STALE_DAYS jours (l'auteur a peut-etre abandonne le depot).

Etat : .watch-state.json (commite, donc versionne avec le miroir).
Usage : python3 scripts/watch_upstream.py [--init] [--force]
"""
import hashlib
import json
import os
import sys
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, ".watch-state.json")
STALE_DAYS = 60
REWARN_DAYS = 30

# Fichiers surveilles (ordre = ordre d'affichage dans le rapport)
WATCH = [
    ("module", "mirror/yfamilys_com/SpotifyPremium.conf"),
    ("script", "mirror/devchristian1337_loon-plugins/spot-gabo.js"),
    ("script", "mirror/devchristian1337_loon-plugins/spot-NoSearchAd.js"),
    ("script", "mirror/devchristian1337_loon-plugins/spot-NoHomeAd.js"),
    ("script", "mirror/devchristian1337_loon-plugins/spot-NoScrollAd.js"),
    ("script", "mirror/devchristian1337_loon-plugins/spot-proto-eevee.js"),
    ("script", "mirror/devchristian1337_loon-plugins/spot-proto-ev3.js"),
]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_state():
    if os.path.exists(STATE):
        try:
            return json.load(open(STATE, encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(st):
    json.dump(st, open(STATE, "w", encoding="utf-8"), ensure_ascii=False,
              indent=1, sort_keys=True)


def human(n):
    return f"{n/1024:.0f} KB" if n >= 1024 else f"{n} B"


def main():
    init = "--init" in sys.argv
    force = "--force" in sys.argv
    today = date.today().isoformat()
    st = load_state()
    changed, stale, missing = [], [], []

    for kind, rel in WATCH:
        p = os.path.join(ROOT, rel)
        name = os.path.basename(rel)
        if not os.path.exists(p):
            missing.append(name)
            continue
        cur = {"sha256": sha256(p), "size": os.path.getsize(p)}
        old = st.get(rel)
        if old is None:
            cur["first_seen"] = today
            cur["last_changed"] = today
            cur["last_warned"] = None
            st[rel] = cur
            continue
        if old.get("sha256") != cur["sha256"]:
            cur["first_seen"] = old.get("first_seen", today)
            cur["last_changed"] = today
            cur["last_warned"] = None
            changed.append((name, old.get("size", 0), cur["size"], kind))
            st[rel] = cur
            continue
        # inchange : garder l'ancien et juger la fraicheur
        cur["first_seen"] = old.get("first_seen", today)
        cur["last_changed"] = old.get("last_changed", today)
        cur["last_warned"] = old.get("last_warned")
        st[rel] = cur
        try:
            age = (date.fromisoformat(today) - date.fromisoformat(cur["last_changed"])).days
        except Exception:
            age = 0
        if age >= STALE_DAYS:
            lw = cur.get("last_warned")
            due = True
            if lw:
                try:
                    due = (date.fromisoformat(today) - date.fromisoformat(lw)).days >= REWARN_DAYS
                except Exception:
                    due = True
            if due:
                stale.append((name, age, kind))
                st[rel]["last_warned"] = today

    save_state(st)

    if init and not changed:
        return  # premiere initialisation : muet

    out = []
    if changed:
        out.append("🎧 **Spotify 规则 · 上游有更新**")
        for name, o, n, kind in changed:
            delta = n - o
            arrow = f"{human(o)} → {human(n)} (+{human(delta)})" if delta >= 0 \
                else f"{human(o)} → {human(n)} ({human(delta)})"
            tag = "模块文件" if kind == "module" else "脚本"
            out.append(f"• {name}（{tag}）{arrow}")
        out.append("")
        out.append("建议：Quantumult X 里更新 Spotify 模块 → 重启 App → 检查会员状态")
        out.append("若仍失效：Spotify 已改接口，等上游下一版（通常 1–3 天）")

    if stale:
        if out:
            out.append("")
        out.append(f"⚠️ **上游 {STALE_DAYS} 天没动过**（作者可能弃坑，考虑换源）")
        for name, age, kind in stale:
            out.append(f"• {name} — 已 {age} 天无变化")

    if missing:
        if out:
            out.append("")
        out.append("⚠️ 监视清单里有些文件不存在：" + ", ".join(missing))

    if out:
        print("\n".join(out))


if __name__ == "__main__":
    main()
