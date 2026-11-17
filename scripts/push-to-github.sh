#!/usr/bin/env bash
# Push this repository to https://github.com/rafia22110/maestro-ai-agent-games-2026
#
# The token is never written to .git/config, the shell history or the reflog: it is used once,
# inline, with the credential helper disabled.
#
#   GITHUB_TOKEN=github_pat_xxx ./scripts/push-to-github.sh
#   GITHUB_TOKEN=github_pat_xxx ./scripts/push-to-github.sh --dry-run
#
# The token needs "Contents: read and write" on that one repository (fine-grained token).
set -euo pipefail

REMOTE_HTTPS="${REMOTE_HTTPS:-https://github.com/rafia22110/maestro-ai-agent-games-2026.git}"
REMOTE_PATH="${REMOTE_HTTPS#https://github.com/}"
BRANCH="${BRANCH:-main}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

cd "$(dirname "$0")/.."

if [ -z "$(git status --porcelain)" ]; then
  echo "working tree clean"
else
  echo "uncommitted changes present — commit them first" >&2
  git status --short >&2
  exit 1
fi

if [ "${DRY_RUN}" = "1" ]; then
  echo "dry run: would push branch '${BRANCH}' and all tags to ${REMOTE_HTTPS}"
  git log --oneline -1
  git tag --list | sed 's/^/  tag: /'
  exit 0
fi

: "${GITHUB_TOKEN:?set GITHUB_TOKEN to a fine-grained token with Contents: read and write}"

AUTHED="https://x-access-token:${GITHUB_TOKEN}@github.com/${REMOTE_PATH}"

echo "pushing ${BRANCH} + tags to https://github.com/${REMOTE_PATH}"
git -c credential.helper= push "$AUTHED" "refs/heads/${BRANCH}:refs/heads/${BRANCH}"
git -c credential.helper= push "$AUTHED" --tags

# Configure a token-free origin so later fetches and pushes use git's own credential helper.
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_HTTPS"
else
  git remote add origin "$REMOTE_HTTPS"
fi
echo "done — origin is ${REMOTE_HTTPS} (no token stored)"
