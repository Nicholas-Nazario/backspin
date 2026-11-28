#!/usr/bin/env bash
set -euo pipefail

repo="Nicholas-Nazario/backspin"
discogs="https://data.discogs.com/"
archive="discogs-masters.sqlite.gz"
checksum="$archive.sha256"

update_fly_snapshot() {
  local branch="discogs-masters-$snapshot-fly"
  local config_path="repos/$repo/contents/fly.toml"
  local refs_path="repos/$repo/git"
  local main_sha branch_sha config pinned pr blob_sha updated content

  main_sha=$(gh api "$refs_path/ref/heads/main" --jq '.object.sha')
  config=$(gh api "$config_path?ref=$main_sha" -H 'Accept: application/vnd.github.raw+json')
  pinned=$(printf '%s\n' "$config" |
    sed -nE 's/^[[:space:]]*DISCOGS_MASTERS_SNAPSHOT = "([0-9]{8})"$/\1/p')
  if [[ ! "$pinned" =~ ^[0-9]{8}$ ]]; then
    echo "Could not read the pinned Discogs snapshot from fly.toml on main." >&2
    return 1
  fi
  if [[ "$pinned" == "$snapshot" || "$pinned" > "$snapshot" ]]; then
    echo "fly.toml already pins $pinned."
    return
  fi

  pr=$(gh pr list --repo "$repo" --base main --head "$branch" --state open --json url --jq '.[0].url // empty')
  if [[ -n "$pr" ]]; then
    echo "Snapshot update PR already open: $pr"
    return
  fi

  # Reuse the branch if an earlier run stopped before opening the PR.
  branch_sha=$(gh api "$refs_path/matching-refs/heads/$branch" \
    --jq ".[] | select(.ref == \"refs/heads/$branch\") | .object.sha")
  if [[ -z "$branch_sha" ]]; then
    branch_sha=$(gh api --method POST "$refs_path/refs" \
      -f ref="refs/heads/$branch" -f sha="$main_sha" --jq '.object.sha')
  fi
  config=$(gh api "$config_path?ref=$branch_sha" -H 'Accept: application/vnd.github.raw+json')
  if ! printf '%s\n' "$config" | grep -Eq "^[[:space:]]*DISCOGS_MASTERS_SNAPSHOT = \"$snapshot\"$"; then
    blob_sha=$(gh api "$config_path?ref=$branch_sha" --jq '.sha')
    updated=$(printf '%s\n' "$config" |
      sed -E "s/^([[:space:]]*DISCOGS_MASTERS_SNAPSHOT = \")[0-9]{8}(\")$/\1$snapshot\2/")
    if [[ "$updated" == "$config" ]]; then
      echo "Could not update the snapshot pin on $branch." >&2
      return 1
    fi
    content=$(printf '%s\n' "$updated" | base64 | tr -d '\n')
    gh api --method PUT "$config_path" -f branch="$branch" -f sha="$blob_sha" \
      -f message="Pin Discogs masters snapshot $snapshot" -f content="$content" >/dev/null
  fi

  gh api --method POST "repos/$repo/pulls" -f base=main -f head="$branch" \
    -f title="Pin Discogs masters snapshot $snapshot" \
    -f body="Update the Fly build to use the published [Discogs masters snapshot $snapshot](https://github.com/$repo/releases/tag/$tag)." \
    --jq '.html_url'
}

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

if release=$(gh release view "$tag" --repo "$repo" --json isDraft,isPrerelease,assets --jq '
  if .isDraft then "draft"
  elif (.isPrerelease | not) and
       ([.assets[] | select(.state == "uploaded") | .name] |
        index("discogs-masters.sqlite.gz") != null and
        index("discogs-masters.sqlite.gz.sha256") != null)
  then "published"
  else "incomplete"
  end' 2>&1); then
  case "$release" in
    published)
      echo "$tag is already published."
      update_fly_snapshot
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
update_fly_snapshot
