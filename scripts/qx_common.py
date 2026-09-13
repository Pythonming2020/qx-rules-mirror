#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Helpers partagés : quels URLs un fichier QX fait-il TÉLÉCHARGER ?

Règle de sécurité : on ne réécrit JAMAIS un URL qui vit dans du code JavaScript
(un script peut appeler une API à l'exécution — la réécrire le casserait).
On ne touche qu'aux lignes qui sont des DIRECTIVES Quantumult X :

    ^https?:... url script-response-body   https://.../script.js      <- cible = dernier URL
    https://.../liste.list, tag=..., update-interval=..., enabled=...  <- cible = 1er URL
    https://.../module.conf                                            <- ligne = URL seul

Collections.conf (chxm1023) est au format « UserScript » : pas de sections [xxx],
juste des règles nues. D'où le test par ligne et non par section.
"""
import re

URL_RE = re.compile(r'https://[^\s,)\]"\'<>]+')
SCRIPT_DIRECTIVE = ' url script-'
BARE_URL = re.compile(r'^https?://\S+$')
URL_ENTRY = re.compile(r'^https?://\S+\s*,\s*(tag=|update-interval|enabled)')


def module_urls(text):
    """URLs que Quantumult X téléchargera d'après ce fichier (dédupliqués, ordre stable)."""
    out = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith('#'):
            continue
        urls = [u.rstrip('.,;') for u in URL_RE.findall(s)]
        if not urls:
            continue
        if SCRIPT_DIRECTIVE in s:
            out.append(urls[-1])          # la cible du script = dernier URL de la ligne
        elif URL_ENTRY.match(s):
            out.append(urls[0])
        elif BARE_URL.match(s):
            out.append(urls[0])
    seen, uniq = set(), []
    for u in out:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    return uniq


def rewrite_module_urls(text, mapping):
    """Réécrit, ligne par ligne, uniquement les URLs de directive. Idempotent."""
    lines = text.splitlines(keepends=True)
    changed = 0
    for i, line in enumerate(lines):
        s = line.strip()
        if not s or s.startswith('#'):
            continue
        if SCRIPT_DIRECTIVE in s:
            urls = [u.rstrip('.,;') for u in URL_RE.findall(s)]
            if not urls:
                continue
            target = urls[-1]
            if target in mapping:
                lines[i] = line.replace(target, mapping[target])
                changed += 1
        elif URL_ENTRY.match(s) or BARE_URL.match(s):
            urls = [u.rstrip('.,;') for u in URL_RE.findall(s)]
            if not urls:
                continue
            target = urls[0]
            if target in mapping:
                lines[i] = line.replace(target, mapping[target])
                changed += 1
    return ''.join(lines), changed
