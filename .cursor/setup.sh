#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

KB_DIR="$PROJECT_ROOT/.knowledge-base"

# URL par defaut de la Knowledge Base Improba
# Peut etre surchargee par la variable d'environnement KNOWLEDGE_BASE_REPO_URL
# (configurable dans les secrets Cursor Cloud Agent)
DEFAULT_KB_REPO_URL=""
KB_REPO_URL="${KNOWLEDGE_BASE_REPO_URL:-$DEFAULT_KB_REPO_URL}"

clone_knowledge_base() {
  if [ -d "$KB_DIR" ]; then
    echo "[setup] Knowledge Base deja presente dans $KB_DIR"
    return 0
  fi

  if [ -z "$KB_REPO_URL" ]; then
    echo "[setup] WARN: Pas d'URL configuree pour la Knowledge Base."
    echo "[setup] Definir KNOWLEDGE_BASE_REPO_URL en variable d'environnement"
    echo "[setup] ou modifier DEFAULT_KB_REPO_URL dans .cursor/setup.sh"
    return 0
  fi

  echo "[setup] Clonage de la Knowledge Base depuis $KB_REPO_URL..."
  git clone "$KB_REPO_URL" "$KB_DIR"
  echo "[setup] Knowledge Base clonee dans $KB_DIR"
}

echo "[setup] Setup de l'environnement ActoGraph v3..."
clone_knowledge_base
echo "[setup] Setup termine."
