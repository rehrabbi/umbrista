# Contributing

Umbrista is a personal design and portfolio project, so outside pull requests are not expected.
The conventions below are written down because the workflow is part of what the project shows.
The full working agreement is in [`docs/WAYS-OF-WORKING.md`](docs/WAYS-OF-WORKING.md); where the
two overlap, that file wins.

## Local setup

You need Node 24 (the version in [`.nvmrc`](.nvmrc)) and npm. Setup and the everyday scripts are in
the [README](README.md).

```bash
npm ci
npx playwright install chromium   # once, for the end-to-end test
```

## Branching model

`main` ← `develop` ← `task/<n>-<slug>`.

- `main` is protected and holds releases only.
- `develop` is the integration branch.
- Each task of the plan is one branch named `task/<n>-<slug>` in lowercase kebab case, cut from
  `develop`, with one detailed pull request into `develop`.
- Pull requests are merged with a merge commit once checks are green.
- Merged branches are never deleted. On merge the branch is renamed `merged/task-<n>-<slug>`.

## Pull requests

Use the pull request template. One concern per pull request. Show before and after screenshots
for interface changes, and check them with the keyboard and with reduced motion on.

## Commit messages

A conventional subject, a blank line, then a body of short bullet points.

```
feat: add the reservation form

- validate party size and time against the café's hours
- show a confirmation that says Umbrista is a design project
```

- Types: `feat`, `fix`, `docs`, `test`, `ci`, `build`, `chore`.
- Describe the change and its effect, not the internal approach.
- One concern per commit.
- No `Co-Authored-By` or other trailers, and no mention of the tools used to write the work.

## Before opening a pull request

Run what CI runs so nothing fails after the fact:

```bash
npm run lint        # oxlint
npm run typecheck   # tsc -b
npm test            # Vitest unit tests
npm run build       # type check, then the production build
npm run e2e         # Playwright smoke test against the built site
```

A clean build only proves the code compiles, so also open the page and use what you changed.
Then check that no secret, `.env` file or build artifact is in the diff and that the documentation
in `docs/` still matches reality.

## Code of conduct and ownership

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
[`.github/CODEOWNERS`](.github/CODEOWNERS) names the maintainer, who is requested for review
automatically.

## Security and data requests

Report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md). To see or delete
stored data, use the "Data request" issue template and put no personal details in the issue.
