from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import profile, cve, breaches, analyse, report, settings, feed, chat, ssl_scan, recon

app = FastAPI(title="Ostex Apex API", version="1.0.0")

import os

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(cve.router, prefix="/api/scan")
app.include_router(breaches.router, prefix="/api/scan")
app.include_router(analyse.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(feed.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(ssl_scan.router, prefix="/api/scan")
app.include_router(recon.router, prefix="/api/scan")


@app.get("/")
def root():
    return {"status": "Ostex Apex API running"}
