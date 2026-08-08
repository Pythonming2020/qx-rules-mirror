#!/bin/bash
# Synchronisation quotidienne du miroir qx-rules-mirror : sources -> commit -> push
# Succes : aucune sortie (silencieux) ; echec : message d'erreur (alerte cron)
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

