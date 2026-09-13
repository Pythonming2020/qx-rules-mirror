#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit d'auto-portance du miroir qx-rules-mirror.

Répond à UNE question : « si un des auteurs upstream supprime son compte,
qu'est-ce qui casse chez moi ? »

  --local  (défaut)  : pur scan disque, aucune requête réseau.
                       Liste les références qui pointent encore vers un tiers.
  --net             : + vérification de vivacité, AVEC cadence et retries
                       (sans quoi raw.githubusercontent renvoie des 429 et
                       des liens valides passent pour morts — incident vécu).

Sortie : 0 si aucune dépendance externe, 1 sinon (utilisable en cron).
"""
import os, re, sys, glob, time, subprocess, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qx_common import module_urls

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OURS = 'Pythonming2020/qx-rules-mirror'
RATE_SLEEP = 0.35
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

PATTERNS = ['/mirror/**/*.conf', '/mirror/**/*.snippet', '/mirror/**/*.js',
            '/mirror/**/*.yaml', '/mirror/**/*.sgmodule', '/mirror/**/*.stoverride',
            '/mirror/**/*.lpx', '/_custom/**/*.conf', '/_custom/**/*.js',
            '/vendor/**/*.js']


def author_of(u):
    m = re.match(r'https://raw\.githubusercontent\.com/([^/]+)', u)
    return m.group(1) if m else 'other:' + u.split('/')[2]


def load_ignore():
    """URLs connues et INERTES (commentaires JS, modules désactivés, fautes amont)."""
    p = os.path.join(ROOT, '.audit-ignore')
    if not os.path.exists(p):
        return set()
    return {l.strip() for l in open(p, encoding='utf-8')
            if l.strip() and not l.startswith('#')}


def scan_external():
    """Références de module qui ne pointent PAS vers notre dépôt."""
    ignore = load_ignore()
    found = collections.OrderedDict()
    ignored = 0
    for pat in PATTERNS:
        for f in sorted(glob.glob(ROOT + pat, recursive=True)):
            try:
                txt = open(f, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            for u in module_urls(txt):
                if OURS in u:
                    continue
                if u in ignore:
                    ignored += 1
                    continue
                found.setdefault(u, os.path.relpath(f, ROOT))
    return found, ignored


def check(url):
    code = '000'
    for attempt in range(4):
        try:
            r = subprocess.run(['curl', '-sL', '-m', '25', '-o', '/dev/null',
                                '-A', UA, '-w', '%{http_code}', url],
                               capture_output=True, text=True)
            code = r.stdout.strip() or '000'
            if code == '200':
                return code
            if code in ('404', '410'):
                return code
        except Exception:
            code = '000'
        time.sleep(1.5 * (attempt + 1))
    return code


def main():
    do_net = '--net' in sys.argv
    ext, ignored = scan_external()

    print(f"=== 自持审计 qx-rules-mirror ({'local+net' if do_net else 'local'}) ===")
    n_files = len(glob.glob(ROOT + '/mirror/**/*', recursive=True)) + len(glob.glob(ROOT + '/_custom/**/*', recursive=True))
    print(f"仓库文件: {n_files}")
    print(f"仍指向第三方的模块内引用: {len(ext)}  (已确认惰性忽略: {ignored})")

    if ext:
        by = collections.Counter(author_of(u) for u in ext)
        for a, n in by.most_common():
            print(f"  {n:4}  {a}")
        if do_net:
            print("\n--- 死链检查 (有节流) ---")
            dead = []
            for i, u in enumerate(ext, 1):
                c = check(u)
                if c != '200':
                    dead.append((c, u))
                time.sleep(RATE_SLEEP)
            print(f"死链: {len(dead)}/{len(ext)}")
            for c, u in dead:
                print(f"  [{c}] {u}")
    else:
        print("✅ 零外部依赖 —— 任何上游删号都不会影响本仓库")

    print()
    if ext:
        print("结论: 仍有外部依赖，跑 `python3 scripts/sync.py` 把它们收编后再审计")
        sys.exit(1)
    print("结论: 自持 ✓")


if __name__ == '__main__':
    main()
