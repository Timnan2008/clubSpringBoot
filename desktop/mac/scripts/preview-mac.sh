#!/bin/bash
set -eu
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Applications/ChatGPT.app/Contents/Resources/cua_node/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  echo "需要先安装 Node.js，再按 README 安装依赖。"
  exit 1
fi
if [ ! -d node_modules/electron ]; then
  echo "请先在 desktop/mac 运行 npm ci 安装依赖。"
  exit 1
fi
node scripts/build.mjs
node node_modules/electron/cli.js . "--club-preview=${1:-student}"
