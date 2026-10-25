#!/usr/bin/env bash
# setup_toolchain.sh - Prepara WSL2 (Ubuntu 24.04) para compilar Xash3D FWGS a WebAssembly.
# Idempotente: se puede relanzar sin romper nada.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/josue/OneDrive/Desktop/cof web/tools/wsl/setup_toolchain.sh"
#
# El árbol de build vive en ext4 (~/cof-web), no en /mnt/c: waf y emcc son ~10x más lentos sobre 9P.
set -euo pipefail

# 4.0.11: última versión probada con MAIN_MODULE + ASYNCIFY. En 6.0.x los callbacks HTML5 de SDL
# abortan con "no such functions have gotten exported" (dynCall_* no se detectan al enlazar).
EMSDK_VERSION="${EMSDK_VERSION:-4.0.11}"
WORK="${COF_WORK:-$HOME/cof-web}"
EMSDK_DIR="${EMSDK_DIR:-$HOME/emsdk}"
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

log "Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -qq
$SUDO apt-get install -y -qq \
    git python3 build-essential g++ cmake ninja-build pkg-config xz-utils lbzip2 \
    libsdl2-dev libfontconfig-dev libfreetype-dev   # SDL2 nativo: build de referencia en Linux

log "emsdk ($EMSDK_VERSION) en $EMSDK_DIR"
[ -d "$EMSDK_DIR/.git" ] || git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
git -C "$EMSDK_DIR" pull --ff-only -q || true
"$EMSDK_DIR/emsdk" install "$EMSDK_VERSION"
"$EMSDK_DIR/emsdk" activate "$EMSDK_VERSION"
grep -q 'emsdk_env.sh' "$HOME/.bashrc" || echo "source \"$EMSDK_DIR/emsdk_env.sh\" > /dev/null 2>&1" >> "$HOME/.bashrc"
# shellcheck disable=SC1091
source "$EMSDK_DIR/emsdk_env.sh" > /dev/null 2>&1

log "Repositorios en $WORK"
mkdir -p "$WORK/engine" "$WORK/game"
clone() {  # clone <url> <dir>
    if [ -d "$2/.git" ]; then git -C "$2" pull --ff-only -q && git -C "$2" submodule update --init --recursive -q
    else git clone --recursive -q "$1" "$2"; fi
}
clone https://github.com/FWGS/xash3d-fwgs.git      "$WORK/engine/xash3d-fwgs"
clone https://github.com/FWGS/hlsdk-portable.git   "$WORK/game/hlsdk-portable"

log "Versiones (anótalas en el README para fijarlas)"
emcc --version | head -1
printf 'xash3d-fwgs   %s\n' "$(git -C "$WORK/engine/xash3d-fwgs" rev-parse --short HEAD)"
printf 'hlsdk-portable %s\n' "$(git -C "$WORK/game/hlsdk-portable" rev-parse --short HEAD)"
