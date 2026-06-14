# 🚀 AICS — AI Customer Support & Lead Capture Platform

AICS is a white-label customer support and lead capture application that can be embedded on any website. It combines AI-powered chat, visitor triggers, lead scoring, conversation management, and a business dashboard with product catalog and team tools.

---

## 📌 What AICS Does
AICS helps businesses:
- answer customer questions automatically through a website widget
- capture new leads when support falls short
- route conversations into an admin dashboard
- customize the widget appearance and behavior
- manage FAQs, products, triggers, and webhooks

---

## 🌟 Core Features

### 1. AI Chat & Lead Capture
- Visitor-facing chatbot for answering questions
- Uses training data from FAQs, website content, and PDF uploads
- Captures lead contact details and stores them for follow up
- Tracks lead score and status for business review

### 2. Business Dashboard
- View and manage all businesses tied to your account
- Update widget settings, products, FAQs, triggers, and webhook integrations
- Review conversations, leads, and analytics in a single place
- Export leads and conversations to CSV for reporting

### 3. Product Catalog
- Add product items from the dashboard
- Store product name, description, price, image URL, and link URL
- Remove products from the business catalog when needed

### 4. Proactive Widget Triggers
- Trigger chat widget behavior based on visitor actions
- Support timed triggers and scroll-depth triggers
- Customize trigger messages and widget entry

### 5. Authentication & Security
- Signup, login, logout, and current-user APIs
- Secured dashboard access with sessions and CSRF protection
- Cookie-based session storage with optional production security settings

### 6. Optional AI + Search Integrations
- Google Gemini support for AI responses
- Hugging Face inference support
- Qdrant vector search integration for smarter knowledge retrieval
- Optional Neon PostgreSQL storage for production

---

## 🧩 Project Structure

- `server.js` — main Express server, route registration, middleware, and scheduler jobs
- `api/` — backend route handlers for auth, businesses, chat, FAQs, leads, products, triggers, and widget config
- `public/` — dashboard pages, auth pages, embedded widget client scripts, and static assets
- `lib/` — storage, AI connectors, training helpers, webhooks, and utility modules
- `data/db.json` — local JSON storage for development
- `render.yaml` — Render deployment configuration

---

## ⚙️ Supported APIs
AICS exposes backend routes for:
- `/api/auth/*` — signup, login, logout, session check
- `/api/businesses` — manage businesses
- `/api/businesses/:id` — get/update/delete a business
- `/api/businesses/:id/faqs` — business FAQ management
- `/api/businesses/:id/products` — product catalog management
- `/api/businesses/:id/leads` — lead capture and retrieval
- `/api/businesses/:id/conversations` — conversation listing and updates
- `/api/businesses/:id/triggers` — visitor trigger configuration
- `/api/businesses/:id/widget` — widget settings and branding
- `/api/businesses/:id/pdf` — upload PDF content for training
- `/api/upload-faqs` — upload FAQ records
- `/api/businesses/:id/webhooks` — webhook registration and updates
- `/api/businesses/:id/export/:type` — CSV exporting (leads or conversations)

---

## 🚀 Run Locally

### Prerequisites
- Node.js v16 or later
- Git

### Install
```bash
git clone https://github.com/Abdur-Rahman-Palash/aics.git
cd aics
npm install
cp .env.example .env
```

### Start the app
```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🔧 Environment Configuration
Copy `.env.example` to `.env`, then configure values for your environment.

### Required values
- `SESSION_SECRET` — secure key for session cookies

### Common optional values
- `PORT` — server port (default: `3000`)
- `NODE_ENV` — `development` or `production`
- `DATABASE_URL` — optional Neon/PostgreSQL connection string
- `GEMINI_API_KEY` — optional Google Gemini API key
- `HUGGINGFACE_API_KEY` — optional Hugging Face key
- `GROQ_API_KEY` — optional Groq key
- `QDRANT_URL` / `QDRANT_API_KEY` — optional Qdrant vector search settings
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — optional email alert configuration

### Important Notes
- If `DATABASE_URL` is not set, the app falls back to local JSON storage (`data/db.json`).
- Set `NODE_ENV=production` in production to enable secure cookies.
- Never commit API keys or secrets to version control.

---

## 🌍 Deploying

### Deploy to Render
1. Create a Render web service
2. Use `npm install` as the build command
3. Use `npm start` as the start command
4. Add environment variables in Render
5. Deploy the service

### Deploy to Vercel
1. Connect the repo to Vercel
2. Use `npm install` and `npm start`
3. Set environment variables in Vercel

---

## 🌐 Embed the Widget
Embed the chat widget on any website using the widget loader.

```html
<script src="https://your-aics-instance.com/js/embed.js" data-business-id="YOUR_BUSINESS_ID"></script>
```

Customize widget settings:

```html
<script src="https://your-aics-instance.com/js/embed.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-widget-title="Support"
  data-widget-color="#667eea"
  data-widget-avatar="🤖"
  data-widget-position="bottom-right"></script>
```

---

## 💡 Why AICS?
AICS offers a fast, flexible support solution:
- embedded AI assistant for websites
- built-in lead capture and scoring
- admin dashboard for conversation and product management
- optional production database support with Neon
- extensible integrations for AI and vector search

---

## 📄 License
MIT License

---

## 🙋 Need Help?
Open an issue or reach out for assistance with setup or deployment.
