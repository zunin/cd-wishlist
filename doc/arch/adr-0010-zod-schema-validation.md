# ADR-0010: Zod Schema Validation

## Status

Accepted

## Context

The application processes data from multiple sources:
- MusicBrainz API responses
- GitHub-hosted JSON data sources
- User input
- Y.js document synchronization

Invalid data from any source could cause runtime errors or incorrect behavior. The team needed runtime validation without the boilerplate of manual type checking.

Options considered:
- **TypeScript types only** - Compile-time only, no runtime validation
- **Manual validation** - Explicit if/throw for each field, tedious
- **Joi/Yup/Zod** - Schema-based validation, composable, well-established

Zod was chosen for:
- TypeScript-first design (inference from schemas)
- Composable (object.extend, array.of, etc.)
- Tree-shakeable (only bundle used validators)
- Clear error messages

## Decision

We will use **Zod** for runtime data validation.

```typescript
// Example from src/models/Release.ts
import { z } from 'zod';

export const Release = z.object({
  id: z.string(),
  artist: z.string(),
  album: z.string(),
  price: z.string().optional(),
  url: z.string().url(),
});

export type Release = z.infer<typeof Release>;
```

Validation is performed:
- When loading CD data from GitHub JSON files
- When receiving wishlist items from Y.js sync
- When processing MusicBrainz API responses

## Consequences

**Positive:**
- Runtime validation catches bugs early with clear error messages
- Type inference reduces boilerplate - no separate type definitions needed
- Composable schemas allow building complex types from simple parts
- Zod errors include path to invalid field for debugging

**Negative:**
- Adds dependency (~15KB)
- Validation adds CPU overhead on data load
- Schema definitions are additional code to maintain

**Neutral:**
- Only validates data entering the system, not internal state
- Can be disabled for performance in trusted environments
- Error handling strategy must be defined (throw vs. fallback)