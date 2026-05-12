# ADR-0009: MusicBrainz API Integration

## Status

Accepted

## Context

The application allows users to search for albums by artist name. The primary data source for this is the **MusicBrainz API** - a free, open数据库 of music metadata.

MusicBrainz provides:
- Artist search by name
- Release group lookup
- Cover art via CoverArtArchive
- All data is Creative Commons licensed

The team considered:
- **Spotify API** - Richer data but requires developer account, rate limits are strict
- **Discogs API** - Good for marketplace data but more complex authentication
- **MusicBrainz API** - Free, open, covers international music well

## Decision

We will use the **MusicBrainz API** for album search functionality.

Implementation:
- Direct HTTP calls to `https://musicbrainz.org/ws/2/`
- User-Agent header identifying the application (required by MusicBrainz)
- Rate limiting: 1 request per second (MusicBrainz requirement)
- Debounce user input by 1 second to minimize requests

```typescript
// Simplified flow
const url = `https://musicbrainz.org/ws/2/release-group?query=artist:${artist}+AND+releasegroup:${album}&fmt=json&limit=10`;
const res = await fetch(url, { headers: { 'User-Agent': 'CDWishlist/1.0 (contact@example.com)' } });
```

## Consequences

**Positive:**
- Free, no API key required
- Comprehensive music database with international coverage
- Community-maintained, regularly updated
- All data is open (CC0 for data, CC BY-SA for artwork)

**Negative:**
- Rate limited to 1 req/sec - cannot batch searches
- No direct CDN or caching guarantee
- Response times vary (MusicBrainz servers can be slow)
- No marketplace/pricing data (separate from metadata)

**Neutral:**
- Artwork requires separate request to CoverArtArchive
- Some obscure releases may lack complete metadata
- User-Agent is required but not strictly enforced
- May need to implement retry logic for 429 responses