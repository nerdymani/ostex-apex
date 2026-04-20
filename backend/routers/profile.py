import uuid
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(tags=["profile"])

# In-memory session store keyed by scan_id
_sessions: dict = {}


class ProfilePayload(BaseModel):
    org_name: str
    domain: str
    software: List[str]
    software_versions: dict = {}
    employee_range: str


@router.post("/profile")
def create_profile(payload: ProfilePayload):
    scan_id = str(uuid.uuid4())
    _sessions[scan_id] = {
        "profile": payload.model_dump(),
        "cve_results": [],
        "breach_results": [],
        "exploited_results": [],
        "analysis": None,
    }
    return {"scan_id": scan_id, "status": "profile saved"}


def get_session(scan_id: str) -> dict:
    return _sessions.get(scan_id, {})


def update_session(scan_id: str, key: str, value) -> None:
    if scan_id in _sessions:
        _sessions[scan_id][key] = value
