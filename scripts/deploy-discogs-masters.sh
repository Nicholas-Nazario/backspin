#!/usr/bin/env bash
set -euo pipefail

if [[ $# -gt 1 || ($# -eq 1 && ! ${1:-} =~ ^[0-9]{8}$) ]]; then
  echo "Usage: npm run deploy:discogs-masters -- [YYYYMMDD]" >&2
  exit 1
fi

snapshot="${1:-}"
if [[ -z "$snapshot" ]]; then
  snapshot=$(gh api --paginate 'repos/Nicholas-Nazario/backspin/releases?per_page=100' --jq '
    .[] | select(.draft == false and .prerelease == false)
    | select(.tag_name | test("^discogs-masters-[0-9]{8}$"))
    | select([.assets[] | select(.state == "uploaded") | .name]
        | index("discogs-masters.sqlite.gz") != null
          and index("discogs-masters.sqlite.gz.sha256") != null)
    | .tag_name | ltrimstr("discogs-masters-")
  ' | LC_ALL=C sort | tail -1)
  if [[ -z "$snapshot" ]]; then
    echo "No complete published Discogs masters snapshot found. Run npm run refresh:discogs-masters first." >&2
    exit 1
  fi
fi

echo "Deploying with Discogs masters snapshot $snapshot."
exec fly deploy --build-arg "DISCOGS_MASTERS_SNAPSHOT=$snapshot"
