# Releasing

Releases are published to npm from `.github/workflows/release.yml` when a `v*`
tag is pushed. The workflow uses npm trusted publishing through GitHub OIDC; it
must not use a long-lived npm publish token.

## One-time trusted publisher setup

The package must already exist on npm before trusted publishing can be enabled.
An npm package owner must configure the trusted publisher under
**Package settings → Trusted publishing → GitHub Actions** with:

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

## Prepare a release

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

## Tag and publish

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
