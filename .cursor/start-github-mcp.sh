#!/usr/bin/env bash
# Cursor injects its own Node first on PATH; npm/npx then mix Cursor's node with NVM's
# npm-cli.js and crash (ENOENT under /usr/share/cursor/...). Force a clean NVM-only PATH.
set -euo pipefail
NVM_NODE="/home/syl/.nvm/versions/node/v20.19.5/bin"
export PATH="${NVM_NODE}:/usr/bin:/bin"
unset NODE_PATH 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
if [[ -f "${REPO_ROOT}/.env.mcp" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.env.mcp"
  set +a
fi

exec "${NVM_NODE}/npx" -y @modelcontextprotocol/server-github
