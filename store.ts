import { CloudEventV1 } from "cloudevents";
import { SubscriptionEvent } from "./events/SubscriptionEvent.ts";

export default {
    saveSubscription,
    getSubscription,
    getAllSubscriptions,
};

const kv = await Deno.openKv();

async function saveSubscription(event: CloudEventV1<SubscriptionEvent>) {
    const key = ["subscriptions", event.id];
    await kv.set(key, event);
}

async function getSubscription(id: string) {
    const entry = await kv.get<CloudEventV1<SubscriptionEvent>>([
        "subscriptions",
        id,
    ]);
    return entry.value;
}

async function getAllSubscriptions() {
    const entries = await kv.list<CloudEventV1<SubscriptionEvent>>({
        prefix: ["subscriptions"],
    });
    const events = [];
    for await (const entry of entries) {
        events.push(entry.value);
    }

    return events;
}
