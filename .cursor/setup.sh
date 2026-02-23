#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# L'IKB est clonee dans un dossier separe, en dehors du projet
IKB_CLONE_DIR="$HOME/.ikb"
# Symlink dans le projet pour que les references .knowledge-base/ fonctionnent
IKB_SYMLINK="$PROJECT_ROOT/.knowledge-base"

# URL par defaut de la Knowledge Base Improba
# Peut etre surchargee par la variable d'environnement KNOWLEDGE_BASE_REPO_URL
# (configurable dans les secrets Cursor Cloud Agent)
DEFAULT_KB_REPO_URL=""
KB_REPO_URL="${KNOWLEDGE_BASE_REPO_URL:-$DEFAULT_KB_REPO_URL}"

clone_knowledge_base() {
  if [ -d "$IKB_CLONE_DIR" ]; then
    echo "[setup] IKB deja presente dans $IKB_CLONE_DIR"
  elif [ -z "$KB_REPO_URL" ]; then
    echo "[setup] WARN: Pas d'URL configuree pour l'IKB."
    echo "[setup] Definir KNOWLEDGE_BASE_REPO_URL en variable d'environnement"
    echo "[setup] ou modifier DEFAULT_KB_REPO_URL dans .cursor/setup.sh"
    return 0
  else
    echo "[setup] Clonage de l'IKB depuis $KB_REPO_URL vers $IKB_CLONE_DIR..."
    git clone "$KB_REPO_URL" "$IKB_CLONE_DIR"
    echo "[setup] IKB clonee dans $IKB_CLONE_DIR"
  fi

  # Creer le symlink dans le projet si absent
  if [ -L "$IKB_SYMLINK" ]; then
    echo "[setup] Symlink .knowledge-base/ deja present"
  elif [ -d "$IKB_SYMLINK" ]; then
    echo "[setup] WARN: .knowledge-base/ existe deja en tant que dossier (pas un symlink)"
  else
    ln -s "$IKB_CLONE_DIR" "$IKB_SYMLINK"
    echo "[setup] Symlink cree : .knowledge-base/ -> $IKB_CLONE_DIR"
  fi
}

echo "[setup] Setup de l'environnement ActoGraph v3..."
clone_knowledge_base
echo "[setup] Setup termine."
