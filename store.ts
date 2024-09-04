import { CloudEventV1 } from "cloudevents";
import { SubscriptionEvent } from "./events/SubscriptionEvent.ts";
import { slugify } from "@std/text";

export default {
    saveSubscription,
    getSubscription
}

const kv = await Deno.openKv();

async function saveSubscription(event: CloudEventV1<SubscriptionEvent>) {
    const url = event.data?.url.toString();
    if (url) {
        const key = ["subscriptions", slugify(url)];
        await kv.set(key, event);
    }
}

async function getSubscription(uri: string) {
    const event = await kv.get<CloudEventV1<SubscriptionEvent>>(["subscriptions", uri]);
    return event.value;
}
