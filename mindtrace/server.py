"""Local MINDTRACE API.

This is the application boundary around MoneyPrinterTurbo. It owns local draft
files and translates a production draft into the verified MPT API payload.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parents[1]
PROJECTS_ROOT = ROOT / "projects" / "mindtrace"
VIDEOS_ROOT = PROJECTS_ROOT / "videos"
MPT_TASKS_ROOT = ROOT / "engine" / "MoneyPrinterTurbo" / "storage" / "tasks"
MPT_API_URL = os.getenv("MINDTRACE_MPT_API_URL", "http://127.0.0.1:8080").rstrip("/")


class DraftPayload(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    script: str = Field(default="", max_length=50_000)
    duration: str = "8–10 minutes"
    voice: str = "en-US-ChristopherNeural"
    footage: str = "Pexels + Pixabay"
    sections: str = "15 visual sections"
    video_terms: list[str] = Field(default_factory=list)


app = FastAPI(title="MINDTRACE Local API", version="0.1.0")


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug[:64] or "untitled-production"


def _production_path_for_record(record: dict[str, Any]) -> Path:
    draft = record.get("draft") or {}
    slug = str(record.get("video_slug") or _slugify(str(draft.get("topic", "untitled-production"))))
    return VIDEOS_ROOT / slug / "production.json"


def _production_path(production_id: str) -> Path:
    if not re.fullmatch(r"[a-z0-9-]{1,120}", production_id):
        raise HTTPException(status_code=400, detail="invalid production id")
    for path in VIDEOS_ROOT.glob("*/production.json"):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if record.get("production_id") == production_id:
            return path
    return PROJECTS_ROOT / production_id / "production.json"


def _write_record(record: dict[str, Any]) -> None:
    path = _production_path_for_record(record)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def _read_record(production_id: str) -> dict[str, Any]:
    path = _production_path(production_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="production not found")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="production record is invalid") from exc


def _split_terms(values: list[str]) -> list[str]:
    terms: list[str] = []
    for value in values:
        for item in value.replace(",", "\n").splitlines():
            clean = item.strip()
            if clean and clean not in terms:
                terms.append(clean)
    return terms


def _prepare_mpt_script(script: str) -> str:
    """Keep long Edge TTS requests below provider limits without changing the draft."""
    raw = str(script or "").strip()
    if len(raw) <= 3500 or "[pause:" in raw.lower():
        return raw

    sentences = [item.strip() for item in re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", raw)) if item.strip()]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        candidate = f"{current} {sentence}".strip()
        if current and len(candidate) > 2400:
            chunks.append(current)
            current = sentence
        else:
            current = candidate
    if current:
        chunks.append(current)
    return "\n[pause: 0.25s]\n\n".join(chunks)


def _mpt_payload(draft: dict[str, Any]) -> dict[str, Any]:
    footage = str(draft.get("footage", "pexels")).lower()
    source = "pixabay" if "pixabay" in footage and "pexels" not in footage else "pexels"
    terms = _split_terms(draft.get("video_terms", []))
    return {
        "video_subject": draft["topic"],
        "video_script": _prepare_mpt_script(draft.get("script", "")),
        "video_terms": terms or None,
        "video_aspect": "16:9",
        "video_fit_mode": "cover",
        "video_concat_mode": "sequential",
        "video_clip_duration": 5,
        "video_clip_speed": 1.0,
        "match_materials_to_script": True,
        "video_count": 1,
        "video_source": source,
        "video_language": "en-US",
        "voice_name": draft.get("voice", "en-US-ChristopherNeural"),
        "voice_volume": 1.0,
        "voice_rate": 1.0,
        "bgm_type": "none",
        "bgm_file": "",
        "bgm_volume": 0.08,
        "subtitle_enabled": False,
        "n_threads": 2,
        "paragraph_number": 1,
    }


def _mpt_request(method: str, path: str, **kwargs: Any) -> requests.Response:
    try:
        return requests.request(method, f"{MPT_API_URL}{path}", timeout=15, **kwargs)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="MPT API is unreachable") from exc


def _sync_job_record(task_id: str, state: str, progress: Any, data: dict[str, Any]) -> None:
    for path in VIDEOS_ROOT.glob("*/production.json"):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if (record.get("mpt") or {}).get("task_id") != task_id:
            continue
        record["state"] = "rendered" if state == "complete" else "failed" if state == "failed" else "processing"
        record["mpt"]["status"] = {
            "state": state,
            "progress": progress,
            "videos": data.get("videos", []),
            "error": data.get("error"),
        }
        if state == "complete" and data.get("videos"):
            source = MPT_TASKS_ROOT / task_id / Path(str(data["videos"][0])).name
            published = _production_path_for_record(record).parent / "longform.mp4"
            if source.is_file():
                published.parent.mkdir(parents=True, exist_ok=True)
                temporary = published.with_suffix(".mp4.tmp")
                shutil.copy2(source, temporary)
                temporary.replace(published)
                record["outputs"] = {
                    "longform_mp4": str(published.relative_to(ROOT)).replace("\\", "/")
                }
        _write_record(record)
        return


@app.get("/api/health")
def health() -> dict[str, Any]:
    response = _mpt_request("GET", "/ping")
    return {
        "status": "online" if response.ok else "offline",
        "mpt_status_code": response.status_code,
        "mpt_response": response.text,
    }


@app.get("/api/productions")
def list_productions() -> dict[str, Any]:
    records = []
    for path in sorted(VIDEOS_ROOT.glob("*/production.json"), reverse=True):
        try:
            records.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError):
            continue
    return {"productions": records}


@app.post("/api/productions")
def create_production(draft: DraftPayload) -> dict[str, Any]:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    production_id = f"{timestamp}-{_slugify(draft.topic)}-{uuid4().hex[:6]}"
    video_slug = _slugify(draft.topic)
    suffix = 2
    while (VIDEOS_ROOT / video_slug / "production.json").exists():
        video_slug = f"{_slugify(draft.topic)}-{suffix}"
        suffix += 1
    record = {
        "production_id": production_id,
        "video_slug": video_slug,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "state": "draft",
        "draft": draft.model_dump(),
        "mpt": None,
    }
    _write_record(record)
    return record


@app.get("/api/productions/{production_id}")
def get_production(production_id: str) -> dict[str, Any]:
    return _read_record(production_id)


@app.post("/api/productions/{production_id}/render")
def render_production(production_id: str) -> dict[str, Any]:
    record = _read_record(production_id)
    draft = record["draft"]
    if not str(draft.get("script", "")).strip():
        raise HTTPException(status_code=400, detail="manual English script is required")
    if not _split_terms(draft.get("video_terms", [])):
        raise HTTPException(status_code=400, detail="at least one English visual search term is required")

    response = _mpt_request("POST", "/api/v1/videos", json=_mpt_payload(draft))
    try:
        body = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="MPT returned invalid JSON") from exc
    if not response.ok or body.get("status") not in (None, 200):
        detail = body.get("message", "MPT rejected the render request")
        raise HTTPException(status_code=response.status_code or 502, detail=detail)

    task = body.get("data", {})
    record["state"] = "queued"
    record["mpt"] = {
        "task_id": task.get("task_id"),
        "payload": _mpt_payload(draft),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_record(record)
    return {"production_id": production_id, "state": record["state"], "mpt": record["mpt"]}


@app.get("/api/jobs/{task_id}")
def get_job(task_id: str) -> dict[str, Any]:
    response = _mpt_request("GET", f"/api/v1/tasks/{task_id}")
    try:
        body = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="MPT returned invalid JSON") from exc
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=body.get("message", "task not found"))
    data = body.get("data", {})
    raw_state = data.get("state")
    state = "complete" if raw_state == 1 else "failed" if raw_state == -1 else "processing"
    _sync_job_record(task_id, state, data.get("progress", 0), data)
    return {
        "task_id": task_id,
        "state": state,
        "raw_state": raw_state,
        "progress": data.get("progress", 0),
        "data": data,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8090, log_level="warning")
