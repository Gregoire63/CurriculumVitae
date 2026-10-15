#!/usr/bin/env bash
# Régénère les CV PDF (FR / EN) et l'image de partage depuis cv-source/*.html,
# avec Chrome headless.
#
#   scripts/build-cv.sh            # les deux CV
#   scripts/build-cv.sh fr         # un seul
#   scripts/build-cv.sh og         # l'image de partage (public/og-image.jpg et .webp)
#
# Les polices sont dans cv-source/fonts/ (versions fixes, lisibles par les ATS) :
# pas besoin de réseau. Après génération, `pdftotext <pdf> -` doit se lire dans
# l'ordre visuel et `pdffonts <pdf>` ne doit lister aucune police « Type 3 ».
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)}"
if [[ -z "$CHROME" ]]; then
    echo "Chrome/Chromium introuvable : exporte CHROME=/chemin/vers/chrome" >&2
    exit 1
fi

build() { # $1 = langue (fr|en), $2 = PDF de sortie
    local src="cv-source/$1.html" out="$2"
    # --virtual-time-budget laisse le temps aux polices d'arriver avant l'impression.
    # --no-sandbox : nécessaire dans certains conteneurs/sandboxes ; le fichier imprimé est local et le nôtre.
    "$CHROME" --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer \
        --virtual-time-budget=10000 --print-to-pdf="$out" "file://$PWD/$src" >/dev/null 2>&1
    local pages
    pages=$(pdfinfo "$out" 2>/dev/null | awk '/^Pages/ {print $2}' || echo '?')
    echo "$out — $pages page(s)"
}

build_og() { # image Open Graph 1200×630, convertie par sharp (déjà dans node_modules)
    local png
    png="$(mktemp --suffix=.png)"
    "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1200,630 \
        --virtual-time-budget=10000 --screenshot="$png" "file://$PWD/cv-source/og-image.html" >/dev/null 2>&1
    node -e "
const sharp = require('sharp')
const src = process.argv[1]
Promise.all([
    sharp(src).jpeg({ quality: 86, mozjpeg: true }).toFile('public/og-image.jpg'),
    sharp(src).webp({ quality: 82 }).toFile('public/og-image.webp'),
]).then(() => console.log('public/og-image.jpg et public/og-image.webp — 1200×630'))
" "$png"
    rm -f "$png"
}

targets=("$@")
[[ ${#targets[@]} -eq 0 ]] && targets=(fr en)
for target in "${targets[@]}"; do
    case "$target" in
        fr) build fr public/cv/CV_Gregoire_Raturat.pdf ;;
        en) build en public/cv/CV_Gregoire_Raturat_EN.pdf ;;
        og) build_og ;;
        *) echo "Cible inconnue : $target (fr|en|og)" >&2; exit 1 ;;
    esac
done
