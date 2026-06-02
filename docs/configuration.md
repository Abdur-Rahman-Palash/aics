# Configuration Guide

This guide explains all the configuration options for AICS.

## Environment Variables

Create a `.env` file in your project root with these variables:

### Server Configuration

| Variable | Description | Required? | Default |
|----------|-------------|-----------|---------|
| `PORT` | The port the server will listen on | No | 3000 |
| `NODE_ENV` | Environment mode (`development` or `production`) | No | development |

### Authentication

| Variable | Description | Required? | Default |
|----------|-------------|-----------|---------|
| `SESSION_SECRET` | Secret key for cookie encryption | **Yes** | None |
| `SESSION_MAX_AGE` | Session expiration time in milliseconds | No | 604800000 (7 days) |

### AI (Gemini)

| Variable | Description | Required? | Default |
|----------|-------------|-----------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API key | **Yes** | None |
| `GEMINI_MODEL` | Gemini model to use | No | gemini-flash-latest |
| `GEMINI_EMBEDDING_MODEL` | Embedding model to use | No | gemini-embedding-001 |

### Vector Search (Qdrant)

| Variable | Description | Required? | Default |
|----------|-------------|-----------|---------|
| `QDRANT_URL` | Your Qdrant cluster URL | No | None |
| `QDRANT_API_KEY` | Your Qdrant API key | No | None |
| `QDRANT_COLLECTION_NAME` | Qdrant collection name | No | aics_faqs |

### Rate Limiting

| Variable | Description | Required? | Default |
|----------|-------------|-----------|---------|
| `RATE_LIMIT_WINDOW_MS` | Time window for rate limiting | No | 900000 (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | No | 100 |

## Config File

For advanced configuration, you can modify `lib/config.js`:

```javascript
module.exports = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-flash-latest',
    embeddingModel: 'gemini-embedding-001',
  },
  qdrant: {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: 'aics_faqs',
  },
  app: {
    name: 'AICS - AI Customer Support',
  },
};
```

## Widget Configuration

You can configure the widget in two ways:

1. **Through the Dashboard**:
   - Go to your business settings
   - Click the "Widget" tab
   - Customize your settings and save

2. **Through Embed Code Attributes**:
   - Add these attributes to your script tag:

```html
<script src="https://your-aics-instance.com/js/embed.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-widget-title="My Support"
  data-widget-color="#4CAF50"
  data-widget-avatar="👨‍💼"
  data-widget-position="bottom-right"
  data-widget-z-index="9999"></script>
```

## Cookie Configuration

Cookies are configured in `server.js`:

```javascript
app.use(cookieSession({
  name: 'aics-session',
  keys: [process.env.SESSION_SECRET],
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
}));
```

## Important Notes for Production

1. **Always set `NODE_ENV=production`** - This enables secure cookies and other production optimizations
2. **Use a long, random `SESSION_SECRET`** - Generate one using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Keep API keys secure** - Never commit them to version control
4. **Always use HTTPS** - In production, never use HTTP
5. **Set secure cookies** - Already done automatically when `NODE_ENV=production`

## Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| Cookie Secure | false | true |
| SameSite | lax | none |
| Error messages | Detailed | Generic |
| Static file caching | Disabled | Enabled |
