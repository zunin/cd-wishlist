# ADR-0011: GitHub-hosted JSON as Data Source CDN

## Status

Accepted

## Context

The application displays information about available used CDs from marketplace sources. This data needs to be:
- Publicly accessible to all users
- Updated periodically (marketplace inventory changes)
- Hosted cheaply or free

The data comes from GitHub repositories maintained by volunteers who scrape marketplace websites:
- `zunin/cd6000.dk-history` - cd6000.dk listings
- `zunin/rytmeboxen.dk-history` - rytmeboxen.dk listings

Options considered:
- **Self-hosted database** - Full control but requires infrastructure and maintenance
- **GitHub Gist** - Free, simple, but limited API
- **GitHub raw content** - Served via fast CDN, versioning via git
- **CDN (Cloudflare, etc.)** - Fast but adds cost and complexity

## Decision

We will use **raw GitHub content** (`raw.githubusercontent.com`) as the data source CDN.

```typescript
// Default data sources from settings.ts
const DEFAULT_SETTINGS: SyncSettings = {
  dataSources: [
    'https://raw.githubusercontent.com/zunin/cd6000.dk-history/master/cds.json',
    'https://raw.githubusercontent.com/zunin/rytmeboxen.dk-history/master/cds.json',
  ],
};
```

Data is fetched directly in the React component via standard `fetch()`:
```typescript
for (const url of dataSources) {
  const res = await fetch(url);
  const data = await res.json() as Array<Release>;
  allReleases.push(...data);
}
```

## Consequences

**Positive:**
- Completely free hosting via GitHub's CDN
- Git history provides data version tracking
- Pull requests can update data (community contributions)
- GitHub's CDN is globally distributed and fast
- No infrastructure to maintain

**Negative:**
- Data freshness depends on repository maintainers
- No SLA or guaranteed uptime from GitHub
- Large JSON files add latency on initial load
- CORS may need configuration (GitHub serves with appropriate headers)
- Repository could be deleted or made private

**Neutral:**
- Users can add their own data sources via settings
- Data format is ad-hoc (array of Release objects)
- No structured API - just static JSON files