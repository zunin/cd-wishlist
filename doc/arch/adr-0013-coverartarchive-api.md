# ADR-0013: CoverArtArchive API for Album Art

## Status

Accepted

## Context

The application displays album artwork to help users identify CDs. MusicBrainz provides the metadata but does not host artwork directly. Artwork must be fetched from the **CoverArtArchive** - MusicBrainz's sister project that hosts album covers.

MusicBrainz relations link releases to their CoverArtArchive entries:
```
Release (MusicBrainz) → CoverArtArchive.org → Image files
```

The application needs to:
- Extract CoverArtArchive URLs from MusicBrainz response
- Handle missing artwork gracefully
- Cache artwork to reduce repeated requests

## Decision

We will use the **CoverArtArchive API** for fetching album artwork.

The API provides:
- Thumbnails in multiple sizes (250, 500, 1200 pixels)
- Original high-resolution images
- JSON endpoint for metadata + image list

```typescript
// Fetching cover art for a release
const coverUrl = `https://coverartarchive.org/release/${mbid}/front-250`;
const res = await fetch(coverUrl);
// If 404, release has no cover art
// If redirect, actual image is at Location header URL
```

Fallback behavior:
- If no cover art exists, display a placeholder image (vinyl record icon)
- Thumbnail sizes preferred to reduce bandwidth
- Errors silently fall back to placeholder

## Consequences

**Positive:**
- Free service, no API key required
- Large database - most releases have some artwork
- Multiple resolution options for different contexts
- CDN-backed for fast global delivery

**Negative:**
- Separate API call required per release (additional latency)
- Not all releases have artwork - need graceful fallback
- CoverArtArchive is independent project - could have availability issues
- Rate limiting not documented but should be respected

**Neutral:**
- Some very obscure releases may lack artwork entirely
- Images can be cached by service worker for repeat visits
- Artwork URLs could change - don't persist them, always fetch fresh