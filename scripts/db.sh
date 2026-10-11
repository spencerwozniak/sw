#!/usr/bin/env bash
# Local Postgres for development and tests. Never touches the production database.
#   scripts/db.sh up [dev|test]    start the container and apply migrations
#   scripts/db.sh down [dev|test]  stop it (dev keeps its data in a Docker volume)
#   scripts/db.sh url [dev|test]   print the connection string
set -euo pipefail

cmd="${1:-}"
kind="${2:-dev}"
case "$kind" in
  dev)  name=sw-dev-pg;  port=54330; db=swdev;  volume=(-v sw-dev-pgdata:/var/lib/postgresql/data) ;;
  test) name=sw-test-pg; port=54329; db=swtest; volume=() ;;
  *) echo "unknown kind: $kind (use dev or test)" >&2; exit 2 ;;
esac
url="postgresql://postgres:postgres@127.0.0.1:${port}/${db}"

case "$cmd" in
  up)
    if ! docker ps --format '{{.Names}}' | grep -qx "$name"; then
      docker rm -f "$name" >/dev/null 2>&1 || true
      docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB="$db" \
        -p "127.0.0.1:${port}:5432" "${volume[@]}" postgres:16-alpine >/dev/null
    fi
    for _ in $(seq 1 60); do
      if docker exec "$name" pg_isready -U postgres -d "$db" >/dev/null 2>&1 \
        && docker exec "$name" psql -U postgres -d "$db" -c 'select 1' >/dev/null 2>&1; then break; fi
      sleep 1
    done
    DATABASE_URL="$url" npx prisma migrate deploy
    echo "$kind database ready: $url"
    ;;
  down) docker rm -f "$name" >/dev/null 2>&1 || true; echo "$kind database stopped" ;;
  url)  echo "$url" ;;
  *) echo "usage: scripts/db.sh <up|down|url> [dev|test]" >&2; exit 2 ;;
esac
