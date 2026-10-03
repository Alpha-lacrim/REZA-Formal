# Repository Agent Instructions

These instructions apply to the entire `REZA-Formal` repository. Their purpose is to keep coding sessions safe, reproducible, and easy to continue.

## Mandatory session startup

1. Confirm that the active Git root is this directory, not the outer `REZA_Formal_Website` workspace.
2. Read `AGENTS.md`, `Codex.md`, and `Handoff.md` before changing code.
3. Run `git status --short --branch` and preserve all pre-existing user changes. Never discard or overwrite unrelated work.
4. Start a new dated entry at the top of `Handoff.md`. Record the session objective and starting state immediately; fill in actual changes, verification, and remaining work as the session progresses.
5. Inspect configuration by variable name only. Never copy secret values from `.env`, cookies, tokens, database credentials, or private keys into source, documentation, logs, or chat.

If several agents work in parallel, the primary agent owns `Codex.md`, `AGENTS.md`, and `Handoff.md` to avoid conflicting continuity edits.

## What the continuity files are for

- `Codex.md` is the durable project map: architecture, important files, data flows, configuration names, commands, and stable implementation constraints. Update it whenever those facts change. It is not a chronological changelog.
- `Handoff.md` is the chronological session record. Every session must state what changed, what was verified, what remains incomplete, and what the repository owner must do. Keep the newest entry first and never silently drop an unresolved item.
- `AGENTS.md` is this operating contract. Update it if the maintenance workflow, required checks, or responsibilities of the other two files change.

## Working rules

- The active application consists of `frontend/` and `backend/`; repository-level deployment and setup files live beside them.
- Treat `frontend/services/api.ts` and the Django routes in `backend/shop/urls.py` as the live client/server contract. `frontend/services/db.ts` is a browser-local fallback, not the authoritative production backend.
- Keep Persian text as UTF-8 and preserve the RTL user experience.
- Keep response normalization inside the API boundary (`frontend/services/api.ts` and its domain modules such as `auth.ts` and `catalog.ts`), never in UI/context code. The Django API uses snake_case while UI models use camelCase. All domains share `services/http/client.ts` for cookies, CSRF, refresh and normalized errors.
- Prices and stock must remain server-authoritative. Order writes and stock restoration must be transactional.
- Do not expose development credentials in UI or documentation. Production secrets belong only in ignored environment files or the deployment platform's secret store.
- Do not rewrite Git history, delete persistent data, remove volumes, or rotate external credentials without explicit owner approval. Redact a tracked secret from the current tree and report the required rotation/history cleanup instead.
- Use `apply_patch` for hand-edited files, keep changes scoped, and avoid committing generated output, local environments, uploaded media, cookie jars, or ad-hoc debug artifacts.

## Expected verification

Run the checks relevant to the files changed. The standard baseline is:

```powershell
# Frontend
cd frontend
npm.cmd run lint
npm.cmd test
npm.cmd run typecheck
npm.cmd run build

# Backend (isolated test configuration; does not touch the live SQL Server)
cd ..\backend
.\.venv\Scripts\python.exe manage.py check --settings=reza_backend.test_settings
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run --settings=reza_backend.test_settings
.\.venv\Scripts\python.exe manage.py test --settings=reza_backend.test_settings

# Repository-level configuration
cd ..
docker compose config --quiet
```

For authentication, authorization, uploads, proxy or dependency changes, also run the relevant fixtures/gates in `docs/TESTING.md`: resolved Python advisory scan, production npm audit, full `audit:security` policy, disposable SQL security schedules and Nginx probes as applicable. Never treat the expiring build-only advisory exception as a zero-advisory full report or claim local checks prove deployed TLS/headers.

If a command is unavailable or requires an external service, record that fact in `Handoff.md`; do not claim it passed.

For container/startup/production operations changes, also run `scripts/check-build-inputs.py`
and `scripts/validate-production-config.py`, build both runtime images, run the proxy
gate and `node scripts/test-production-runtime.mjs` using only its owned disposable
fixtures. Follow `docs/OPERATIONS.md` for hash-lock updates, volume ownership and
recovery gates. Keep production deployment disabled; real ingress/DB/backup/capacity
changes need explicit owner scope. Record image scanner/database failures separately
from a successful vulnerability scan; hosted CI is separate from local evidence.

## Mandatory session close

Before the final response:

1. Review `git diff --check`, `git status`, and the full diff for accidental secrets or unrelated edits.
2. Update `Codex.md` if architecture, commands, environment variables, important files, or known constraints changed.
3. Finalize the current `Handoff.md` entry with exact files/behavior changed, checks and results, incomplete work, and owner actions.
4. Update `AGENTS.md` if either continuity file's purpose or upkeep process changed.
5. Tell the owner plainly about credential rotation, configuration, migrations, deployment steps, or decisions still required from them.
