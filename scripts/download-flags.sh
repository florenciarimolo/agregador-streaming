#!/bin/bash

# Script para descargar las banderas SVG desde flag-icons
# Uso: ./scripts/download-flags.sh

set -e

echo "🚩 Descargando banderas SVG..."

# Crear directorio si no existe
mkdir -p public/icons/flags

# Lista de códigos de países
COUNTRIES=(
  "es" "us" "mx" "ar" "co" "cl" "pe" "ve" "ec" "gt"
  "cu" "bo" "do" "hn" "py" "sv" "ni" "cr" "pa" "uy"
  "pr" "fr" "gb" "de" "it" "pt" "br" "ca" "au" "nz"
)

# URL base de flag-icons en CDN (raw.githubusercontent.com)
BASE_URL="https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3"

# Descargar cada bandera
for country in "${COUNTRIES[@]}"; do
  echo "  📥 Descargando ${country}.svg..."
  curl -s -f "${BASE_URL}/${country}.svg" -o "public/icons/flags/${country}.svg" || {
    echo "  ⚠️  No se pudo descargar ${country}.svg"
  }
done

echo "✅ Banderas descargadas en public/icons/flags/"
echo ""
echo "Nota: Si alguna bandera falló, puedes descargarla manualmente desde:"
echo "https://github.com/lipis/flag-icons/tree/main/flags/4x3"

