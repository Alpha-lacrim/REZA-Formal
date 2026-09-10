# Codex Remediation Program

Baseline tag:
pre-codex-remediation-2026-09-10

| Program metadata | Value |
| --- | --- |
| Program | REZA-Formal Codex Remediation |
| Program status | Initialized locally; remote publication pending |
| Baseline commit | `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` |
| Baseline tag | `pre-codex-remediation-2026-09-10` (annotated) |
| Integration branch | `codex/remediation-program` |
| Current batch | Batch 0 - Git/bootstrap |
| Batch status | In progress |
| Batch branch | `codex/remediation-program` (one-time bootstrap) |
| Batch start commit | `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` |
| Integration branch SHA | Baseline above; bootstrap commit pending |
| Program bootstrap commit | Pending documentation commit |
| Final batch commit | Pending verification record |
| Integration merge commit | Not applicable: Batch 0 commits directly to integration; no merge into `main` |
| Audit IDs handled | None; no application audit or refactoring in Batch 0 |
| Verification performed | Git checks and PR metadata listed below |
| Remaining risks | Remote publication/deletion pending; existing stash contents not reviewed |
| Next batch | Batch 1 - Forensic audit (pending) |

## Batch 0 - Git/bootstrap

### Verified starting state and preservation

- Repository root: `C:\Users\Pouyan\REZA_Formal_Website\REZA-Formal`; origin fetch/push target: `https://github.com/Alpha-lacrim/REZA-Formal.git`.
- Started on `feature/complete-commerce` at `dc225f5f344389afdbe9448537e56589ac861f1a`. There were no tracked or staged changes; this program document was the only untracked file.
- The original program document was carried unchanged onto integration before metadata edits. Its SHA-256 was `434e19a67f5d838453e5fa7e99e79dd9ad469e30411c48606a00368ebbe0a9b3`; an exact backup is retained outside the repository at `..\CODEX_PROGRAM.batch-0.original.md`. The original batch roadmap and rules are preserved; the old proposed baseline tag name was corrected to the authorized name above.
- Local `main` remains at `449c5a142c0f840b55b468d88e6b17f8d7ff329d` (zero local-only commits, six behind verified origin). Local `dev` remains at `f76f232ab658e836f594fb9dc40ff53b1ddececf`.
- Existing `stash@{0}` at `bd371510428d76e6587eaa20913c23bfd12af3c8` is preserved without applying or inspecting its contents. No new stash was created. Ignored local files were not changed.
- No pre-existing tag or integration branch existed locally or remotely. `main` is human-owned and its local/remote history is unchanged by this bootstrap.

### Historical commerce verification

- `git fetch --prune origin` succeeded with network access outside the sandbox. Remote heads were independently confirmed with `git ls-remote --heads --tags origin`.
- Verified original `origin/main`: `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e`; commerce tip: `dc225f5f344389afdbe9448537e56589ac861f1a`.
- `git merge-base --is-ancestor origin/feature/complete-commerce origin/main` returned 0. `git rev-list --left-right --count origin/main...origin/feature/complete-commerce` returned `1 0`; `git log origin/main..origin/feature/complete-commerce` was empty.
- `git diff --quiet origin/feature/complete-commerce origin/main` returned 0; diff statistics were empty. Both trees were `56307d0dec946d6d2c9619036f21ab778812003f`. No unique commits or file changes would be lost by deleting the branch references.
- Baseline parents are local-main starting commit `449c5a142c0f840b55b468d88e6b17f8d7ff329d` and the commerce tip. The merge message names PR #1. [GitHub PR #1](https://github.com/Alpha-lacrim/REZA-Formal/pull/1) independently reports merged into `main` with that same head and merge SHA.

### Bootstrap results

| Item | Result |
| --- | --- |
| Local commerce branch | Deleted safely with `git branch -d feature/complete-commerce` after switching to integration |
| Remote commerce branch | Pending authorized deletion |
| Baseline tag | Created locally; annotated type and target verified; push pending |
| Integration branch | Created directly from verified baseline; documentation commit and push pending |
| Unrelated user work | Local `main`, `dev`, existing stash, and ignored files preserved; no unrelated work included |
| Unresolved Git issues | Remote push and deletion not yet verified |

Batch 0 changes are limited to this document and the session entry required by `AGENTS.md` in `Handoff.md`. Application checks are not run because application files do not change. Prior application/deployment follow-ups in `Handoff.md` remain open for the appropriate future batches.

After Batch 0 is complete, start Batch 1 on `codex/batch-01-forensic-audit`, created from `codex/remediation-program`. Do not start Batch 1 during this session.

## Status

- [ ] Batch 0 — Git/bootstrap
- [ ] Batch 1 — Forensic audit
- [ ] Batch 2 — Critical correctness
- [ ] Batch 3 — Tests and CI
- [ ] Batch 4 — Backend architecture
- [ ] Batch 5 — API/auth frontend
- [ ] Batch 6 — Frontend state
- [ ] Batch 7 — Admin/media
- [ ] Batch 8 — Performance/database
- [ ] Batch 9 — Security
- [ ] Batch 10 — Production infrastructure
- [ ] Batch 11 — UX/accessibility/SEO
- [ ] Batch 12 — Final architecture review

## Rules

- One batch per Codex session.
- One dedicated branch per batch.
- No unrelated cleanup.
- Every bug fix requires regression coverage.
- Every architectural change must preserve existing behaviour.
- P0/P1 findings take priority over refactoring.
- Never use production data for automated testing.
- Never expose secrets.
- Review migrations manually.
- Update audit status after every batch.
- Merge only after quality gates pass.
- Create batch branches from `codex/remediation-program`; record start/final/merge commits and verification before moving to the next batch.
- Keep remediation commits off human-owned `main`; merging integration into `main` requires a separate owner-authorized action.

## Current blockers

None.

## Owner decisions

Record decisions here that Codex cannot safely make itself.

## Completed batches

Record:
- Batch
- Status
- Branch
- Start commit
- End commit
- Merge commit
- Audit IDs handled
- Verification performed
- Remaining risks
- Next batch

## Example

| Batch | Status | Branch | Start | Final | Merge | Findings |
|---|---|---|---|---|---|---|
| 01 | Complete | codex/batch-01-forensic-audit | abc123 | def456 | 789abc | Audit |
| 02 | In progress | codex/batch-02-critical-correctness | ... | — | — | FE-001, SEC-002 |
