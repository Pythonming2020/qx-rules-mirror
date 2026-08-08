# qx-rules-mirror

Miroir des liens externes de Quantumult X de Ming (synchronisation automatique).

- Liste des sources : `urls.txt` (51 liens externes, extraits de la configuration QX)
- Contenu du miroir : `mirror/<proprietaire>_<depot>/<fichier>`
- Synchronisation automatique : chaque jour a 05:00 (tache planifiee Hermes)
- But : les liens externes de la configuration QX pointent vers ce depot, afin de ne plus dependre des depots amont (arret, suppression, lien mort)

## Mettre a jour la liste des sources

Modifiez `urls.txt`, puis relancez la synchronisation manuellement.

## Format de reference dans la configuration QX

```
https://raw.githubusercontent.com/Pythonming2020/qx-rules-mirror/main/mirror/<proprietaire>_<depot>/<fichier>
```

La correspondance complete se trouve dans `manifest.json`.
