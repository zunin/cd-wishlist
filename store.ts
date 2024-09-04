import { CloudEventV1 } from "cloudevents";
import { SubscriptionEvent } from "./events/SubscriptionEvent.ts";

export default {
    saveSubscription,
    getSubscription
}

const kv = await Deno.openKv();

async function saveSubscription(event: CloudEventV1<SubscriptionEvent>) {
    const key = ["subscriptions", event.id];
    console.log("saving", key)
    await kv.set(key, event);
}

async function getSubscription(id: string) {
    const event = await kv.get<CloudEventV1<SubscriptionEvent>>(["subscriptions", id]);
    return event.value;
}
