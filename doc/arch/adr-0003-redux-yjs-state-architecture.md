# ADR-0003: Redux + redux-yjs-bindings State Architecture

## Status

Accepted

## Context

The application is a React SPA that needs to manage both local UI state and synchronized shared state. The team considered several approaches:

- **Pure Y.js** - Y.js provides observability via `observe` callbacks, can drive React directly
- **Redux only** - Centralized state with manual sync to Y.js via middleware
- **Redux + redux-yjs-bindings** - Uses the `redux-yjs-bindings` library to auto-sync Redux with Y.js

The key challenge is that React's component model doesn't directly understand Y.js changes. When a remote peer modifies the Y.js document, the UI needs to re-render appropriately.

## Decision

We will use **Redux Toolkit** for application state management, with **redux-yjs-bindings** providing bidirectional synchronization between Redux and Y.js.

The binding layer handles:
1. Wrapping Redux reducers to emit Y.js transactions on changes
2. Subscribing to Y.js document changes to dispatch Redux actions
3. Handling initial sync between existing Redux state and Y.js state
4. Cleanup of orphaned data during migrations

```typescript
// Simplified flow
const enhancedReducer = enhanceReducer(ydoc.getMap('root'), reducer);

// When Redux action fires → Y.js transaction
dispatch(addItem({ id })) → Y.js rootMap.set('wishlist', ...)

// When Y.js changes → Redux action
ydoc.on('update', () => dispatch(syncFromYjs()))
```

## Consequences

**Positive:**
- Standard Redux patterns for state updates, devtools, time-travel debugging
- UI can use familiar React-Redux hooks (`useSelector`, `useDispatch`)
- redux-yjs-bindings handles the complex sync logic
- Redux devtools show state history even with Y.js sync
- Separation of concerns: Redux manages UI state, Y.js manages sync

**Negative:**
- Additional abstraction layer adds complexity
- Understanding the sync flow requires knowledge of both Redux and Y.js
- Potential for subtle sync bugs if not careful with reducer design
- Bundle size: Redux + redux-yjs-bindings adds ~15KB

**Neutral:**
- State is effectively stored twice (Redux runtime + Y.js document)
- The binding layer must handle edge cases like initial migration and orphaned keys
- Provider must be restarted when sync settings change (room name, signaling URL)