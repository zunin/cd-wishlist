import * as CloudEvents from "cloudevents";
import { CloudEventV1, CloudEvent } from "cloudevents";
import { Application, Router, Status } from "@oak/oak";
import { zip } from "@std/collections";
import { compareSimilarity } from "@std/text";
import rytmeboxen from "https://raw.githubusercontent.com/zunin/rytmeboxen.dk-history/main/cds.json" with {
    type: "json",
};
import cd6000 from "https://raw.githubusercontent.com/zunin/cd6000.dk-history/main/cds.json" with {
    type: "json",
};

const router = new Router();

router.get("/", async (ctx) => {
    const content = await Deno.readTextFile("./submit.html");
    ctx.response.body = content;
});

type SubscriptionEvent = {
    url: URL;
    artist: Array<string>;
    albumtitle: Array<string>;
};

type StockAvailableEvent = {
    artist: string;
    albumTitle: string;
    price: number;
    source: string;
}

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

    emitAlbumsForSubscriptions(receivedEvent);

    ctx.response.status = Status.Created;
});

function emitAlbumsForSubscriptions(event: CloudEventV1<SubscriptionEvent>) {
    console.log(event.data?.url)
        const emit = CloudEvents.emitterFor(
            CloudEvents.httpTransport(event.data?.url!),    
        );
    const availableAlbums = cd6000.map(x => {return {...x, source: new URL("http://cd6000.dk/").href}})
        .concat(rytmeboxen.map(x => {return {...x, source: new URL("http://rytmeboxen.dk/").href}}));

    zip(event.data?.albumtitle!, event.data?.artist!)
        .forEach(async ([album, artist]) => {
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
                const notificationEvent = new CloudEvent<StockAvailableEvent>({
                    type: "dev.deno.cdwishlist.StockAvailableEvent",
                    time: new Date().toISOString(),
                    id: self.crypto.randomUUID(),
                    datacontenttype: "text/plain; charset=utf-8",
                    specversion: "1.0",
                    source: `cdwishlist.deno.dev/subscriptions/${event.id}`,
                    data: bestGuess
                }); 
                console.log(bestGuess)
                await emit(notificationEvent)
            }
        });
}

function contains(a: string, b: string): boolean {
    return a.toLocaleLowerCase().trim().includes(b.toLocaleLowerCase().trim());
}

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 80 });
