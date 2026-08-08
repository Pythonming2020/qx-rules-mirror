#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Synchronisation du miroir qx-rules-mirror : telecharge les sources depuis urls.txt -> mirror/<proprietaire>_<depot>/<fichier>"""
import os, re, sys, subprocess, json, time, hashlib

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # racine du depot
URLS_FILE = os.path.join(BASE, "urls.txt")
MIRROR_DIR = os.path.join(BASE, "mirror")
MANIFEST = os.path.join(BASE, "manifest.json")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

def fetch(url, out_path, timeout=90):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    tmp = out_path + ".tmp"
    r = subprocess.run(["curl", "-sL", "--max-time", str(timeout), "-A", UA,
                        "-o", tmp, "-w", "%{http_code}", url],
                       capture_output=True, text=True)
    code = r.stdout.strip()
    if code == "200" and os.path.exists(tmp) and os.path.getsize(tmp) > 0:
        os.replace(tmp, out_path)
        return True, code
    if os.path.exists(tmp):
        os.remove(tmp)
    return False, code

def target_path(url):
    """URL -> mirror/<proprietaire>_<depot>/<fichier>"""
    m = re.match(r"https://(?:raw\.)?github(?:usercontent)?\.com/([^/]+)/([^/]+)/", url)
    if m:
        owner, repo = m.group(1), m.group(2)
        repo = re.sub(r"[^\w.-]", "_", repo)
        base = os.path.basename(url.split("?")[0])
        return f"{owner}_{repo}/{base}"
    # github.com releases
    m2 = re.match(r"https://github\.com/([^/]+)/([^/]+)/releases/", url)
    if m2:
        return f"{m2.group(1)}_{m2.group(2)}/{os.path.basename(url.split('?')[0])}"
    # autre domaine
    m3 = re.match(r"https://([^/]+)/", url)
    if m3:
        host = m3.group(1).replace(".", "_")
        return f"{host}/{os.path.basename(url.split('?')[0])}"
    return f"other/{hashlib.md5(url.encode()).hexdigest()[:8]}_{os.path.basename(url)}"

def main():
    urls = [u.strip() for u in open(URLS_FILE, encoding="utf-8") if u.strip() and not u.startswith("#")]
    manifest = {}
    ok, fail = 0, []
    for url in urls:
        rel = target_path(url)
        out = os.path.join(MIRROR_DIR, rel)
        good, code = fetch(url, out)
        if good:
            manifest[url] = f"mirror/{rel}"
            ok += 1
            print(f"OK  {code} {rel} ({os.path.getsize(out)} B)")
        else:
            fail.append((url, code))
            print(f"FAIL {code} {url}")
        time.sleep(0.3)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nTermine: {ok}/{len(urls)} reussis")
    if fail:
        print("Echecs:")
        for u, c in fail:
            print(f"  {c} {u}")
        sys.exit(1)

if __name__ == "__main__":
    main()
