---
name: ship
description: Build, verify, commit, and push Calcar changes to main. Runs the Cloudflare bundle build first to catch deployment breaks.
allowed-tools:
  - read
  - exec
  - grep
  - glob
triggers:
  - user
---

# Ship Calcar Changes

Build, verify, and ship the current working tree to `main`. This is a solo-dev workflow — it commits all tracked changes and pushes directly to main.

## Steps

1. **Sanity check the working tree:**
   ```bash
   git status
   git diff --stat
   git log --oneline -5
   ```
   If there is nothing to commit, stop and report that.

2. **Build for production** (this runs `astro build` then the custom `bundle-worker` esbuild step that produces `dist/client/_worker.js`):
   ```bash
   npm run build
   ```
   If the build fails, STOP. Do not commit a broken build. Report the error and suggest a fix. The most common break is the Cloudflare adapter / `bundle-worker` step — see the `/calcar-architecture` skill.

3. **Stage and commit** using conventional commit format. Inspect `git diff --staged` first if anything looks unexpected. Suggested message format:
   ```
   <type>: <imperative summary>

   <optional body explaining why>

   Generated with [Devin](https://devin.ai)

   Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
   ```
   Use `git commit -m "$(cat <<'EOF' ... EOF)"` for multi-line messages.

4. **Push to main:**
   ```bash
   git push origin main
   ```
   If the push is rejected (non-fast-forward), run `git pull --rebase origin main` and retry. Do NOT force-push.

5. **Report** what was committed (short summary + hash) and that the push succeeded.

## Rules
- NEVER amend or rewrite already-pushed history.
- NEVER push if the build failed.
- Do not commit secrets — `.env` is gitignored; double-check no key material is in the diff.
- If pre-commit hooks modify files, re-stage and retry the commit.
