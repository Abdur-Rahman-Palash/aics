# 🚀 AICS - AI Customer Support SaaS

**Sell more, support less.**

A complete, white-label AI customer support chatbot platform that lets you embed a smart bot on any website in minutes. Built for small businesses, agencies, and developers – and **100% ready to deploy on Render.com**!

---

## 🎯 Why AICS? (For Non-Tech People)

Imagine having a 24/7 employee that:
- ✅ Answers customer questions instantly
- ✅ Captures leads even when you're asleep
- ✅ Learns from your website, PDFs, and FAQs
- ✅ Looks like *your* brand
- ✅ Costs way less than hiring another support person

That's exactly what AICS gives you – no coding required!

---

## �️ Tech Stack (For Developers)

AICS is built with modern, reliable tools that make deployment and customization a breeze:

- **Backend**: Node.js + Express (production-proven)
- **AI Brain**: Google Gemini (state-of-the-art language models)
- **Smart Search**: Qdrant (vector search for accurate knowledge retrieval)
- **Database**: Simple JSON storage (easy to swap to PostgreSQL/MongoDB if needed)
- **Frontend**: Vanilla JS + CSS (lightning-fast, no heavy frameworks)
- **Deployment**: **Render.com** (we've already set up render.yaml for you!)

---

## ✨ Key Features That Sell

<table>
  <tr>
    <td valign="top">
      <h3>🤖 Smart AI Chatbot</h3>
      <ul>
        <li>Trained on your unique knowledge</li>
        <li>Human-like responses</li>
        <li>Understands context</li>
      </ul>
    </td>
    <td valign="top">
      <h3>📚 Easy Training</h3>
      <ul>
        <li>Scrape your website</li>
        <li>Upload PDFs</li>
        <li>Add FAQs manually</li>
      </ul>
    </td>
    <td valign="top">
      <h3>👥 Lead Capture</h3>
      <ul>
        <li>Shows form when bot can't help</li>
        <li>Collects name, email, phone</li>
        <li>Real-time alerts (coming soon)</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h3>🎨 Fully Customizable</h3>
      <ul>
        <li>Change colors, avatar, title</li>
        <li>Matches your brand</li>
        <li>Draggable on desktop</li>
      </ul>
    </td>
    <td valign="top">
      <h3>📱 Mobile-Friendly</h3>
      <ul>
        <li>Looks perfect on phones</li>
        <li>Works on tablets</li>
        <li>Responsive by default</li>
      </ul>
    </td>
    <td valign="top">
      <h3>🔒 Secure</h3>
      <ul>
        <li>User authentication</li>
        <li>CSRF protection</li>
        <li>Rate limiting</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🚀 Deploy to Render in 5 Minutes (It Really Works!)

Yes, **everything is already set up for Render.com**! Here's how to do it:

### Step 1: Fork This Repo
Click "Use this template" or "Fork" on GitHub to get your own copy of AICS.

### Step 2: Create a Render Account
Go to [render.com](https://render.com) and sign up (free tier works great!).

### Step 3: Create a New Web Service
1. Connect your GitHub account
2. Select your forked AICS repository
3. Use these settings:
   - **Runtime**: Node.js
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Step 4: Set Environment Variables
Add these in Render's dashboard (make sure NODE_ENV is production):
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=change-this-to-a-long-random-secret-key
GEMINI_API_KEY=your-google-gemini-api-key-here
QDRANT_URL=https://your-qdrant-cluster-url (optional but recommended)
QDRANT_API_KEY=your-qdrant-api-key (optional)
```

### Step 5: Deploy!
Hit "Save & Deploy" – Render will take care of the rest! 🎉

---

## 💻 Local Development

Want to run it on your computer first? Here's how:

1. Install Node.js (v16 or later)
2. Clone the repo: `git clone https://github.com/yourusername/aics.git`
3. Install dependencies: `npm install`
4. Create a `.env` file (copy from `.env.example`)
5. Start the server: `npm run dev`
6. Visit http://localhost:3000

---

## 🔧 How to Use It (Step by Step)

### For Business Owners
1. **Sign Up / Login**: Go to your AICS instance and make an account
2. **Create Your Business**: Add your business name and domain
3. **Train the Bot**:
   - Enter your website URL (we'll scrape it)
   - Upload PDF documents
   - Add FAQs manually
4. **Customize**: Change colors, avatar, and widget title
5. **Embed It**: Copy the embed code and paste it on your website before `</body>`

### For Developers
Embed the widget in seconds:
```html
<script src="https://your-aics-instance.onrender.com/js/embed.js" data-business-id="YOUR_BUSINESS_ID"></script>
```

Or customize it:
```html
<script src="https://your-aics-instance.onrender.com/js/embed.js" 
  data-business-id="YOUR_BUSINESS_ID"
  data-widget-title="My Awesome Support"
  data-widget-color="#667eea"
  data-widget-avatar="🤖"></script>
```

---

## 📈 Roadmap (Upcoming Features That Add Value!)

- [ ] Email/SMS notifications for new leads
- [ ] Multi-language support (English + more)
- [ ] Advanced analytics dashboard
- [ ] Direct human handoff
- [ ] SSO integration
- [ ] Webhooks for zapier/automations
- [ ] More database options out of the box

---

## 💡 Ready to Sell This?

AICS is perfect for:
- 🛠️ Developers building SaaS products
- 🏢 Agencies serving small businesses
- 🏪 Small business owners wanting their own support bot

The MIT license lets you use it commercially – go make money! 💰

---

## 📝 License

MIT License - go nuts! Use it for personal or commercial projects.

---

## 🙋 Need Help?

Open an issue on GitHub, or reach out! We're here to help.

---

Made with ❤️ for builders and businesses everywhere!
