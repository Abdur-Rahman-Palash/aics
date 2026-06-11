const getStorage = require('./storage');

async function sendWebhookEvent(businessId, eventType, eventData) {
    try {
        const storage = await getStorage();
        const webhooks = await storage.getWebhooks(businessId);
        if (!webhooks || webhooks.length === 0) {
            return;
        }

        for (const webhook of webhooks) {
            if (!webhook.enabled) continue;
            if (webhook.events && webhook.events.length > 0 && !webhook.events.includes(eventType)) {
                continue;
            }

            const payload = {
                event: eventType,
                businessId: businessId,
                timestamp: new Date().toISOString(),
                data: eventData
            };

            try {
                await fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                console.log(`[Webhook] Sent event ${eventType} to ${webhook.url}`);
            } catch (err) {
                console.error(`[Webhook] Failed to send event to ${webhook.url}`, err);
            }
        }
    } catch (err) {
        console.error('[Webhook] Error sending webhook events', err);
    }
}

module.exports = { sendWebhookEvent };
