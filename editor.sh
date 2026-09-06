#!/usr/bin/env bash
# ==========================================================
# 🇲🇽 LANZADOR DE RÓTULOS WEB PARA MEMEXICANISIMOS
# Redirige al gestor unificado ubicado en 'Rotulos Web'
# ==========================================================
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROTULOS_DIR="$(cd "$DIR/../Rotulos Web" 2>/dev/null && pwd)"

if [ -z "$ROTULOS_DIR" ] || [ ! -f "$ROTULOS_DIR/editor.sh" ]; then
  echo "❌ Error: No se encontró el gestor de Rótulos Web en '$DIR/../Rotulos Web/editor.sh'"
  exit 1
fi

ACTION="${1:-start}"
shift || true

# Ejecutar el gestor de Rótulos Web pasando la ruta de la web como proyecto
exec "$ROTULOS_DIR/editor.sh" "$ACTION" "$DIR" "$@"
