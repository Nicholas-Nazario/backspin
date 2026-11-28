#!/usr/bin/env bash
set -euo pipefail

repo="Nicholas-Nazario/backspin"
discogs="https://data.discogs.com/"
archive="discogs-masters.sqlite.gz"
checksum="$archive.sha256"

if [[ $# -gt 1 || (${1:-} != "" && ! ${1:-} =~ ^[0-9]{8}$) ]]; then
  echo "Usage: npm run refresh:discogs-masters -- [YYYYMMDD]" >&2
  exit 1
fi

snapshot="${1:-}"
if [[ -z "$snapshot" ]]; then
  year=$(date -u +%Y)
  for listing_year in "$year" "$((year - 1))"; do
    listing=$(curl -fsSL --retry 3 "${discogs}?prefix=data%2F${listing_year}%2F")
    snapshot=$(printf '%s\n' "$listing" |
      sed -nE 's@.*href="\?download=data%2F[0-9]{4}%2Fdiscogs_([0-9]{8})_masters\.xml\.gz".*@\1@p' |
      LC_ALL=C sort | tail -1)
    [[ -z "$snapshot" ]] || break
  done
fi
if [[ -z "$snapshot" ]]; then
  echo "Discogs listed no masters dumps. Supply a snapshot date to download it directly." >&2
  exit 1
fi

tag="discogs-masters-$snapshot"
gh auth status --hostname github.com >/dev/null 2>&1 || {
  echo "Sign in to GitHub with gh auth login before publishing." >&2
  exit 1
}

if release=$(gh release view "$tag" --repo "$repo" --json isDraft,assets --jq '
  if .isDraft then "draft"
  elif ([.assets[].name] | index("discogs-masters.sqlite.gz")) != null and
       ([.assets[].name] | index("discogs-masters.sqlite.gz.sha256")) != null
  then "published"
  else "incomplete"
  end' 2>&1); then
  case "$release" in
    published)
      echo "$tag is already published."
      exit 0
      ;;
    incomplete)
      echo "$tag is public and missing expected assets. Inspect the release before retrying." >&2
      exit 1
      ;;
  esac
elif [[ "$release" == *"release not found"* ]]; then
  release="missing"
else
  printf '%s\n' "$release" >&2
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
dump="discogs_${snapshot}_masters.xml.gz"
base="${discogs}?download=data%2F${snapshot:0:4}%2Fdiscogs_${snapshot}"

echo "Downloading and verifying Discogs masters for $snapshot."
curl -fsSL --retry 3 "${base}_CHECKSUM.txt" -o "$work/checksums"
curl -fsSL --retry 3 "${base}_masters.xml.gz" -o "$work/$dump"
(
  cd "$work"
  awk -v name="$dump" '
    $2 == name && length($1) == 64 && $1 !~ /[^0-9a-fA-F]/ {printf "%s  %s\n", $1, name; found++}
    END {if (found != 1) exit 1}
  ' checksums > dump.sha256
  shasum -a 256 -c dump.sha256
)

npm run import:discogs-masters -- "$snapshot" "$work/$dump" "$work/discogs-masters.sqlite"
(
  cd "$work"
  gzip -n discogs-masters.sqlite
  shasum -a 256 "$archive" > "$checksum"
)

echo "Publishing $tag."
if [[ "$release" == "missing" ]]; then
  gh release create "$tag" --repo "$repo" --target main --draft --latest=false \
    --title "Discogs masters $snapshot" \
    --notes "Catalog index derived from the [Discogs masters dump](https://data.discogs.com/)."
fi
gh release upload "$tag" --repo "$repo" --clobber "$work/$archive" "$work/$checksum"
gh release edit "$tag" --repo "$repo" --draft=false --latest=false
