import * as CloudEvents from "cloudevents";
import { CloudEvent, CloudEventV1 } from "cloudevents";
import { Application, Router, Status } from "@oak/oak";
import { zip } from "@std/collections";
import { compareSimilarity } from "@std/text";
import { SubscriptionEvent } from "./events/SubscriptionEvent.ts";
import { StockAvailableEvent } from "./events/StockAvailableEvent.ts";
import store from "./store.ts";
import { AvailableAlbum } from "./AvailableAlbum.ts";
import { GithubPushEvent } from "./GithubPushEvent.ts";

const router = new Router();

router.get("/", async (ctx) => {
    const content = await Deno.readTextFile("./submit.html");
    ctx.response.body = content;
});

function makeCloudEventsHeaders(requestHeaders: Request["headers"]) {
    const headers = {} as CloudEvents.Headers;
    for (const [headerKey, headerValue] of requestHeaders.entries()) {
        headers[headerKey] = headerValue;
    }
    return headers;
}

router.post("/", async (ctx) => {
    const headers = makeCloudEventsHeaders(ctx.request.headers);
    const body = await ctx.request.body.json();
    const receivedEvent = CloudEvents.HTTP.toEvent<SubscriptionEvent>({
        headers,
        body,
    } as CloudEvents.Message) as CloudEventV1<SubscriptionEvent>;

    await store.saveSubscription(receivedEvent);

    emitAlbumsForSubscriptions(receivedEvent);

    ctx.response.status = Status.Created;
});     

router.post("/sources/github", async (ctx) => {
    const headers = ctx.request.headers;
    const body = await ctx.request.body.json() as GithubPushEvent;
    const pushMessage = new CloudEvents.CloudEvent({
        id: headers.get("X-GitHub-Delivery") ?? undefined,
        source: body.repository.url,
        specversion: "1.0",
        type: "com.github.push",
        datacontenttype: "application/json",
        subject: body.ref ?? undefined,
        time: new Date().toISOString(),
        data: body,
    });

    console.log(pushMessage.source);

    const githubUserContent = pushMessage.source.replace(
        "https://github.com",
        "https://raw.githubusercontent.com",
    );

    console.log(`${githubUserContent}/main/cds.json`);

    const sourceCDs = await (await fetch(`${githubUserContent}/main/cds.json`))
        .json() as AvailableAlbum[];

    const subscriptions = await store.getAllSubscriptions();
    const events = subscriptions
        .filter((x) => !!x)
        .flatMap((event) => {
            const emit = CloudEvents.emitterFor(
                CloudEvents.httpTransport(event.data?.url!),
            );
            return makeEventsFromAvailableAlbums(event, sourceCDs).map((e) =>
                emit(e)
            );
        });

    await Promise.all(events);

    ctx.response.status = Status.OK;
});

router.get("/subscriptions/:eventId", async (ctx) => {
    const eventId = ctx.params.eventId!;
    const subscription = await store.getSubscription(eventId);
    if (!subscription) {
        return ctx.response.redirect("/");
    }
    const prefilledData = new URLSearchParams();
    prefilledData.append("url", subscription.data?.url.toString()!);

    prefilledData.append("subscriptionId", subscription.id);

    for (const artist of subscription.data?.artist!) {
        prefilledData.append("artist", artist);
    }
    for (const albumtitle of subscription.data?.albumtitle!) {
        prefilledData.append("albumtitle", albumtitle);
    }

    return ctx.response.redirect("/?" + prefilledData.toString());
});

router.get("/api", async (ctx) => {
    const content = await Deno.readTextFile("./openapispec.html");
    ctx.response.body = content;
});

function makeEventsFromAvailableAlbums(
    event: CloudEventV1<SubscriptionEvent>,
    availableAlbums: Array<AvailableAlbum>,
) {
    return zip(event.data?.albumtitle!, event.data?.artist!)
        .map(([album, artist]) => {
            const [closestArtist] = availableAlbums.map((x) => x.artist).sort(
                compareSimilarity(artist, {
                    caseSensitive: false,
                }),
            );
            const albums = availableAlbums
                .filter((x) => x.artist === closestArtist);

            const [closestAlbum] = albums.map((x) => x.albumTitle).sort(
                compareSimilarity(album, {
                    caseSensitive: false,
                }),
            );

            const [bestGuess] = albums.filter((x) =>
                x.albumTitle === closestAlbum
            );
            if (
                contains(bestGuess.albumTitle, album) &&
                contains(bestGuess.artist, artist)
            ) {
                return new CloudEvent<StockAvailableEvent>({
                    type: "dev.deno.cdwishlist.StockAvailableEvent",
                    time: new Date().toISOString(),
                    id: event.id,
                    datacontenttype: "text/plain; charset=utf-8",
                    specversion: "1.0",
                    source: `cdwishlist.deno.dev/subscriptions/${event.id}`,
                    data: bestGuess,
                });
            }
        }).filter((x) => !!x);
}

async function emitAlbumsForSubscriptions(
    event: CloudEventV1<SubscriptionEvent>,
) {
    const emit = CloudEvents.emitterFor(
        CloudEvents.httpTransport(event.data?.url!),
    );

    const cd6000 =
        await (await fetch(
            "https://raw.githubusercontent.com/zunin/rytmeboxen.dk-history/main/cds.json",
        )).json() as AvailableAlbum[];
    const rytmeboxen =
        await (await fetch(
            "https://raw.githubusercontent.com/zunin/cd6000.dk-history/main/cds.json",
        )).json() as AvailableAlbum[];

    const availableAlbums = cd6000.concat(rytmeboxen);

    const events = makeEventsFromAvailableAlbums(event, availableAlbums);

    await Promise.all(events.map((event) => {
        return emit(event);
    }));
}

function contains(a: string, b: string): boolean {
    return a.toLocaleLowerCase().trim().includes(b.toLocaleLowerCase().trim());
}

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 80 });
