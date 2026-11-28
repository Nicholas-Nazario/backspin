#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! ${1:-} =~ ^[0-9]{8}$ ]]; then
  echo "Usage: npm run deploy:discogs-masters -- YYYYMMDD" >&2
  exit 1
fi

exec fly deploy --build-arg "DISCOGS_MASTERS_SNAPSHOT=$1"
