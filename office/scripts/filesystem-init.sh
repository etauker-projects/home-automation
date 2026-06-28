#!/usr/bin/env sh
set -Eeuo pipefail

trap 'echo "ERROR: filesystem init failed at line $LINENO" >&2' ERR

echo "=== Filesystem permission init ==="

########################################
# Required variables
########################################

: "${TARGET_DIR:?missing TARGET_DIR}"
: "${TARGET_UID:?missing TARGET_UID}"
: "${TARGET_GID:?missing TARGET_GID}"

echo "Target directory: ${TARGET_DIR}"
echo "Target ownership: ${TARGET_UID}:${TARGET_GID}"

########################################
# Validate directory exists
########################################

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Directory does not exist, creating: $TARGET_DIR"
  mkdir -p "$TARGET_DIR"
fi

# ########################################
# # Check current ownership
# ########################################

# CURRENT=$(stat -c "%u:%g" "$TARGET_DIR" || true)

# if [[ "$CURRENT" != "${TARGET_UID}:${TARGET_GID}" ]]; then
#   echo "Ownership mismatch ($CURRENT), fixing..."
#   chown -R "${TARGET_UID}:${TARGET_GID}" "$TARGET_DIR"
# else
#   echo "Ownership already correct, skipping"
# fi

########################################
# Apply ownership recursively
########################################

echo "Applying recursive chown..."

chown -R "${TARGET_UID}:${TARGET_GID}" "${TARGET_DIR}"

echo "Done."