#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extrait les liens externes de la configuration QX -> urls.txt"""
import re

content = open('/tmp/qx_now.conf', encoding='utf-8').read()
urls = set(re.findall(r'https://[^\s,)"\']+', content))
skip = ['unityads.unity3d.com', 'onetrust.io', 'githubassets.com', 'api.zhihu.com']
clean = sorted(u for u in urls if not any(s in u for s in skip) and not u.startswith('^'))
open('/tmp/mirror_build/urls.txt', 'w').write('\n'.join(clean) + '\n')
print(f'urls.txt: {len(clean)} entrees')
