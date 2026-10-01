# qx-rules-mirror

Miroir auto-hébergé des dépendances externes de la configuration Quantumult X de Ming.

**Objectif : qu'aucune suppression de compte en amont n'affecte l'usage réel.**
Vérifié : `python3 scripts/audit.py` → 0 dépendance externe.

## Les deux niveaux (le second est ce qui manquait)

| Niveau | Fichier | Rôle |
|---|---|---|
| 1 | `urls.txt` | ce que la **configuration** télécharge (modules, listes) |
| 2 | `urls-internal.txt` | les scripts référencés **depuis l'intérieur** des modules |

Le niveau 2 est celui qui avait tué wloc et FT : le fichier était bien mirroté, mais il
pointait encore vers un dépôt amont supprimé. `sync.py` **réécrit maintenant ces références**
pour qu'elles pointent vers ce dépôt — un simple fichier copié ne suffit pas, c'est la
référence à l'intérieur qui doit être corrigée.

`urls-internal.txt` est un **registre** : il ne rétrécit jamais. Après réécriture les
références ne sont plus « externes », donc une régénération nue perdrait la trace.

## Arborescence

```
urls.txt              # niveau 1 (généré par gen_urls.py — union, rien n'est perdu)
urls-internal.txt     # niveau 2 (registre, généré par scripts/gen_internal_urls.py)
manifest.json         # correspondance URL amont -> chemin mirroté (niveau 1)
mirror/               # contenus mirrotés, <proprietaire>_<depot>/<fichier>
_custom/              # NOS artefacts : scripts écrits ou corrigés à la main
vendor/               # originaux tiers hébergés tels quels (ex. wloc.js)
archive/              # fichiers retirés du service, conservés pour mémoire
scripts/
  qx_common.py          # module_urls() / rewrite_module_urls() — logique partagée
  sync.py               # télécharge les 2 niveaux PUIS réécrit les références internes
  audit.py              # contrôle d'auto-portance (--net ajoute la vivacité)
  gen_internal_urls.py  # régénère le registre niveau 2
.audit-ignore         # références inertes (commentaire JS, module désactivé, faute amont)
.dead-sources         # sources amont retirées : sync.py les saute au lieu d'échouer
sync-push.sh          # sync -> audit -> commit -> push (silencieux si rien à faire)
```

## Usage

```bash
python3 scripts/sync.py            # télécharger + réécrire
python3 scripts/audit.py           # auto-portance (aucun réseau)
python3 scripts/audit.py --net     # + vérification de vivacité (avec cadence)
bash sync-push.sh                  # la chaîne complète, telle que lancée par le cron
```

Synchronisation automatique : chaque jour à 05:00 (tâche planifiée Hermes, `no_agent`).
Le job reste **silencieux en cas de succès** ; il n'écrit que s'il y a une mise à jour
poussée, ou une erreur (source morte, dépendance externe détectée).

## Deux pièges à ne pas rejouer

1. **Ne pas marteler `raw.githubusercontent.com`.** 60+ requêtes en rafale → HTTP 429 →
   des liens **valides** passent pour morts. `sync.py` et `audit.py` imposent 0,35 s entre
   requêtes et 4 tentatives avec repli exponentiel. Toute conclusion « N liens morts » sans
   retries doit être vérifiée par échantillon avant d'agir.
2. **Ne réécrire que les lignes de directive QX** (`… url script-*`, `<url>, tag=…`, ligne
   = URL seul). Un URL dans du code JavaScript peut être une API appelée à l'exécution :
   le réécrire casserait le script. Voir `scripts/qx_common.py`.

## Format de référence dans la configuration QX

```
https://raw.githubusercontent.com/Pythonming2020/qx-rules-mirror/main/mirror/<proprietaire>_<depot>/<fichier>
https://raw.githubusercontent.com/Pythonming2020/qx-rules-mirror/main/_custom/<fichier>
```

## Limites honnêtes

- Le miroir protège le **contenu**, pas le **comportement** : un script parfaitement mirroté
  meurt quand même si l'API visée change (côté serveur, ou nouvelle version d'app).
- Ne couvre pas les ressources hors GitHub : la page de sélection `wloc-pages.pages.dev`
  (Cloudflare, dépend du compte de l'auteur) et les raccourcis iCloud `wloc`. Les raccourcis
  suffisent à l'usage quotidien.
- Ce dépôt devient lui-même un point unique : en conserver une copie locale.
