#!/usr/bin/env bash
# Move the floating major tag (v1, v2, …) to the commit of the release just published.
set -euo pipefail

version="${1:?usage: update-major-action-ref.sh <semver>}"
major="${version%%.*}"
tag="v${major}"

git tag -fa "$tag" -m "Track latest v${major}.x (${version})"
git push origin "refs/tags/${tag}" --force

echo "Updated ${tag} to track ${version}"
