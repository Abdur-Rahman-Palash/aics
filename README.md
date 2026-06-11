# 🚀 AICS — AI Customer Support & Lead Capture SaaS

**Sell more, support less.**

AICS is a white-label AI customer support and lead capture app you can embed on any website in minutes. It is built for small businesses, agencies, and developers

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

- **AI Chatbot**: Trained on your content with context-aware responses in multiple languages (English, Bengali, Hindi, Urdu, Arabic, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Russian, Turkish, Indonesian)
- **File Attachments**: Let users send images, PDFs, and documents
- **Easy Training**: Scrape your website, upload PDFs, or add FAQs manually
- **Lead Capture**: Show a form when the bot can’t resolve a request
- **Lead Scoring**: Hot/Warm/Cold lead classification
- **Notifications**: Email alerts for new leads and escalations
- **Human Inbox**: Review, filter, and continue conversations from the dashboard
- **Conversation Tags & Assignment**: Organize and assign conversations to team members
- **Conversation Notes**: Add internal notes to conversations for agent collaboration
- **Canned Responses**: Save and reuse common responses
- **Proactive Chat Triggers**: Automatically open chat based on time on page or scroll depth
- **Knowledge Base**: Full-featured KB with categories, articles, and search
- **Analytics**: Track conversations, resolutions, escalations, leads, response times, and daily usage
- **Webhooks**: Send events (new_lead, new_message) to Zapier, Make, n8n, or custom endpoints
- **Customization**: Change widget colors, title, avatar, and branding
- **Mobile Friendly**: Responsive design for phones and tablets with React Native SDK guide
- **Security**: User authentication, CSRF protection, and rate limiting
- **Database**: Local JSON storage or Neon PostgreSQL

---

## 🛠️ Tech Stack

AICS is built with modern, reliable tools:

- Backend: Node.js + Express
- AI: Google Gemini, Hugging Face, Groq, LangChain
- Vector Search: Qdrant
- Database: Local JSON storage or Neon PostgreSQL
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
GEMINI_API_KEY=your-google-gemini-api-key (optional)
HUGGINGFACE_API_KEY=your-huggingface-api-key (optional - used for embeddings)
GROQ_API_KEY=your-groq-api-key (optional - used for LLM responses)
QDRANT_URL=https://your-qdrant-cluster-url (optional)
QDRANT_API_KEY=your-qdrant-api-key (optional)
SMTP_HOST=your-smtp-host (optional)
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
   # If you plan to use the Hugging Face or Groq integrations:
   npm install @huggingface/inference groq-sdk
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
 - `HUGGINGFACE_API_KEY` (optional — used for embeddings)
 - `GROQ_API_KEY` (optional — used for LLM responses)

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
- Webhooks for Zapier, Make, n8n (new_lead, new_message events)
- Advanced analytics dashboard (response times, daily usage, resolution rates)
- Knowledge gap detection
- CSV export for leads and conversations
- Responsive dashboard
- Lead form relevance check
- Improved signup flow
- File attachments (images, PDFs, docs)
- Conversation history persistence via localStorage
- Canned Responses
- Conversation Tags & Assignment
- Proactive Chat Triggers
- Multi-language support (15+ languages)
- Agent Collaboration Notes
- Neon PostgreSQL integration
- React Native SDK guide

### Upcoming
- SMS notifications
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

---

**Project Analysis & Recent Changes (2026-06-11)**

- **Summary:** Implemented safer upload handling, an embed-file upload UI for external sites, and a website-file automated answer path that uses embeddings + vector search + LLM when website sources exist. Non-website files fall back to the lead/human workflow.
- **Key files changed:** `server.js`, `api/chat.js`, `js/embed.js`, `public/js/embed.js`, `scripts/test-upload.js`.
- **Server changes:** Increased body parser limits and added a 413-friendly JSON response for payloads that are too large.
- **Upload handling:** `api/chat.js` now detects website-related uploads via filename, decoded text (HTML/URLs), and `storage.getKnowledgeSourcesForBusiness`. If website-related and `HUGGINGFACE_API_KEY` is configured, it:
   - Generates an embedding for the uploaded content.
   - Runs `qdrant.searchSimilar` to find related knowledge (FAQs, pages).
   - Builds a compact context and asks `langchain.generateResponse` (falls back to `gemini.generateResponse`).
   - If no context is found, the flow asks the user for more details and escalates to the human lead flow.
- **Embed widget:** `public/js/embed.js` and `js/embed.js` were updated to show an upload icon, hidden file input, preview, and upload flow so the widget works on external sites.
- **Test helper:** `scripts/test-upload.js` posts a base64-encoded sample file to `/api/chat` for quick integration testing.

**How to test locally**

- Start the app:
   ```bash
   npm run dev
   ```
- Run the included test upload (sends `uploads/test-invoice-training.txt`):
   ```bash
   node scripts/test-upload.js
   ```
- For website-content testing, upload a small HTML/text file containing a URL or HTML markup (or test with a business that has `website` knowledge sources) to trigger the automated embedding + vector search path.

**Recommended next steps**

- Ensure `HUGGINGFACE_API_KEY` (or equivalent embeddings provider) is set in your environment to enable embeddings.
- Verify `QDRANT_URL` / `QDRANT_API_KEY` and that the collection contains indexed website content for the business you test.
- When deploying, serve the embed script with a version query param (e.g., `/js/embed.js?v=1`) to avoid cached copies on client sites.
- Consider multipart or streaming upload support for files larger than the current JSON limit (50MB in dev config).

If you want, I can also:
- Run more automated uploads and inspect server logs for embedding and qdrant responses.
- Add a small README subsection with example responses and debugging tips for common failures (HF key missing, qdrant empty results).
