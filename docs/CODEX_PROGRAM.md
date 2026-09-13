# Codex Remediation Program

Baseline tag:
pre-codex-remediation-2026-09-10

| Program metadata | Value |
| --- | --- |
| Program | REZA-Formal Codex Remediation |
| Program status | Batch 1 audit baseline established; next planned work is Batch 2 |
| Baseline commit | `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` |
| Baseline tag | `pre-codex-remediation-2026-09-10` (annotated) |
| Integration branch | `codex/remediation-program` |
| Current batch | Batch 1 - Forensic audit |
| Batch status | Audit complete; commit/merge provenance resolved by the Batch 1 commands below |
| Batch branch | `codex/batch-01-forensic-audit` |
| Batch start commit | `94d665881e3e929c41121d057385c28f822002fe` |
| Integration branch SHA | Batch 1 merge lookup below; Batch 0 ended at `94d665881e3e929c41121d057385c28f822002fe` |
| Program bootstrap commit | `b638e63813c972fe096a7830131a233a69606416` - `docs(codex): initialize remediation program` |
| Final batch commit | Batch 1 audit commit lookup below; subject `docs(audit): establish remediation baseline` |
| Integration merge commit | Local non-fast-forward merge into `codex/remediation-program`, resolved below; no `main` merge or remote push in Batch 1 |
| Audit IDs handled | 43 recorded, all Open; none remediated. [Canonical register](audit/AUDIT_INDEX.md) |
| Verification performed | Isolated Django check/drift/50 tests, frontend typecheck/build, Compose config, disposable probes and documentation review; exact results in [testing audit](audit/TESTING_CI_AUDIT.md) |
| Remaining risks | Eight P1 records, SQL Server/browser/deployment evidence gaps, dependency advisories and unresolved provider/policy/history obligations |
| Next batch | Batch 2 - Critical correctness; not started in Batch 1 |

## Batch 1 - Forensic audit

### Scope and results

- Started September 10, 2026 from the clean Batch 0 integration tip above. Resumed September 13 on the same branch/commit with the audit drafts preserved. All application files, dependencies, migrations, local `main`/`dev`, the existing stash and baseline tag are unchanged.
- Created all ten requested `docs/audit/` documents and [ROADMAP.md](ROADMAP.md); updated this program and Handoff. `Codex.md` receives only durable navigation/authority facts; `AGENTS.md` is unchanged.
- Traced authentication, catalog/variants, cart/wishlist, quotes/checkout, order cancellation, payments/refunds/returns, staff/native admin, uploads/content, SQL schema/migrations, Docker/Nginx, CI and deployment assumptions.
- Recorded **43 stable findings: P0 0, P1 8, P2 33, P3 2** and verdicts for all 18 supplied hypotheses. Five backend defects and one upload validation defect are reproduced at P1; DB-002 is an unverified SQL concurrency risk and TEST-003 is a coverage gap. Architecture size/coupling is maintenance debt, not a confirmed application defect.
- September 10 checks: isolated Django check/drift and 50 tests passed; frontend typecheck and production build passed (build required an approved sandbox-access retry); Compose config passed with an unreadable global Docker-config warning. npm audit completed with six affected package entries; Python advisory tooling was unavailable. The dates/results are preserved, not represented as September 13 reruns.
- No production SQL/data access, SQL Server concurrency test, live Docker launch, browser/a11y run, restore drill or external provider/credential-history verification was performed. The [testing audit](audit/TESTING_CI_AUDIT.md) includes exact commands and all disposable proof scripts.

### Git completion and immutable lookup

The documentation-only merge is authorized by the Batch 1 request and follows consistency, scope and secret review. This record is included in the audit commit itself, so its own SHA and the subsequent merge SHA cannot be literal self-references. Resolve them from the fixed start point:

```powershell
# Audit commit (first branch descendant; expected subject below).
git log --reverse --format='%H %s' 94d665881e3e929c41121d057385c28f822002fe..codex/batch-01-forensic-audit

# Batch 1 integration merge (first first-parent merge after the fixed start).
git rev-list --reverse --first-parent --merges 94d665881e3e929c41121d057385c28f822002fe..codex/remediation-program | Select-Object -First 1
```

Expected subjects: `docs(audit): establish remediation baseline` and `Merge Batch 1 forensic audit`. Merge execution and final clean-worktree checks happen after committing this record; the session final response reports the observed hashes/result. Preserve these branch references for later provenance. No remote publication is part of this batch.

Quality gates: all 43 canonical records have the required attributes and matching register classification; all 18 hypothesis verdicts and roadmap assignments are present; local document links/anchors resolve; whitespace, complete diff and secret review pass; changed paths are only the requested Markdown documentation and stable project map. No finding is closed by this documentation merge.

### Remaining risks and next work

The [roadmap](ROADMAP.md) is the detailed batch schedule and owner-decision register. Batch 2 prioritizes stock authority/native admin writes, financial refund accounting, atomic order updates, gallery upload containment and the SQL evidence needed for its fixes. Defect-specific regression tests must accompany Batch 2; the broader testing foundation remains Batch 3. Do not begin Batch 2 in this continuation.

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
| Remote commerce branch | Deleted with `git push origin --delete feature/complete-commerce` after rechecking the exact tip; absence confirmed by remote heads inspection |
| Baseline tag | Pushed; local/remote tag object `f239cf0af592ddb81c8b0b1ad4873082a61a1568` peels to the verified baseline |
| Integration branch | Pushed at bootstrap SHA `b638e63813c972fe096a7830131a233a69606416`; upstream is `origin/codex/remediation-program` |
| Unrelated user work | Local `main`, `dev`, existing stash, and ignored files preserved; no unrelated work included |
| Unresolved Git issues | None at bootstrap verification; local `main` intentionally remains six commits behind origin |

### Completion verification and commit lookup

- Post-push `git status --short --branch`, `git branch -vv`, `git branch -a`, and the last 30 graph/decorated commits confirmed a clean integration worktree, matching upstream, the baseline ancestry, and absence of the local commerce branch and its remote-tracking ref.
- `git ls-remote --heads --tags origin` confirmed integration at the bootstrap SHA above, remote `main` still at the baseline, the exact annotated tag object and peeled commit, and no commerce branch.
- `git cat-file -t` returned `tag`; `git rev-parse pre-codex-remediation-2026-09-10^{commit}` returned the baseline; `git ls-tree codex/remediation-program docs/CODEX_PROGRAM.md` confirmed the program file is committed.
- `git diff --check`, staged whitespace checks, and `git diff --check 99a1ea5d1a5d3444d4063ad6c9ac29303830f14e HEAD` passed. Review of the full bootstrap diff and changed-path list confirmed only `Handoff.md` and `docs/CODEX_PROGRAM.md` changed.
- Local `main`, `dev`, and the existing stash still resolve to their recorded starting SHAs. No unrelated uncommitted work remains in the repository; the original program backup remains outside it.

This final verification record follows the published bootstrap commit. A commit cannot embed its own literal SHA; the final Batch 0 integration SHA is the first descendant of the bootstrap commit on integration, resolved by:

```powershell
git rev-list --reverse --first-parent b638e63813c972fe096a7830131a233a69606416..codex/remediation-program | Select-Object -First 1
```

The expected subject is `docs(codex): record Batch 0 verification`. The successful publication documented above concerns the bootstrap commit; publication and clean/upstream checks for this final record are performed after committing it and reported in the session's final response.

Batch 0 changes are limited to this document and the session entry required by `AGENTS.md` in `Handoff.md`. Application checks are not run because application files do not change. Prior application/deployment follow-ups in `Handoff.md` remain open for the appropriate future batches.

The historical Batch 0 handoff scheduled Batch 1 on `codex/batch-01-forensic-audit`, created from `codex/remediation-program`, for a separate session. That follow-up is fulfilled by the Batch 1 record above.

## Status

- [x] Batch 0 — Git/bootstrap
- [x] Batch 1 — Forensic audit
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

No blocker to completing the documentation-only Batch 1 merge. Production readiness remains unproven; the open audit findings and evidence gates apply before affected workflows can be relied on.

## Owner decisions

See [roadmap owner decisions](ROADMAP.md#owner-decisions-and-evidence-still-needed): refund allocation/reference policy, cancellation/returns/bespoke rules, guest/account merge semantics, effective staff capability, production hosting/TLS/SQL/media/recovery, providers, identity/session policy, public URL migration, and external credential/history evidence. None is required to record this audit; do not invent financial history or provider success while awaiting later decisions.

## Completed batches

| Batch | Status | Branch | Start | Bootstrap | Final | Merge | Audit IDs | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 - Git/bootstrap | Complete | `codex/remediation-program` | `99a1ea5d1a5d3444d4063ad6c9ac29303830f14e` | `b638e63813c972fe096a7830131a233a69606416` | `94d665881e3e929c41121d057385c28f822002fe` | Not applicable | None | Batch 1 audit complete |
| 1 - Forensic audit | Audit complete | `codex/batch-01-forensic-audit` | `94d665881e3e929c41121d057385c28f822002fe` | Not applicable | Batch 1 audit lookup above | Batch 1 merge lookup above | All 43 recorded; none fixed | Batch 2 pending |

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
