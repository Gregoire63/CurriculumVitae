#!/usr/bin/env bash
# Applique la v10 sans dépendre du contexte git : les deux fichiers modifiés sont
# fournis en entier (déjà écrasés par le zip), il ne reste que les suppressions.
#
# À lancer depuis la racine du dépôt, APRÈS avoir extrait le zip par-dessus.
set -u

echo "→ Suppression des trois fichiers morts"
for f in utils/nutritionStats.ts components/nutrition/Plan.vue; do
  if [ -e "$f" ]; then git rm -q "$f" && echo "   supprimé : $f"; else echo "   déjà absent : $f"; fi
done
if [ -d public/plats-demo ]; then git rm -rq public/plats-demo && echo "   supprimé : public/plats-demo/"; else echo "   déjà absent : public/plats-demo/"; fi

# Ordre important : Plan.vue est le seul fichier qui importe encore
# ~/utils/nutritionStats. Retirer le doublon sans lui casserait le build.

echo
echo "→ Vérifications"
npm run check && npm test && npm run build
