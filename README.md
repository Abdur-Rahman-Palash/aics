# AICS - AI Customer Support SaaS

Production‑ready AI customer support platform for any business. It uses vector search to answer questions from your custom FAQs, powered by Google Gemini and Qdrant Cloud.

## 🚀 What Is AICS?

AICS (AI Customer Support) is a lightweight, embeddable chat widget that:
- 📖 Answers questions from your business FAQ/knowledge base
- 🔍 Uses vector similarity search for accurate results
- 🌐 Responds in natural language (English, Bangla, etc.)
- 📡 Communicates in real‑time with Socket.IO
- 🎯 Collects leads (future phase)
- 👥 Escalates to human support when needed (future phase)

## ✅ Current Features (Phase 1, Phase 2 & Phase 3 Progress)

### Phase 1 (Complete)
- ✅ Beautiful, responsive floating chat widget
- ✅ Real‑time messaging via Socket.IO
- ✅ FAQ upload admin page
- ✅ Google Gemini AI integration
- ✅ Qdrant Cloud vector search integration
- ✅ Suggested questions from uploaded FAQs
- ✅ Works completely free on Vercel Free Tier

### Phase 2 (Started)
- ✅ Dashboard UI (public/dashboard.html)
- ✅ Multiple businesses data structure (lib/businesses.js)
- ✅ Analytics tracking foundation
- 🚧 More features coming soon (full dashboard, full analytics)

### Phase 3 (Started)
- ✅ Embeddable widget script (js/embed.js)
- ✅ Multilingual support (auto-detects user's language, EN/BN selector)
- 📝 Subscription SaaS plan (Free, Basic, Pro tiers planned)

## 📁 Project Structure

```
aics/
├── api/                # Vercel API Routes
│   ├── chat.js         # Chat API (for REST fallback)
│   ├── upload-faqs.js  # FAQ Upload API
│   └── get-faqs.js     # Get All FAQs API
├── css/                # Stylesheets
│   └── chat-widget.css # Chat widget styles
├── js/                 # Frontend JavaScript
│   ├── chat-widget.js  # Chat widget core logic
│   └── embed.js        # Embeddable widget script for external sites
├── lib/                # Backend libraries
│   ├── config.js       # App configuration
│   ├── gemini.js       # Gemini AI integration
│   ├── qdrant.js       # Qdrant vector DB integration
│   └── businesses.js   # Business & analytics management
├── public/             # Public static files
│   ├── index.html      # Demo page with chat widget
│   ├── admin.html      # Admin page for FAQ upload
│   └── dashboard.html  # Admin dashboard (Phase 2)
├── data/               # Data storage (created automatically)
│   └── businesses.json # Business & analytics data
├── .env.example        # Environment variables example
├── .gitignore          # Git ignore rules
├── package.json        # Project dependencies & scripts
├── server.js           # Local Express server (with Socket.IO)
├── vercel.json         # Vercel deployment config
├── test-chat-api.js    # Helper script to test chat endpoint
├── test-upload.js      # Helper script to test FAQ upload
└── available-models.json # List of Gemini models (optional)
```

## 🔧 Setup Instructions (Step-by-Step)

### 1. Get Your API Keys

First, you'll need these 3 things:

a) **Google Gemini API Key**:
   - Go to https://aistudio.google.com/app/apikey
   - Create an API key (copy it, you'll need it soon!)

b) **Qdrant Cloud Free Cluster**:
   - Go to https://cloud.qdrant.io/ and create a free account
   - Create a new cluster (choose Free Tier)
   - When it's ready, copy the **Cluster URL** and **API Key**

### 2. Set Up Environment Variables

1. In your project folder, copy the file `.env.example` and rename it to `.env`
2. Open `.env` and fill in your keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   QDRANT_URL=your_qdrant_cluster_url_here
   QDRANT_API_KEY=your_qdrant_api_key_here
   ```

### 3. Install Project Dependencies

Open your terminal/command prompt, go to the project folder and run:
```bash
npm install
```

### 4. Run the App Locally

Start the server:
```bash
npm run dev
```

Then open your browser and go to:
- **Demo Page**: http://localhost:3000/ (try the chat widget!)
- **Admin Page**: http://localhost:3000/admin (upload your FAQs!)

### 5. Upload Your FAQs

1. Go to the admin page (http://localhost:3000/admin)
2. Add your business FAQs (question + answer)
3. Click the "Upload FAQs" button
4. Go back to the demo page – your FAQs will show up as suggested questions!

## 🤖 How It Works (Simplified)

Here's what happens when a user sends a message:

1. **User sends question**: User types a question in the chat widget
2. **Socket.IO real-time**: Message is sent to the server instantly
3. **Gemini creates embedding**: Gemini converts the question into a numerical vector
4. **Qdrant vector search**: Qdrant finds your most similar FAQs
5. **Gemini crafts response**: Gemini uses those FAQs to generate a natural answer
6. **Response appears**: Answer is shown in the chat widget!

## 🌐 Deploying to Vercel (Free)

To make your AICS live on the internet:

1. Push your code to GitHub
2. Go to https://vercel.com and connect your GitHub account
3. Import your aics project
4. Add your environment variables (GEMINI_API_KEY, QDRANT_URL, QDRANT_API_KEY) in Vercel's settings
5. Click Deploy – your AICS is live for free!

## 📌 Key Tech Stack Constraints Followed

- ✅ No React/Vue/jQuery/Tailwind/TypeScript
- ✅ Vanilla HTML/CSS/JS only
- ✅ Node.js/Vercel API Routes for backend
- ✅ Qdrant Cloud vector DB
- ✅ Google Gemini AI
- ✅ Socket.IO for real‑time

## 🎯 Upcoming Phases (Planned Features)

- Phase 2: Dashboard, analytics, multi‑business support
- Phase 3: Embeddable widget, multilingual, subscription SaaS

## 📝 Notes

- Make sure you use valid Qdrant cluster URL (should look like: `https://your-cluster-name.qdrant.io:6333`)
- The free tiers for both Gemini and Qdrant are perfect for testing and small businesses!

Enjoy using your own AI customer support!
