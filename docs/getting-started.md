# Getting Started with AICS

Welcome to AICS! This guide will help you get up and running in no time.

## Prerequisites

1. A modern web browser
2. A valid email address to create an account
3. A domain name (for embedding the widget)
4. (Optional) A Google Gemini API key (if self-hosting)

## Step 1: Create an Account

1. Go to your AICS instance (e.g., https://your-aics-instance.com)
2. Click "Sign Up"
3. Fill in your name, email, and password
4. Verify your email (if required)
5. Log in to your account

## Step 2: Add Your Business

1. Once logged in, you'll be taken to the dashboard
2. Click "Create New Business"
3. Fill in the form:
   - **Business Name**: Your company name
   - **Domain Name**: Your website's domain (e.g., yourcompany.com)
4. Click "Create Business"

## Step 3: Verify Your Domain (Optional but Recommended)

Verifying your domain helps ensure that only you can use the chat widget on your site.

### Option 1: DNS TXT Record (Recommended)

1. In your dashboard, go to your business details
2. Copy the TXT record value (e.g., `aics-verification=abc123`)
3. Log in to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare)
4. Go to your domain's DNS management
5. Add a new TXT record:
   - **Host/Name**: Leave blank or use `@`
   - **Value**: Paste the verification value
   - **TTL**: Set to automatic or 300
6. Wait 5-15 minutes for DNS propagation
7. Go back to your dashboard and click "Verify via DNS"

### Option 2: HTML File Upload

1. In your dashboard, go to your business details
2. Copy the verification filename (e.g., `aics-verification-abc123.html`)
3. Create an empty HTML file with this name
4. Upload it to your website's root directory (public_html, www, etc.)
5. Go back to your dashboard and click "Verify via HTML"

## Step 4: Train Your Chatbot

Now it's time to teach your chatbot about your business!

### Add FAQs Manually

1. Go to your business settings
2. Click on the "Knowledge" tab
3. Click "Add FAQ"
4. Fill in:
   - **Question**: A common question your customers ask
   - **Answer**: The answer to that question
5. Click "Save"
6. Repeat for all your important FAQs

### Train from a Website

1. Go to your business settings
2. Click on the "Knowledge" tab
3. Go to "Website Training"
4. Enter your website URL (e.g., https://yourcompany.com)
5. Click "Train"
6. Wait a few minutes while the bot reads your website

### Train from PDFs

1. Go to your business settings
2. Click on the "Knowledge" tab
3. Go to "PDF Training"
4. Click "Upload PDF"
5. Select your PDF files (you can upload multiple)
6. Wait while the bot processes your documents

## Step 5: Customize Your Widget

1. Go to your business settings
2. Click on the "Widget" tab
3. Customize:
   - **Widget Title**: The title shown in the chat window header
   - **Primary Color**: The main color of the widget (use your brand color!)
   - **Avatar Emoji**: A friendly emoji to represent your chatbot
4. Click "Save Settings"

## Step 6: Embed the Widget on Your Website

1. In your business settings, click on the "Embed" tab
2. Copy the embed code
3. Paste it just before the closing `</body>` tag on your website
4. Refresh your website - the chat widget should appear in the bottom right corner!

## Next Steps

- Test your chatbot by asking questions
- Monitor your leads and analytics in the dashboard
- Add more FAQs as you get more questions
- Customize the widget to match your brand perfectly

## Need Help?

If you run into any issues:
1. Check the FAQs in your dashboard
2. Open an issue on GitHub (if self-hosting)
3. Contact support (if using a hosted version)
