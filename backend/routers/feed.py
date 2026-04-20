import re
import time
from fastapi import APIRouter, Query
import httpx
import feedparser

router = APIRouter(tags=["feed"])

ALLOWED_FEEDS = {
    "https://feeds.feedburner.com/eset/blog",
    "https://krebsonsecurity.com/feed/",
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
    "https://feeds.feedburner.com/Securityweek",
    "https://threatpost.com/feed/",
}

_IMG_TAG_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
_HTML_TAG_RE = re.compile(r'<[^>]+>')


def _extract_image(entry) -> str:
    """Try every common RSS image location, return first URL found."""
    # 1. media:thumbnail
    thumbs = getattr(entry, 'media_thumbnail', None)
    if thumbs and isinstance(thumbs, list) and thumbs[0].get('url'):
        return thumbs[0]['url']

    # 2. media:content with image MIME
    for mc in getattr(entry, 'media_content', []):
        if 'image' in mc.get('type', '') and mc.get('url'):
            return mc['url']

    # 3. enclosures (podcast-style, but some news feeds use them for images)
    for enc in getattr(entry, 'enclosures', []):
        if 'image' in enc.get('type', '') and enc.get('href'):
            return enc['href']

    # 4. <img> in content:encoded
    for c in getattr(entry, 'content', []):
        m = _IMG_TAG_RE.search(c.get('value', ''))
        if m:
            return m.group(1)

    # 5. <img> in summary
    m = _IMG_TAG_RE.search(entry.get('summary', ''))
    if m:
        return m.group(1)

    return ''


@router.get("/feed")
async def proxy_feed(url: str = Query(...)):
    if url not in ALLOWED_FEEDS:
        return []
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "OstexApex/1.0"})
        feed = feedparser.parse(r.text)
        items = []
        for entry in feed.entries[:12]:
            summary = entry.get("summary", "")
            summary = _HTML_TAG_RE.sub("", summary)[:240].strip()

            date_str = ""
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                date_str = time.strftime("%b %d, %Y", entry.published_parsed)

            items.append({
                "title": entry.get("title", "").strip(),
                "link": entry.get("link", ""),
                "summary": summary,
                "date": date_str,
                "image": _extract_image(entry),
            })
        return items
    except Exception:
        return []
