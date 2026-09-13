#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Synchronisation du miroir qx-rules-mirror.

DEUX couches (la seconde est ce qui manquait) :
  1. urls.txt          -> téléchargements de premier niveau (config -> modules/listes)
  2. urls-internal.txt -> scripts référencés DEPUIS L'INTÉRIEUR des modules

Après téléchargement, chaque module est RÉÉCRIT : ses références internes pointent
vers ce dépôt au lieu de l'upstream. C'est exactement ce qui manquait quand le
compte Yu9191 a été supprimé (le fichier était mirroté, mais il pointait encore
vers le dépôt mort).

Robustesse :
  - cadence 0,35 s entre requêtes (sinon raw.githubusercontent renvoie des 429 et
    des liens VALIDES passent pour morts — incident vécu)
  - 4 tentatives avec repli exponentiel ; 404/410 = mort définitif (pas de retry)
  - sortie silencieuse si tout va bien, message d'erreur sinon (patron watchdog)
"""
import os, re, sys, json, time, subprocess, hashlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qx_common import rewrite_module_urls

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIRROR_DIR = os.path.join(BASE, "mirror")
MANIFEST = os.path.join(BASE, "manifest.json")
URLS_FILE = os.path.join(BASE, "urls.txt")
URLS_INTERNAL = os.path.join(BASE, "urls-internal.txt")
OUR_RAW = "https://raw.githubusercontent.com/Pythonming2020/qx-rules-mirror/main"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
RATE_SLEEP = 0.35          # cadence entre requêtes
ATTEMPTS = 4               # tentatives par URL
PERMANENT = {"404", "410"} # mort définitif -> pas de retry


def curl_code(url, out_path=None, timeout=90):
    cmd = ["curl", "-sL", "--max-time", str(timeout), "-A", UA, "-w", "%{http_code}"]
    if out_path:
        cmd += ["-o", out_path]
    else:
        cmd += ["-o", "/dev/null"]
    cmd.append(url)
    try:
        r = subprocess.run(cmd, capture_output=True, text=True)
        return r.stdout.strip() or "000"
    except Exception:
        return "000"


def fetch(url, out_path, timeout=90):
    """Télécharge avec retries. Retourne (ok, dernier_code)."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp = out_path + ".tmp"
    code = "000"
    for attempt in range(ATTEMPTS):
        code = curl_code(url, tmp, timeout)
        if code == "200" and os.path.exists(tmp) and os.path.getsize(tmp) > 0:
            os.replace(tmp, out_path)
            return True, code
        if code in PERMANENT:
            break
        time.sleep(1.5 * (attempt + 1))     # repli exponentiel
    if os.path.exists(tmp):
        os.remove(tmp)
    return False, code


def target_path(url):
    """URL -> mirror/<proprietaire>_<depot>/<fichier>"""
    m = re.match(r"https://(?:raw\.)?github(?:usercontent)?\.com/([^/]+)/([^/]+)/", url)
    if m:
        owner, repo = m.group(1), m.group(2)
        repo = re.sub(r"[^\w.-]", "_", repo)
        return f"{owner}_{repo}/{os.path.basename(url.split('?')[0])}"
    m2 = re.match(r"https://github\.com/([^/]+)/([^/]+)/releases/", url)
    if m2:
        return f"{m2.group(1)}_{m2.group(2)}/{os.path.basename(url.split('?')[0])}"
    m3 = re.match(r"https?://([^/]+)/", url)
    if m3:
        return f"{m3.group(1).replace('.', '_')}/{os.path.basename(url.split('?')[0])}"
    return f"other/{hashlib.md5(url.encode()).hexdigest()[:8]}_{os.path.basename(url)}"


def read_list(path):
    if not os.path.exists(path):
        return []
    return [u.strip() for u in open(path, encoding="utf-8")
            if u.strip() and not u.startswith("#")]


def is_module(text):
    """Un fichier est réécrivable s'il contient au moins une directive QX."""
    return (" url script-" in text) or ("hostname =" in text) or ("[rewrite_local]" in text)


def main():
    urls = read_list(URLS_FILE)
    urls_int = read_list(URLS_INTERNAL)
    print(f"listes: {len(urls)} premier niveau + {len(urls_int)} internes")

    manifest, mapping = {}, {}
    ok, fail = 0, []

    for url in urls + urls_int:
        rel = target_path(url)
        out = os.path.join(MIRROR_DIR, rel)
        good, code = fetch(url, out)
        if good:
            manifest[url] = f"mirror/{rel}"
            mapping[url] = f"{OUR_RAW}/mirror/{rel}"
            ok += 1
        else:
            fail.append((url, code))
        time.sleep(RATE_SLEEP)

    # manifest = premier niveau seulement (compat avec l'outillage existant)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump({u: manifest[u] for u in urls if u in manifest}, f,
                  ensure_ascii=False, indent=2)

    # ---- réécriture des références internes ------------------------------
    rewritten_files, rewritten_refs = 0, 0
    if mapping:
        for root, _dirs, files in os.walk(MIRROR_DIR):
            for name in files:
                if not name.endswith((".conf", ".snippet", ".js", ".yaml", ".sgmodule",
                                      ".stoverride", ".lpx")):
                    continue
                p = os.path.join(root, name)
                try:
                    txt = open(p, encoding="utf-8", errors="replace").read()
                except Exception:
                    continue
                if not is_module(txt):
                    continue
                new, n = rewrite_module_urls(txt, mapping)
                if n:
                    open(p, "w", encoding="utf-8").write(new)
                    rewritten_files += 1
                    rewritten_refs += n

    print(f"téléchargés: {ok}/{len(urls) + len(urls_int)}")
    print(f"réécriture: {rewritten_refs} références dans {rewritten_files} fichiers")

    if fail:
        print("Échecs:")
        for u, c in fail:
            print(f"  {c} {u}")
        sys.exit(1)


if __name__ == "__main__":
    main()
