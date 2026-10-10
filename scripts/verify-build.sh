#!/usr/bin/env bash
# Build and serve the COMMITTED code (HEAD) in a throwaway copy, so your own dev server
# and its .next folder are never touched, and with TEST-ONLY settings from .env.verify.
#   scripts/verify-build.sh start [port]   build, serve, print the URL (default port 3104)
#   scripts/verify-build.sh stop  [port]   stop the server and delete the copy
set -euo pipefail

cmd="${1:-}"
port="${2:-3104}"
root="$(git rev-parse --show-toplevel)"
dir="${HOME}/.cache/sw-verify-${port}"

# PID listening on the port. lsof works on macOS and most Linux; some sandboxes only allow ss.
listener_pid() {
  local pid=""
  if command -v lsof >/dev/null 2>&1; then
    pid="$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  fi
  if [ -z "${pid}" ] && command -v ss >/dev/null 2>&1; then
    pid="$(ss -ltnp 2>/dev/null | grep ":${port} " | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2 || true)"
  fi
  echo "${pid}"
}

# Next never overrides a variable that is already in the environment, so anything exported in
# your shell (say, the production DATABASE_URL you used for `npm run db:deploy`) would beat the
# test-only values in .env.local. Drop every variable the app reads, so the build and the
# server see only what is in .env.verify.
scrub_env() {
  local key
  for key in $(sed -nE 's/^([A-Z][A-Z0-9_]*)=.*/\1/p' "${root}/.env.example" "${root}/.env.verify" | sort -u); do
    unset "${key}"
  done
}

stop_server() {
  local pid
  pid="$(listener_pid)"
  [ -n "${pid}" ] || return 0
  kill "${pid}" 2>/dev/null || true
  # Next shuts down gracefully; give it a few seconds, then insist.
  for _ in $(seq 1 10); do
    [ -z "$(listener_pid)" ] && return 0
    sleep 0.5
  done
  kill -9 "${pid}" 2>/dev/null || true
  sleep 0.5
}

case "${cmd}" in
  start)
    [ -f "${root}/.env.verify" ] || { echo "Missing .env.verify. Run: npm run verify:env" >&2; exit 1; }
    grep -Eq '^DATABASE_URL=.*@(127\.0\.0\.1|localhost):54329/swtest$' "${root}/.env.verify" \
      || { echo "Refusing to start: DATABASE_URL in .env.verify is not the throwaway test database (127.0.0.1:54329/swtest). Run: npm run verify:env" >&2; exit 1; }
    [ -z "$(listener_pid)" ] || { echo "Port ${port} is already in use. Pick another port or run: scripts/verify-build.sh stop ${port}" >&2; exit 1; }
    rm -rf "${dir}"
    mkdir -p "${dir}"
    git -C "${root}" archive HEAD | tar -x -C "${dir}"
    [ -f "${dir}/package.json" ] || { echo "Could not extract HEAD into ${dir}" >&2; exit 1; }
    ln -s "${root}/node_modules" "${dir}/node_modules"
    cp "${root}/.env.verify" "${dir}/.env.local"
    scrub_env
    cd "${dir}"
    echo "Generating the Prisma client and building (about a minute)..."
    npx prisma generate >/dev/null
    NEXT_TELEMETRY_DISABLED=1 npx next build >build.log 2>&1 || { tail -40 build.log >&2; exit 1; }
    # Loopback only: the build has a publicly documented admin password (see .env.verify), so it
    # must not be reachable from other machines on the network.
    nohup npx next start -p "${port}" -H 127.0.0.1 >start.log 2>&1 &
    for _ in $(seq 1 60); do curl -s -o /dev/null "http://localhost:${port}/admin/login" && break; sleep 1; done
    curl -s -o /dev/null "http://localhost:${port}/admin/login" || { tail -20 start.log >&2; exit 1; }
    echo "serving http://localhost:${port} from ${dir}"
    ;;
  stop)
    stop_server
    case "${dir}" in "${HOME}"/.cache/sw-verify-*) rm -rf "${dir}" ;; esac
    echo "stopped port ${port} and removed ${dir}"
    ;;
  *)
    echo "usage: scripts/verify-build.sh <start|stop> [port]" >&2
    exit 2
    ;;
esac
