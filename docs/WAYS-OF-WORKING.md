# Ways of Working

> **Read this first at the start of every session, especially on a new machine.** It is the
> working agreement for Umbrista: who does what, how work flows, and what always needs the
> owner first. Then read [`PROJECT-STATE.md`](PROJECT-STATE.md).

## 1. Roles

- **The builder** writes the code and explains it: what it does, why it is built that way, and
  what it connects to. The builder proposes, implements, tests and documents, one reviewable
  task at a time.
- **The owner** (`@rehrabbi`) reviews every pull request, approves the checkpoints in section 2,
  and makes the calls that are theirs to make (section 5). The owner may review as closely as
  they like; merging into `develop` on green does not wait for them (section 4).

The design is [`docs/specs/2026-11-26-umbrista-design.md`](specs/2026-11-26-umbrista-design.md)
and the plan is [`docs/plans/2026-11-26-umbrista.md`](plans/2026-11-26-umbrista.md).
Work proceeds task by task from the plan. A change that the design does not cover is proposed to
the owner first; it is not decided silently.

## 2. Owner checkpoints

The owner looks at, and approves, these before work moves past them:

1. The design document.
2. The plan.
3. The **brand board**: name treatment, logo, palette, type, city name and price format, favicon
   and voice, side by side, shown in the browser.
4. A **landing prototype**: the first chapter of the scroll journey and the living background
   running, to judge the feel before the rest is built.
5. Each pull request (reviewed as closely as the owner likes; merging on green is allowed).
6. The **launch**: the release from `develop` to `main` and the production deploy.

## 3. Branch model

`main` ← `develop` ← `task/<n>-<slug>`

- `main` is protected and holds releases only. Changes reach it through a pull request from
  `develop`, with required checks, merge commits only, and the branch up to date.
- `develop` is the integration branch and carries the build.
- Every task is its own branch, `task/<n>-<slug>` (for example `task/3-design-tokens`), cut from
  `develop`, and its own detailed pull request into `develop`.
- Pull requests are merged with a **merge commit**, on green checks.
- After merging, the branch is renamed to `merged/task-<n>-<slug>` and pushed. **Branches are
  never deleted**, so every task's history stays in the repository.
- Releases go from `develop` to `main` with a tag and release notes. The first public release is
  v1.0.0, once the whole site is built.

## 4. Standing approval

The builder does the following without asking each time, then reports what was done (branch,
commit hashes, pull request link):

- committing,
- pushing task branches,
- opening pull requests,
- merging a pull request into `develop` once its checks are green,
- renaming a merged task branch to `merged/task-<n>-<slug>`.

Before every commit the builder shows `git status`, checks that the diff holds only the
intended work and no secrets, `.env` files, or build artifacts, and confirms the docs match
reality.

## 5. Always ask the owner first

Stop and wait for a clear yes before any of these:

- force-pushing, or rewriting history;
- deleting any branch (the rename into `merged/` is the only allowed move);
- changing repository settings or branch protection;
- tagging or publishing a release;
- a production deploy;
- merging into `main`;
- adding a dependency that is not on the approved list in the plan's Global Constraints;
- creating accounts or cloud resources;
- any Higgsfield generation (below).

**Higgsfield generation gate.** Nothing is generated without the owner's go for that one asset.
First the builder proposes it, covering: what it is, why it is needed, where it will be used, the
prompt or brief, the model, and the estimated credit cost. Only after the owner says go is it
generated, and then it is recorded in `docs/brand.md` (what, where used, model, date).

## 6. Commits

- A conventional subject (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `build:`, `chore:`), a blank
  line, then short `- ` bullets.
- Describe the change and its effect, not the internal approach.
- One concern per commit. Keep documentation in its own `docs:` commit, apart from code.
- Use the repository's configured git identity. If none is set, stop and tell the owner; never
  invent one.
- **No AI attribution.** No `Co-Authored-By` or other trailers, and no mention of the tools used
  to write the work, in commits, pull requests, code, comments or docs.

## 7. Everything is free, nothing secret is committed

- Every tool and service is free. Flag any possible cost before incurring it.
- Never print or commit secrets: no tokens, passwords, connection strings or `.env` files.
  Secrets live only in Vercel's environment variables and local, git-ignored `.env` files; the
  repository carries a `.env.example` with placeholders.
- Original assets only (see the design, section 3).

## 8. Resuming on a new machine

1. Read this file, then [`PROJECT-STATE.md`](PROJECT-STATE.md).
2. Fetch and look for unfinished work before trusting `develop`:

   ```bash
   git fetch origin
   git status
   git branch -r --no-merged develop
   ```

   A branch that prints here (other than `main`) is unfinished work, not an archive; archived
   branches are named `merged/*`. Switch to it and read its `docs/PROJECT-STATE.md`: the stage in
   progress and the exact next step are recorded there.
3. Expect an empty database. The Neon database never travels with the clone; `PROJECT-STATE.md`
   says how to bring one up once there is a backend.
4. Run the verification commands in [`CONTRIBUTING.md`](../CONTRIBUTING.md) before claiming
   anything works. A clean build only proves the code compiles.
5. The repository is the source of truth: `docs/` must carry everything needed to resume.
