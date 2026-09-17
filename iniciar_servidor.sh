#!/usr/bin/env bash
# ==============================================================================
# PSICONAUTA — Lanzador de Servidor Local
# "La Canoa en la Corriente"
# ==============================================================================

DIR_ACTUAL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR_ACTUAL" || exit 1

PUERTO=${1:-8080}

echo "======================================================="
echo " 🏵️  PSICONAUTA: LA CANOA EN LA CORRIENTE"
echo "======================================================="
echo "📁 Directorio: $DIR_ACTUAL"
echo "🌐 Servidor en: http://localhost:$PUERTO"
echo "-------------------------------------------------------"
echo "💡 Para detener el servidor presiona: CTRL + C"
echo "======================================================="

# Abrir en segundo plano en el navegador predeterminado tras 1 segundo
(sleep 1 && (xdg-open "http://localhost:$PUERTO" 2>/dev/null || open "http://localhost:$PUERTO" 2>/dev/null) &)

# Iniciar servidor HTTP con Python 3
python3 -m http.server "$PUERTO"
