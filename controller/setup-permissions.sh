#!/usr/bin/env bash
# Sets up host ownership/permissions for the controller container and its mounted volumes.
#
#   - creates a system user for the controller (no login) and a shared data group
#   - adds extra members (e.g. printer, your login user) to the shared group
#   - creates every mounted directory (so docker doesn't create them as root)
#   - chowns them to <user>:<group>, makes them group-writable, sets setgid and a
#     default ACL so files created later stay in the group and group-writable
#   - writes UID/GID into the env file used by docker compose
#   - skips CIFS/SMB mounts (ownership there comes from fstab) and prints the options to use
#
# Idempotent: safe to re-run after adding directories or members.
#
# Usage: sudo ./setup-permissions.sh [options]
#   --user NAME        service user the container runs as      [controller]
#   --group NAME       shared group for pipeline data          [homedata]
#   --member NAME      add an existing user to the group (repeatable), e.g. --member printer --member etauker
#   --env-file PATH    env file read for DIR_* and updated with UID/GID [./.env next to this script]
#   --private          remove all access for "others" (default only removes write)
#   --dry-run          print what would be done without changing anything
#   -h, --help         show this help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

svc_user="controller"
svc_group="homedata"
members=()
env_file="$SCRIPT_DIR/.env"
private=false
dry_run=false

usage() { sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --user) svc_user="$2"; shift 2 ;;
        --group) svc_group="$2"; shift 2 ;;
        --member) members+=("$2"); shift 2 ;;
        --env-file) env_file="$2"; shift 2 ;;
        --private) private=true; shift ;;
        --dry-run) dry_run=true; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    esac
done

run() {
    if $dry_run; then
        printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
    else
        "$@"
    fi
}

info() { printf '==> %s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }

if ! $dry_run && [[ $EUID -ne 0 ]]; then
    echo "Run as root (sudo $0 ...), or use --dry-run." >&2
    exit 1
fi

# ---- Read a key from the env file (last assignment wins, surrounding quotes stripped) ----
env_get() {
    local key="$1" line value=""
    [[ -f "$env_file" ]] || { echo ""; return; }
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?${key}=(.*)$ ]] || continue
        value="${BASH_REMATCH[2]}"
        value="${value%%[[:space:]]#*}"     # trailing comment
        value="${value%"${value##*[![:space:]]}"}"
        value="${value#\"}"; value="${value%\"}"
        value="${value#\'}"; value="${value%\'}"
    done < "$env_file"
    echo "$value"
}

# ---- Set or append KEY=VALUE in the env file, keeping the file's owner and mode ----
env_set() {
    local key="$1" value="$2" tmp
    if $dry_run; then
        echo "[dry-run] set $key=$value in $env_file"
        return
    fi
    tmp="$(mktemp)"
    if grep -qE "^[[:space:]]*${key}=" "$env_file"; then
        sed -E "s|^[[:space:]]*${key}=.*|${key}=${value}|" "$env_file" > "$tmp"
    else
        cat "$env_file" > "$tmp"
        [[ -z "$(tail -c1 "$env_file")" ]] || echo >> "$tmp"
        echo "${key}=${value}" >> "$tmp"
    fi
    cat "$tmp" > "$env_file"   # write in place so ownership/permissions are kept
    rm -f "$tmp"
}

# ---- 1. Group and user ----
if getent group "$svc_group" > /dev/null; then
    info "Group '$svc_group' exists"
else
    info "Creating group '$svc_group'"
    run groupadd --system "$svc_group"
fi

if id "$svc_user" &> /dev/null; then
    info "User '$svc_user' exists"
    if ! id -nG "$svc_user" | tr ' ' '\n' | grep -qx "$svc_group"; then
        run usermod -aG "$svc_group" "$svc_user"
    fi
else
    info "Creating system user '$svc_user' (primary group '$svc_group', no login)"
    run useradd --system --no-create-home --shell /usr/sbin/nologin -g "$svc_group" "$svc_user"
fi

for m in "${members[@]+"${members[@]}"}"; do
    if id "$m" &> /dev/null; then
        info "Adding '$m' to '$svc_group'"
        run usermod -aG "$svc_group" "$m"
    else
        warn "User '$m' does not exist, skipping"
    fi
done

if $dry_run && ! id "$svc_user" &> /dev/null; then
    svc_uid="<uid of $svc_user>"
else
    svc_uid="$(id -u "$svc_user")"
fi
if $dry_run && ! getent group "$svc_group" > /dev/null; then
    svc_gid="<gid of $svc_group>"
else
    svc_gid="$(getent group "$svc_group" | cut -d: -f3)"
fi

# ---- 2. Directories (same variables and defaults as docker-compose.yml) ----
dir_vars=(
    "DIR_PRINTER_PAPERLESS:./data/scans"
    "DIR_PAPERLESS_CONSUME:./data/paperless-consume"
    "DIR_PAPERLESS_EXPORT:./data/paperless-exports"
    "DIR_SYNOLOGY_DOCS:./data/nas"
    "DIR_CONFIG:./data/config"
    "DIR_POWER_MONITORING_INBOX:./data/power-monitoring/inbox"
    "DIR_POWER_MONITORING_PROCESSED:./data/power-monitoring/processed"
    "DIR_POWER_MONITORING_METADATA:./data/power-monitoring/metadata"
)

if $private; then
    other_mode="o-rwx"; other_acl="o::-"
else
    other_mode="o-w";   other_acl="o::rX"
fi

has_setfacl=true
command -v setfacl > /dev/null || { has_setfacl=false; warn "setfacl not found (install the 'acl' package); new files will follow the process umask"; }

cifs_dirs=()
declare -A seen=()

for entry in "${dir_vars[@]}"; do
    var="${entry%%:*}"
    default="${entry#*:}"
    dir="$(env_get "$var")"
    [[ -n "$dir" ]] || dir="$default"
    # Relative paths in compose are relative to the compose file's directory
    [[ "$dir" = /* ]] || dir="$SCRIPT_DIR/${dir#./}"
    dir="${dir%/}"

    if [[ -z "$dir" || "$dir" = "/" ]]; then
        warn "$var resolves to '/', refusing to touch it"
        continue
    fi
    [[ -z "${seen[$dir]:-}" ]] || continue
    seen[$dir]=1

    if [[ -d "$dir" ]] && command -v findmnt > /dev/null; then
        fstype="$(findmnt -n -o FSTYPE -T "$dir" || true)"
        if [[ "$fstype" =~ ^(cifs|smb3?)$ ]]; then
            info "$var: $dir is a $fstype mount, skipping (set ownership via fstab)"
            cifs_dirs+=("$dir")
            continue
        fi
    fi

    info "$var: $dir"
    run mkdir -p "$dir"
    run chown -R "$svc_user:$svc_group" "$dir"
    run chmod -R "u+rwX,g+rwX,$other_mode" "$dir"
    run find "$dir" -type d -exec chmod g+s {} +
    if $has_setfacl; then
        run find "$dir" -type d -exec setfacl -d -m "u::rwX,g::rwX,$other_acl" {} + \
            || warn "Could not set default ACL on $dir (filesystem without ACL support?); new files will follow the process umask"
    fi
done

# ---- 3. UID/GID for docker compose ----
if [[ -f "$env_file" ]]; then
    info "Writing UID=$svc_uid GID=$svc_gid to $env_file"
    env_set UID "$svc_uid"
    env_set GID "$svc_gid"
else
    warn "$env_file not found. Add these to the env file docker compose reads:"
    echo "UID=$svc_uid"
    echo "GID=$svc_gid"
fi

# ---- 4. Summary ----
echo
info "Done."
if [[ ${#cifs_dirs[@]} -gt 0 ]]; then
    echo "CIFS mounts were skipped: ${cifs_dirs[*]}"
fi
echo "For CIFS/SMB mounts (e.g. the NAS), use these options in /etc/fstab:"
echo "    uid=$svc_uid,gid=$svc_gid,rw,nounix,dir_mode=0770,file_mode=0660"
echo "  then: sudo systemctl daemon-reload && sudo umount <mountpoint> && sudo mount <mountpoint>"
echo
echo "Apply to the container:"
echo "    docker compose --profile prod up -d --force-recreate controller-prod"
echo "Group membership for added members applies on their next login."
