# MINDTRACE application boundary

This package will own the channel-level workflow: project configuration, long-form script sections, visual search terms, render jobs, and Shorts derivation metadata.

The first implementation keeps the boundary explicit. It does not import or patch MPT internals. The integration contract is documented in `mindtrace/integration-contract.json` and will be backed by the MPT CLI/API after the runtime smoke test.

## Local API

Run it with `scripts/start-mindtrace-api.ps1`. It listens on `127.0.0.1:8090` and exposes:

- `GET /api/health` — checks the MPT `/ping` endpoint.
- `POST /api/productions` — persists a draft under `projects/mindtrace/videos/<slug>/production.json`.
- `POST /api/productions/<id>/render` — translates the draft to the verified MPT `TaskVideoRequest` contract.
- `GET /api/jobs/<task_id>` — polls the MPT task status.

The render endpoint intentionally requires a manual English script and at least one English visual search term. This prevents an accidental LLM call during the first local smoke test.

Each video keeps its production record and final `longform.mp4` together under `projects/mindtrace/videos/<slug>/`.
