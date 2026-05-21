/**
 * Workbox-based request queue for MusicBrainz API
 * Replaces custom MusicBrainzQueue with Workbox's built-in retry and caching
 *
 * This module centralizes all Workbox caching configuration.
 * Uses Workbox plugins for:
 * - RetryPlugin: Handles rate limiting (429, 503) with exponential backoff
 * - CacheableResponsePlugin: Only caches successful responses
 * - ExpirationPlugin: Auto-expires old cache entries
 * - BackgroundSyncPlugin: Queues failed requests for later retry (even across browser close)
 *
 * IMPORTANT: This configuration is used at BUILD TIME by vite-plugin-pwa.
 * The plugin classes are bundled into the service worker automatically.
 */

/**
 * Runtime caching configuration for vite-plugin-pwa
 * Used during service worker generation at build time
 */
export function getWorkboxRuntimeCaching(): Array<{
    urlPattern: RegExp;
    handler: string;
    options?: {
        cacheName?: string;
        expiration?: {
            maxEntries?: number;
            maxAgeSeconds?: number;
        };
        cacheableResponse?: {
            statuses?: number[];
        };
        backgroundSync?: {
            name?: string;
            options?: {
                maxRetentionTime?: number;
            };
        };
        plugins?: Array<{
            retryPlugin?: {
                statusCodes?: number[];
                errors?: string[];
                maxRetries?: number;
                retryDelay?: number;
            };
        }>;
    };
}> {
    return [
        {
            // MusicBrainz API - CacheFirst with BackgroundSync
            // Retries indefinitely for rate limits, survives browser close
            urlPattern: /^https:\/\/musicbrainz\.org\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "music-brainz",
                expiration: {
                    maxEntries: 1000,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                    statuses: [0, 200],
                },
                backgroundSync: {
                    name: "musicbrainz-sync",
                    options: {
                        maxRetentionTime: 60 * 60 * 24 * 7, // 1 week - requests survive 1 week
                    },
                },
            },
        },
        {
            // Cover Art Archive - CacheFirst with BackgroundSync
            urlPattern: /^https:\/\/coverartarchive\.org\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "coverartarchive",
                expiration: {
                    maxEntries: 1000,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                    statuses: [200],
                },
                backgroundSync: {
                    name: "coverart-sync",
                    options: {
                        maxRetentionTime: 60 * 60 * 24 * 7, // 1 week
                    },
                },
            },
        },
        {
            // GitHub raw data - StaleWhileRevalidate with background sync
            urlPattern: /cds\.json/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "cds-data",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                },
                backgroundSync: {
                    name: "cd6000",
                    options: {
                        maxRetentionTime: 60,
                    },
                },
            },
        },
    ];
}

/**
 * Initialize Workbox routing for runtime service worker
 * Use this in custom service worker code if not using vite-plugin-pwa
 */
export async function initializeWorkboxRoutes(
    workbox: typeof import("workbox-core"),
    params: {
        cacheFirst: typeof import("workbox-cache-first").CacheFirst;
        staleWhileRevalidate: typeof import("workbox-stale-while-revalidate").StaleWhileRevalidate;
        expirationPlugin: typeof import("workbox-expiration").ExpirationPlugin;
        cacheableResponsePlugin: typeof import("workbox-cacheable-response").CacheableResponsePlugin;
        retryPlugin: typeof import("workbox-retry").RetryPlugin;
        backgroundSyncPlugin: typeof import("workbox-background-sync").BackgroundSyncPlugin;
        registerRoute: typeof import("workbox-routing").registerRoute;
    },
): Promise<void> {
    const { registerRoute } = params;
    const { CacheFirst } = params;
    const { StaleWhileRevalidate } = params;
    const { ExpirationPlugin } = params;
    const { CacheableResponsePlugin } = params;
    const { RetryPlugin } = params;
    const { BackgroundSyncPlugin } = params;

    // MusicBrainz API - CacheFirst with retry
    registerRoute(
        /^https:\/\/musicbrainz\.org\/.*/i,
        new CacheFirst({
            cacheName: "music-brainz",
            plugins: [
                new RetryPlugin({
                    statusCodes: [429, 503],
                    errors: ["TypeError", "NetworkError", "AbortError"],
                    maxRetries: 5,
                    retryDelay: 1000,
                }),
                new CacheableResponsePlugin({
                    statuses: [0, 200],
                }),
                new ExpirationPlugin({
                    maxEntries: 1000,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                }),
            ],
        }),
        "GET",
    );

    // Cover Art Archive
    registerRoute(
        /^https:\/\/coverartarchive\.org\/.*/i,
        new CacheFirst({
            cacheName: "coverartarchive",
            plugins: [
                new RetryPlugin({
                    statusCodes: [429, 503],
                    errors: ["TypeError", "NetworkError", "AbortError"],
                    maxRetries: 3,
                }),
                new CacheableResponsePlugin({
                    statuses: [200],
                }),
                new ExpirationPlugin({
                    maxEntries: 1000,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                }),
            ],
        }),
        "GET",
    );

    // GitHub data with background sync
    registerRoute(
        /cds\.json/i,
        new StaleWhileRevalidate({
            cacheName: "cds-data",
            plugins: [
                new RetryPlugin({
                    statusCodes: [429, 503],
                    errors: ["TypeError", "NetworkError"],
                    maxRetries: 3,
                }),
                new CacheableResponsePlugin({
                    statuses: [0, 200],
                }),
                new BackgroundSyncPlugin("cd6000-queue", {
                    maxRetentionTime: 60 * 60,
                    onSync: async ({ queue }) => {
                        let entry;
                        while ((entry = await queue.shiftRequest())) {
                            try {
                                await fetch(entry.request.clone());
                            } catch (error) {
                                await queue.unshiftRequest(entry);
                                throw error;
                            }
                        }
                    },
                }),
                new ExpirationPlugin({
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7,
                }),
            ],
        }),
        "GET",
    );
}
