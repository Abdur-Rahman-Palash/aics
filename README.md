# 🚀 AICS — AI Customer Support & Lead Capture SaaS

**Sell more, support less.**

AICS is a white-label AI customer support and lead capture app you can embed on any website in minutes. Perfect for small businesses, agencies, and developers!

---

## 📖 Table of Contents
- [What is AICS?](#-what-is-aics)
- [Who is it for?](#-who-is-it-for)
- [Key Features](#-key-features)
- [How it Works](#-how-it-works)
  - [1. AI Chatbot](#1-ai-chatbot)
  - [2. Human Inbox](#2-human-inbox)
  - [3. Proactive Triggers](#3-proactive-triggers)
  - [4. Canned Responses](#4-canned-responses)
- [Tech Stack](#-tech-stack)
- [How to Deploy](#-how-to-deploy)
  - [Deploy to Render](#deploy-to-render)
  - [Run Locally](#run-locally)
- [How to Embed the Widget](#-how-to-embed-the-widget)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Need Help?](#-need-help)

---

## 🔍 What is AICS?
AICS combines an AI-powered chatbot, lead capture, and a human inbox into one product:
- Train the AI on your website, PDFs, and FAQs
- Automatically capture and score leads
- Get alerts for new leads and escalations
- Review and respond to conversations from a dashboard
- Fully customize the widget to match your brand

---

## 👥 Who is it for?
- **Small businesses**: Get 24/7 customer support without hiring extra staff
- **Agencies**: Offer branded support bots to your clients
- **Developers**: Build a white-label chatbot and lead capture solution
- **Sales teams**: Convert more website visitors into qualified leads

---

## ✨ Key Features
Let's break down the most important features:

### 🤖 AI Chatbot
- Answers customer questions instantly using your training data
- Supports multiple languages
- Lets users upload images, PDFs, and documents
- Remembers conversation history
- Shows a lead form when it can't answer a question

### 📥 Human Inbox
- Review all conversations in one place
- Filter by status (Open, Pending, Closed)
- Assign conversations to team members
- Add tags and internal notes
- Continue conversations with customers directly from the dashboard
- Real-time updates when new messages arrive

### ⚡ Proactive Triggers
- Automatically open the chat widget based on visitor behavior
- **Time on page**: Show a message after a visitor spends X seconds on your site
- **Scroll depth**: Show a message after a visitor scrolls X% down your page
- Create custom triggers with your own messages

### 📝 Canned Responses
- Save and reuse common responses to save time
- Organize responses for quick access
- Use them in the Human Inbox

### 📊 Analytics & Reporting
- Track leads captured, messages sent, resolutions, and more
- See daily usage trends
- Find knowledge gaps from unanswered questions
- Export leads and conversations to CSV

### 🎨 Customization
- Change widget colors, title, and avatar to match your brand
- Fully white-label for your clients

---

## 🛠️ Tech Stack
- **Backend**: Node.js + Express
- **AI**: Google Gemini, Hugging Face, Groq, LangChain
- **Vector Search**: Qdrant
- **Database**: Local JSON storage or Neon PostgreSQL
- **Frontend**: Vanilla JavaScript + CSS
- **Deployment**: Render.com (render.yaml included)

---

## 🚀 How to Deploy

### Deploy to Render
AICS is ready to deploy on Render in minutes!

1. **Fork this repo**: Use GitHub's fork button
2. **Create a Render account**: Free tier works great to get started
3. **Create a new web service**:
   - Runtime: Node.js
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Configure environment variables** in Render's dashboard:
   ```env
   PORT=3000
   NODE_ENV=production
   SESSION_SECRET=your-long-random-secret
   GEMINI_API_KEY=your-google-gemini-api-key (optional)
   HUGGINGFACE_API_KEY=your-huggingface-api-key (optional - for embeddings)
   GROQ_API_KEY=your-groq-api-key (optional - for LLM responses)
   QDRANT_URL=https://your-qdrant-cluster-url (optional - better search)
   QDRANT_API_KEY=your-qdrant-api-key (optional)
   SMTP_HOST=your-smtp-host (optional - for email alerts)
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   SMTP_FROM=noreply@yourdomain.com
   ```
5. **Deploy**: Save and deploy your service!

### Run Locally
Want to test or develop locally?

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

## 🌐 How to Embed the Widget
Once your AICS instance is deployed, add this script to your website to embed the chatbot!

### Basic Embed
```html
<script src="https://your-aics-instance.onrender.com/js/embed.js" data-business-id="YOUR_BUSINESS_ID"></script>
```

### Customized Embed
```html
<script src="https://your-aics-instance.onrender.com/js/embed.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-widget-title="My Awesome Support"
  data-widget-color="#667eea"
  data-widget-avatar="🤖"></script>
```

---

## 📈 Roadmap

### ✅ Done
- Human Inbox with conversation management
- Lead Scoring (Hot/Warm/Cold)
- Email notifications for new leads
- Webhooks for Zapier, Make, n8n
- Advanced analytics dashboard
- Knowledge gap detection
- CSV export for leads and conversations
- File attachments (images, PDFs, docs)
- Conversation history persistence
- Canned Responses
- Conversation Tags & Assignment
- Proactive Chat Triggers
- Multi-language support (15+ languages)
- Agent Collaboration Notes
- Neon PostgreSQL integration

### 🔄 Upcoming
- SMS notifications
- SSO integration
- More database options out of the box

---

## 📄 License
MIT License - use it commercially!

---

## 🙋 Need Help?
Open an issue on GitHub or reach out if you need assistance.

---

Made with ❤️ for builders and businesses everywhere.
