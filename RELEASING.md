# Releasing

The first npm publication and later releases use different paths:

1. Issue #36 bootstraps the existing `v0.3.0` tag through one human-only npm
   publication with login and 2FA.
2. After `v0.3.0` exists on npm, configure trusted publishing. Versions after
   `v0.3.0` are published from `.github/workflows/release.yml` when a new `v*`
   tag is pushed.

The release workflow uses GitHub OIDC and must not use a long-lived npm publish
token.

## Bootstrap v0.3.0 manually

The `v0.3.0` tag already exists and points to the intended release commit. Do
not recreate, move, or force-push it, and do not publish the newer `main` branch
as version `0.3.0`.

Prepare an isolated detached worktree at that exact tag and verify its package:

```sh
git fetch origin tag v0.3.0
BOOTSTRAP_ROOT="$(mktemp -d /tmp/winamp-v0.3.0.XXXXXX)"
BOOTSTRAP_WORKTREE="$BOOTSTRAP_ROOT/worktree"
git worktree add --detach "$BOOTSTRAP_WORKTREE" v0.3.0
cd "$BOOTSTRAP_WORKTREE"
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:run
pnpm build
pnpm check:dist
npm pack --dry-run
```

An agent must stop here. KK must confirm control of the `@walkswithaswagger`
npm scope, log in, publish the package, and complete the interactive 2FA prompt:

```sh
npm login
npm publish --access public
```

Do not create or push a tag during this bootstrap. After publication, verify the
exact public package and repository metadata before changing npm settings:

```sh
npm view @walkswithaswagger/winamp@0.3.0 --json
```

## One-time trusted publisher setup

Only after the `npm view` check confirms `0.3.0`, an npm package owner must
configure the trusted publisher under **Package settings → Trusted publishing
→ GitHub Actions** with:

- Organization or user: `WalksWithASwagger`
- Repository: `winamp`
- Workflow filename: `release.yml`
- Environment: leave blank
- Allowed action: `npm publish`

The workflow filename is case-sensitive and must include the `.yml` extension.
The release job runs on a GitHub-hosted runner with `id-token: write` and npm
11.18.0, which satisfies npm's trusted-publishing requirements. See npm's
[trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/)
for the current registry requirements.

After trusted publishing is active, set package publishing access to require
2FA and disallow traditional tokens. Confirm the GitHub Actions secret list has
no npm publication secret or equivalent long-lived credential:

```sh
gh secret list --app actions
```

The tag-triggered OIDC workflow is for releases after `v0.3.0`; it does not
bootstrap or republish `v0.3.0`.

## Prepare a later release

Start from an up-to-date `main` branch with a clean working tree. Set `VERSION`
to the new semantic version without a leading `v`:

```sh
VERSION=0.3.1
git switch main
git pull --ff-only
pnpm install --frozen-lockfile
npm version "$VERSION" --no-git-tag-version
```

Move the relevant entries from `Unreleased` in `CHANGELOG.md` into a dated
section for the new version. Update the comparison links at the bottom of the
changelog, then commit those version and changelog changes through a pull
request.

Before merging the release pull request, run:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:run
pnpm check:dist
pnpm check:package
```

All commands and the pull request's CI checks must pass. Confirm that
`package.json` contains the intended version and that the committed `dist/`
matches the source.

## Tag and publish a later release

After the release pull request is merged, update local `main`, verify the merged
version, then create and push an annotated tag that exactly matches it:

```sh
VERSION=0.3.1
git switch main
git pull --ff-only
test "$(node -p "require('./package.json').version")" = "$VERSION"
git tag -a "v$VERSION" -m "v$VERSION"
git push origin "v$VERSION"
```

Pushing the tag starts the release workflow. Do not create the tag until the npm
trusted publisher is configured for `release.yml`.

## Verify the release

Wait for the tag-triggered `Release` workflow to pass, then verify the registry
metadata and install the exact version in a clean temporary consumer project:

```sh
VERSION=0.3.1
npm view "@walkswithaswagger/winamp@$VERSION" version dist-tags repository
cd "$(mktemp -d)"
npm init -y
npm install "@walkswithaswagger/winamp@$VERSION" react react-dom
```

Confirm that the registry reports the intended version and that the clean
installation succeeds. If publishing fails with `ENEEDAUTH`, verify the npm
trusted-publisher owner, repository, and exact `release.yml` filename before
retrying; do not add a publish token to the workflow.
