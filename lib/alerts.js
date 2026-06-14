const nodemailer = require('nodemailer');
const axios = require('axios');
const getStorage = require('./storage');

async function sendEscalationAlert(businessId, conversationId, reason) {
    try {
        const storage = await getStorage();
        const business = await storage.getBusiness(businessId);
        if (!business) return;

        const conversation = await storage.getConversation(businessId, conversationId);
        if (!conversation) return;

        const visitorName = conversation.visitor?.name || 'Anonymous';
        const visitorEmail = conversation.visitor?.email || 'N/A';
        const visitorPhone = conversation.visitor?.phone || 'N/A';

        // Extract last few messages for transcript
        const transcript = conversation.messages && conversation.messages.length > 0
            ? conversation.messages.slice(-5).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')
            : 'No message history available.';

        // 1. Send Email Notification
        if (business.notificationEmail) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
                    port: parseInt(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });

                const mailOptions = {
                    from: process.env.SMTP_FROM || 'noreply@aics.app',
                    to: business.notificationEmail,
                    subject: `🚨 Human Handoff Requested - ${business.name}`,
                    text: `
Hello,

A visitor on your website has requested human assistance.

Handoff Reason: ${reason}

Visitor Details:
- Name: ${visitorName}
- Email: ${visitorEmail}
- Phone: ${visitorPhone}

Conversation Transcript (Last 5 messages):
----------------------------------
${transcript}
----------------------------------

Please log in to your AICS dashboard to respond to this conversation.

Best regards,
AICS Automation
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log(`[Alerts] Escalation email sent to ${business.notificationEmail}`);
            } catch (emailErr) {
                console.error('[Alerts] Failed to send escalation email:', emailErr.message);
            }
        }

        // 2. Send Slack Webhook Alert
        const slackUrl = business.widgetSettings?.slackWebhookUrl;
        if (slackUrl) {
            try {
                const payload = {
                    text: `🚨 *Human Handoff Requested* for *${business.name}*\n*Reason:* ${reason}\n*Visitor:* ${visitorName} (${visitorEmail})\n\n*Last Messages:*\n\`\`\`${transcript.substring(0, 1000)}\`\`\``
                };
                await axios.post(slackUrl, payload);
                console.log('[Alerts] Escalation Slack notification sent');
            } catch (slackErr) {
                console.error('[Alerts] Failed to send Slack alert:', slackErr.message);
            }
        }
    } catch (err) {
        console.error('[Alerts] Error in sendEscalationAlert:', err);
    }
}

module.exports = { sendEscalationAlert };
