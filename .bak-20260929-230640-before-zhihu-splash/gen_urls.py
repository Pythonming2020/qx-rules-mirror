#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Régénère urls.txt (premier niveau) depuis la configuration QX en ligne.

- Source : le gist secret via l'API GitHub (jeton dans .push_token) — donc ce que
  le téléphone utilise RÉELLEMENT, pas une vieille copie locale.
- Union avec les entrées déjà présentes : rien n'est perdu.
- Les scripts référencés DEPUIS L'INTÉRIEUR des modules ne sont pas ici :
  voir scripts/gen_internal_urls.py (urls-internal.txt).

Usage: python3 gen_urls.py [chemin_vers_config.conf]
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
GIST = '656d3b707f57078f537b65d3a5e569e9'
OUT = os.path.join(ROOT, 'urls.txt')

URL_RE = re.compile(r'https?://[^\s,)\]"\'<>]+')
SKIP = ['unityads.unity3d.com', 'onetrust.io', 'githubassets.com', 'api.zhihu.com',
        'Pythonming2020/qx-rules-mirror']


def from_gist():
    tok = open(os.path.join(ROOT, '.push_token')).read().strip()
    r = subprocess.run(['curl', '-s', f'https://api.github.com/gists/{GIST}',
                        '-H', f'Authorization: token {tok}'], capture_output=True, text=True)
    return json.loads(r.stdout)['files']['quantumult.conf']['content']


def extract(cfg):
    out = []
    for line in cfg.splitlines():
        s = line.strip()
        if not s or s.startswith('#') or s.startswith('^'):
            continue
        urls = URL_RE.findall(s)
        if not urls:
            continue
        if ' url ' in s or 'script-' in s:      # règle de rewrite -> on ignore
            continue
        if re.match(r'^https?://\S+\s*,\s*(tag=|update-interval|enabled)', s) or re.match(r'^https?://\S+$', s):
            u = urls[0].rstrip('.,;')
            if any(k in u for k in SKIP):
                continue
            out.append(u)
    seen, uniq = set(), []
    for u in out:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    return uniq


def existing():
    if not os.path.exists(OUT):
        return []
    return [l.strip() for l in open(OUT, encoding='utf-8')
            if l.strip() and not l.startswith('#')]


def main():
    cfg = open(sys.argv[1], encoding='utf-8').read() if len(sys.argv) > 1 else from_gist()
    found = extract(cfg)
    keep = existing()
    merged = list(dict.fromkeys(found + keep))       # trouvés d'abord, puis existants
    header = ['# qx-rules-mirror — téléchargements de premier niveau',
              '# (généré par gen_urls.py — union config en ligne + entrées existantes)',
              '# scripts internes aux modules : voir urls-internal.txt', '']
    open(OUT, 'w', encoding='utf-8').write('\n'.join(header + merged) + '\n')
    print(f"urls.txt: {len(merged)} entrées ({len(found)} depuis la config, {len(keep)} conservées)")
    print("pense à lancer aussi : python3 scripts/gen_internal_urls.py")


if __name__ == '__main__':
    main()
