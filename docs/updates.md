# Versions and updates

Flutter Fidelity versions the CLI, plugin and four bundled skills together.
`package.json` owns the release version; the lockfile, both plugin manifests and
each skill's `metadata.version` must match it. CLI `--version` and the MCP
handshake read that same package version. Comparison policies and evidence schema versions
remain separate. Release 0.3.0 introduced comparison policy v3. Release 0.4.0
adds repair policy/session v2 and optional source-bound capture v3; comparison
policy v3 and its numeric thresholds remain unchanged. `bestValidReport` now
requires all nonvisual checks passed, and legacy active repair sessions must
finish with their matching tool release without a budget reset. Read
[compatibility notes](workflow.md#comparison-and-repair) and
[source binding](workflow.md#source-checkpoint-binding) before updating consumers.

## Users: check and update a source installation

Run these commands in the Flutter Fidelity clone used by your local installation:

```sh
npm run update:check
npm run update
node dist/cli.js --version
```

`update:check` contacts the configured Git upstream and reports the version and
commit available there. It updates Git fetch metadata, but leaves source files
and dependencies unchanged. Exit status is 0 for a successful check, whether or
not new commits exist, and 1 for a failure.

`update` fetches the same tracking branch, accepts only a fast-forward, runs
`npm ci` and then `npm run check` (version consistency, build and tests). It uses
the configured branch/remote, so forks keep their own source. The normal `main`
tracking branch is a **source channel** and may include unreleased changes; this
command does not claim to select the latest published release or query npm.

Local modified/untracked files, local commits that are not in the upstream,
missing upstreams and detached/pinned checkouts stop automatic updates. Commit
or move your work yourself before retrying. The updater never stashes, resets,
rebases, deletes screenshots, changes your Flutter SDK or edits host settings.
Ignored `.fidelity` evidence stays in place. If installation/checks fail after
the fast-forward, it reports the old/new revisions and leaves the checkout for
inspection. Fix the failure and rerun `npm run update`; validation runs even
when the source is already current. Do not treat a failed update as verified.

Restart a directly configured MCP process after updating. For a local Codex
plugin, refresh/reload through the host so it recopies the updated source, and
restart the desktop app as required by its local-plugin flow. Updating this
clone does not directly update an installed host cache. Do not edit cache files.
See the [official local-plugin update guidance](https://developers.openai.com/plugins/build/plugins).

If your older clone does not have these commands yet, bootstrap once with:

```sh
git pull --ff-only
npm ci
npm run check
```

First ensure your checkout is clean and its upstream is the intended source.
The new commands become available only after the maintainer publishes these
source changes. A standalone ZIP/npm package without Git history cannot use
the source updater; replace it with a complete released bundle using your
original installation method. Keep `skills/`, `docs/`, tools and manifests
together; copying only SKILL.md breaks its relative references.

## Pin or return to a released version

Releases use immutable tags named `vMAJOR.MINOR.PATCH`. To pin a release, clone
an existing tag into a separate directory, build it, and point your local
installation at that directory. Replace `vX.Y.Z` with a tag actually present
in the repository:

```sh
git clone --branch vX.Y.Z https://github.com/rebink/flutter-fidelity.git flutter-fidelity-pinned
cd flutter-fidelity-pinned
npm ci
npm run check
```

Use the same process with a previous tag for rollback, retaining the existing
installation until the replacement passes checks. Tagged clones are detached;
the automatic updater deliberately leaves them pinned. No tag is created by
`release:version`, and 0.4.0 is not available remotely until explicitly released.

## Maintainers: prepare the next release

Use stable semantic versions: patch for compatible fixes/clarifications, minor
for added compatible capabilities, and major for incompatible public contracts.
During 0.x development, document any compatibility break prominently, even if
released in a minor version. Keep the four skills on one release train because
they share documentation and tooling.

```sh
npm run release:version -- 0.4.1
```

This updates the canonical version, lockfile, both plugin manifests and skill
frontmatter together. It does not commit, tag, install globally, push or publish.
If package.json was edited separately, use `npm run version:sync`; use
`npm run version:check` to detect drift without writing. `npm run check` and
the packaging hook also check consistency. Add release notes and compatibility
details to CHANGELOG.md, then run:

```sh
npm run check
npm pack --dry-run
```

Follow AGENTS.md for additional image/policy/Dart checks when those change.
After release approval, commit the intended files, create the matching annotated
tag (for example `git tag -a v0.4.1 -m "Flutter Fidelity 0.4.1"`), and publish
the source/tag through the repository's release process. Never move an existing
release tag. Publishing remains a separate explicit action; these scripts do
not publish to GitHub, npm or a plugin directory. Keep normal UI building free
of automatic update checks or silent instruction changes mid-task.
