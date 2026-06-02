# AICS - AI Customer Support

A complete AI-powered customer support chatbot platform that can be embedded on any website.

## Features

- 🤖 **AI Chatbot**: Powered by Google Gemini AI
- 📚 **Knowledge Base**: Train on your website content and PDF documents
- 🔒 **Domain Verification**: Verify domain ownership before embedding the widget
- � **Responsive Design**: Works perfectly on desktop and mobile devices
- �️ **Draggable Widget**: Users can move the chat widget around on desktop
- � **Customizable Widget**: Customize colors, avatar, and title
- � **Analytics**: Track chat volume and FAQ usage
- 👥 **Lead Capture**: Collect customer information through the chat
- 🔐 **User Authentication**: Secure login and signup system

## Tech Stack

- **Backend**: Node.js + Express
- **AI**: Google Gemini (for responses) + Qdrant (for vector search)
- **Database**: JSON file storage (simple, but easy to replace with PostgreSQL/MongoDB)
- **Frontend**: Vanilla JavaScript + CSS (no heavy frameworks)
- **Deployment**: Render (or any Node.js hosting platform)

## Quick Start

### Prerequisites

1. Node.js (v16 or later)
2. A Google Gemini API key
3. (Optional) A Qdrant account for vector search

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/aics.git
cd aics
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Authentication
SESSION_SECRET=your-super-secret-key-change-this-in-production

# AI
GEMINI_API_KEY=your-gemini-api-key

# Vector Search (optional but recommended)
QDRANT_URL=https://your-qdrant-cluster-url
QDRANT_API_KEY=your-qdrant-api-key
```

4. **Start the server**

```bash
npm run dev
```

5. **Open the app**

Visit http://localhost:3000 in your browser.

## Usage

### For Website Owners

1. **Sign up and login**
   - Go to your AICS instance and create an account

2. **Create a business**
   - Click "Create New Business"
   - Enter your business name and domain name

3. **Verify your domain** (recommended)
   - Choose either DNS TXT record or HTML file verification
   - Follow the instructions on the dashboard

4. **Add knowledge sources**
   - **Website**: Enter your website URL to train the bot
   - **PDF**: Upload PDF documents with your business information
   - **FAQs**: Add manually through the admin interface

5. **Customize your widget**
   - Go to your business settings
   - Set your widget title, primary color, and avatar

6. **Embed the widget**
   - Copy the embed code from your dashboard
   - Paste it before the closing `</body>` tag on your website

### For Developers

#### Embed the Widget

```html
<script src="https://your-aics-instance.com/js/embed.js" data-business-id="YOUR_BUSINESS_ID"></script>
```

#### API Endpoints

**Authentication**:
- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login to an existing account
- `POST /api/auth/logout` - Logout from the current session
- `GET /api/auth/me` - Get current user information

**Businesses**:
- `GET /api/businesses` - Get businesses for the authenticated user
- `POST /api/businesses` - Create a new business

**Knowledge Sources**:
- `POST /api/businesses/:id/website` - Train on a website
- `POST /api/businesses/:id/pdf` - Train on a PDF document

**Verification**:
- `POST /api/businesses/:id/verify` - Verify domain ownership

## Customization

### Widget Customization

You can customize the widget through the dashboard or by modifying the embed code:

```html
<script src="https://your-aics-instance.com/js/embed.js" 
  data-business-id="YOUR_BUSINESS_ID"
  data-widget-title="My Support"
  data-widget-color="#4CAF50"
  data-widget-avatar="👨‍💼"></script>
```

### Backend Customization

- The backend uses a simple JSON file storage system (`lib/storage.js`)
- You can easily replace it with PostgreSQL, MongoDB, or any other database
- Modify `lib/config.js` to change default settings

## Deployment

### Deploy to Render

1. **Fork this repository** to your GitHub account

2. **Create a new Web Service** on Render:
   - Connect your GitHub account
   - Select the forked repository
   - Choose Node.js as the environment

3. **Set environment variables**:
   - Add all variables from `.env`
   - Set `NODE_ENV` to `production`

4. **Deploy!**

### Other Platforms

The app should work on any Node.js hosting platform (Vercel, Railway, Heroku, AWS, etc.). Just make sure to set the environment variables correctly.

## Security Best Practices

### For Production Deployments

1. **Always use HTTPS**: Never use HTTP in production
2. **Secure your SESSION_SECRET**: Use a long, random secret key
3. **Don't commit secrets**: Never commit `.env` file or sensitive information
4. **Use rate limiting**: Already implemented, but you can customize it
5. **Regularly update dependencies**: Run `npm audit` and keep dependencies up to date
6. **Use a proper database**: Replace the JSON file storage with PostgreSQL/MongoDB for production
7. **Add CSRF protection**: Consider using the `csurf` middleware
8. **Set secure cookies**: Already implemented for production

## Roadmap

- [ ] Multi-language support
- [ ] Email notifications for new leads
- [ ] More analytics and reporting
- [ ] Human handoff feature
- [ ] SSO integration
- [ ] Webhooks for events

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this for personal or commercial projects!

## Support

If you have any questions or need help, please open an issue on GitHub!

---

Made with ❤️ by [Your Name]
