#!/bin/bash
# Synchronisation quotidienne du miroir qx-rules-mirror : sources -> commit -> push
# + audit d'auto-portance (aucune dépendance externe ne doit subsister)
# Succès : aucune sortie (silencieux) ; échec : message d'erreur (alerte cron)
cd "$(dirname "$0")" || exit 1

TOKEN=$(cat .push_token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "ERREUR: .push_token manquant"
  exit 1
fi

python3 scripts/sync.py > /tmp/qx_mirror_sync.log 2>&1
if [ $? -ne 0 ]; then
  echo "ERREUR: sync.py a echoue"
  tail -5 /tmp/qx_mirror_sync.log
  exit 1
fi

# Les modules mirroite peuvent REFERENCER des scripts tiers (URLs de directive).
# sync.py ne les telecharge/reecrit que s'ils sont dans urls-internal.txt.
# On enregistre donc les references presentes dans l'arbre avant l'audit, sinon
# un simple changement d'auteur en amont bloque le push tous les jours.
python3 scripts/gen_internal_urls.py > /tmp/qx_mirror_gen.log 2>&1
python3 scripts/sync.py > /tmp/qx_mirror_sync2.log 2>&1
if [ $? -ne 0 ]; then
  echo "ERREUR: sync.py (2e passe) a echoue"
  tail -5 /tmp/qx_mirror_sync2.log
  exit 1
fi

# Variantes sûres de StartUpAds : on retire les domaines bancaires / paiement /
# WeChat de la liste MITM (cert pinning = app cassée, pas filtrage).
python3 scripts/build_startupads_custom.py > /tmp/qx_mirror_startup.log 2>&1
if [ $? -ne 0 ]; then
  echo "ERREUR: build_startupads_custom.py a echoue"
  tail -5 /tmp/qx_mirror_startup.log
  exit 1
fi

# Audit d'auto-portance : toute référence encore externe doit faire échouer le job.
python3 scripts/audit.py > /tmp/qx_mirror_audit.log 2>&1
if [ $? -ne 0 ]; then
  echo "ERREUR: audit — dépendances externes détectées"
  grep -E '仍指向第三方|^  [0-9]+' /tmp/qx_mirror_audit.log | head -8
  exit 1
fi

# Surveillance des scripts du module Spotify : muet si rien n'a bougé, sinon rapport
# (état dans .watch-state.json, commité avec le miroir).
python3 scripts/watch_upstream.py || true

git add -A
if git diff --cached --quiet; then
  exit 0  # aucun changement, silencieux
fi

git -c user.email="qx-mirror-bot@users.noreply.github.com" -c user.name="qx-mirror-bot" \
  commit -qm "synchronisation: $(date -u +%Y-%m-%d)"
git push -q "https://x-access-token:${TOKEN}@github.com/Pythonming2020/qx-rules-mirror.git" main 2>&1
if [ $? -ne 0 ]; then
  echo "ERREUR: git push a echoue"
  exit 1
fi
echo "Synchronisation terminee : mise a jour poussee"
