# 🚀 AICS — AI Customer Support & Lead Capture SaaS

**Sell more, support less.**

AICS is a white-label AI customer support and lead capture app you can embed on any website in minutes. It is built for small businesses, agencies, and developers, and is ready to deploy on Render.com right now.

---

## 🔍 What is AICS?

AICS combines an AI-powered chatbot, lead capture, and a human inbox into one product.

- Fast training from websites, PDFs, and FAQs
- Automated lead capture with Hot/Warm/Cold scoring
- Alerts for new leads and escalations
- Dashboard analytics and knowledge gap tracking
- Customizable widget design for your brand

---

## 👥 Who is it for?

AICS works well for:

- Small businesses that want 24/7 customer support without hiring extra staff
- Agencies offering branded support bots to clients
- Developers building a white-label chatbot and lead capture solution
- Teams that need a faster way to convert website visitors into leads

---

## 📣 Marketing Pitch

AICS solves the biggest growth challenge for small businesses and agencies: converting website visitors into qualified leads without adding support cost.

- **Problem:** Visitors leave without answers, support teams get overwhelmed, and leads get lost.
- **Solution:** AICS delivers a branded AI chatbot, intelligent lead capture, and a human follow-up workflow in one package.
- **Why it wins:** quick deployment, easy training, automated scoring, and meaningful alerts so businesses can act faster.

Use AICS to turn conversations into revenue, reduce support load, and keep customer interactions on brand.

---

## ✨ Why AICS?

AICS helps you:

- Answer customer questions instantly
- Capture leads when you’re offline
- Score leads automatically
- Keep conversations on topic after form submission
- Find knowledge gaps from unanswered questions
- Match your branding with a fully customizable widget

---

## 🧩 Key Features

- **AI Chatbot**: Trained on your content with context-aware responses
- **Easy Training**: Scrape your website, upload PDFs, or add FAQs manually
- **Lead Capture**: Show a form when the bot can’t resolve a request
- **Lead Scoring**: Hot/Warm/Cold lead classification
- **Notifications**: Email alerts for new leads and escalations
- **Human Inbox**: Review, filter, and continue conversations from the dashboard
- **Analytics**: Track conversations, resolutions, escalations, leads, and knowledge gaps
- **Webhooks**: Send events to Zapier, Make, n8n, or custom endpoints
- **Customization**: Change widget colors, title, avatar, and branding
- **Mobile Friendly**: Responsive design for phones and tablets
- **Security**: User authentication, CSRF protection, and rate limiting

---

## 🛠️ Tech Stack

AICS is built with modern, reliable tools:

- Backend: Node.js + Express
- AI: Google Gemini + LangChain
- Vector Search: Qdrant
- Database: LowDB JSON storage (easy to swap to PostgreSQL/MongoDB)
- Frontend: Vanilla JavaScript + CSS
- Deployment: Render.com (render.yaml included)

---

## 🚀 Deploy to Render

AICS is ready to deploy on Render.

### 1. Fork this repo
Use GitHub’s fork button or template option.

### 2. Create a Render account
Render’s free tier is enough to get started.

### 3. Create a new web service
- Runtime: Node.js
- Build Command: `npm install`
- Start Command: `npm start`

### 4. Configure environment variables
Set these values in Render:

```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-long-random-secret
GEMINI_API_KEY=your-google-gemini-api-key
QDRANT_URL=https://your-qdrant-cluster-url
QDRANT_API_KEY=your-qdrant-api-key
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

> `QDRANT_URL` and `QDRANT_API_KEY` are optional but recommended for better search accuracy.

### 5. Deploy
Save and deploy your service on Render.

---

## 💻 Run Locally

1. Install Node.js v16 or later
2. Clone the repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and update values
5. Start the app:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000`

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure the following values:

- `PORT`
- `NODE_ENV`
- `SESSION_SECRET`
- `GEMINI_API_KEY`
- `QDRANT_URL` (optional)
- `QDRANT_API_KEY` (optional)
- `SMTP_HOST` (optional)
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

---

## 🌐 Widget Embed

Use the widget by adding this script to your website:

```html
<script src="https://your-aics-instance.onrender.com/js/embed.js" data-business-id="YOUR_BUSINESS_ID"></script>
```

Customize the widget:

```html
<script src="https://your-aics-instance.onrender.com/js/embed.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-widget-title="My Awesome Support"
  data-widget-color="#667eea"
  data-widget-avatar="🤖"></script>
```

---

## 📈 Roadmap

### Done
- Human Inbox
- Lead Scoring (Hot/Warm/Cold)
- Email notifications for new leads
- Webhooks for Zapier, Make, n8n
- Advanced analytics dashboard
- Knowledge gap detection
- CSV export for leads and conversations
- Responsive dashboard
- Lead form relevance check
- Improved signup flow

### Upcoming
- SMS notifications
- Multi-language support
- SSO integration
- More database options out of the box

---

## 💡 Who should use AICS?

- Developers building SaaS products
- Agencies serving small businesses
- Small business owners who want a branded support bot

The MIT license lets you use this commercially.

---

## 📄 License

MIT License

---

## 🙋 Need help?

Open an issue on GitHub or reach out if you need assistance.

---

Made with ❤️ for builders and businesses everywhere.
