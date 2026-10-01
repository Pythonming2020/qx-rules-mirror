#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère urls-internal.txt : tous les scripts tiers référencés DEPUIS L'INTÉRIEUR
d'un module QX mirroité (les « références dans les fichiers »).

Ce sont ces références-là qui ont tué wloc et FT quand Yu9191 a supprimé son compte :
le fichier était bien mirroté, mais il pointait toujours vers l'upstream mort.

Usage: python3 scripts/gen_internal_urls.py
"""
import os, re, sys, glob, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qx_common import module_urls

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OURS = 'Pythonming2020/qx-rules-mirror'

PATTERNS = ['/mirror/**/*.conf', '/mirror/**/*.snippet', '/mirror/**/*.js',
            '/mirror/**/*.yaml', '/mirror/**/*.sgmodule', '/mirror/**/*.stoverride',
            '/mirror/**/*.lpx', '/_custom/**/*.conf', '/_custom/**/*.js',
            '/vendor/**/*.js']


def author_of(u):
    m = re.match(r'https://raw\.githubusercontent\.com/([^/]+)', u)
    return m.group(1) if m else 'other:' + u.split('/')[2]


def collect():
    urls, source = collections.OrderedDict(), {}
    for pat in PATTERNS:
        for f in sorted(glob.glob(ROOT + pat, recursive=True)):
            try:
                txt = open(f, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            for u in module_urls(txt):
                if OURS in u:
                    continue                       # déjà auto-hébergé
                if u not in urls:
                    urls[u] = os.path.relpath(f, ROOT)
                    source[u] = os.path.relpath(f, ROOT)
    return urls


def main():
    urls = collect()
    print(f"références internes encore tierces : {len(urls)}")
    by_author = collections.Counter(author_of(u) for u in urls)
    for a, n in by_author.most_common():
        print(f"  {n:4}  {a}")

    lines = ['# qx-rules-mirror — scripts tiers référencés depuis l’intérieur des modules',
             '# (généré par scripts/gen_internal_urls.py — ne pas éditer à la main)',
             '# sync.py télécharge ces URLs puis réécrit la référence dans le module',
             '# pour qu’elle pointe vers ce dépôt. Idempotent.',
             '']
    for a, _ in by_author.most_common():
        group = sorted(u for u in urls if author_of(u) == a)
        lines.append(f'# --- {a} ({len(group)}) ---')
        lines.extend(group)
        lines.append('')
    # UNION avec la liste existante : urls-internal.txt est un REGISTRE des sources
    # suivies — il ne doit jamais rétrécir (après réécriture, les références ne
    # sont plus « externes » et une régénération nue les perdrait).
    existing = []
    if os.path.exists(f'{ROOT}/urls-internal.txt'):
        existing = [l.strip() for l in open(f'{ROOT}/urls-internal.txt', encoding='utf-8')
                    if l.strip() and not l.startswith('#')]
    merged = list(dict.fromkeys(list(urls) + existing))
    lines = ['# qx-rules-mirror — registre des scripts tiers suivis (REGISTRE: ne rétrécit pas)',
             '# (généré par scripts/gen_internal_urls.py — union avec la version précédente)',
             '# sync.py les télécharge puis réécrit la référence interne vers ce dépôt.',
             '']
    for a, _ in by_author.most_common():
        group = sorted(u for u in urls if author_of(u) == a)
        lines.append(f'# --- {a} ({len(group)}) ---')
        lines.extend(group)
        lines.append('')
    for u in merged:
        if u not in urls:
            lines.append(u)
    open(f'{ROOT}/urls-internal.txt', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(f"\nécrit : urls-internal.txt ({len(merged)} URLs, registre)")


if __name__ == '__main__':
    main()
