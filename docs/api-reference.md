# API Reference

This document describes the AICS API.

## Base URL

All requests are made relative to your instance's base URL:

```
https://your-aics-instance.com/api
```

## Authentication

Most endpoints require authentication. Include your session cookie (set automatically after login) or use `credentials: 'include'` in your fetch requests.

## Rate Limiting

The API uses rate limiting to prevent abuse:
- 5 requests per 15 minutes for auth endpoints
- 100 requests per 15 minutes for other endpoints

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Optional success message",
  "data": {} // Optional response data
}
```

Or for errors:

```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Authentication Endpoints

### Sign Up

Create a new user account.

**Endpoint**: `POST /auth/signup`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### Login

Authenticate a user.

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### Logout

End the current user's session.

**Endpoint**: `POST /auth/logout`

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Get Current User

Get the authenticated user's information.

**Endpoint**: `GET /auth/me`

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## Business Endpoints

### Get Businesses

Get all businesses owned by the authenticated user.

**Endpoint**: `GET /businesses`

**Response**:
```json
{
  "success": true,
  "businesses": [
    {
      "id": "business-uuid",
      "name": "My Business",
      "domain": "mybusiness.com",
      "userId": "user-uuid",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "qdrantCollection": "aics_my_business",
      "widgetSettings": {
        "title": "My Support",
        "primaryColor": "#667eea",
        "avatar": "🤖"
      },
      "verification": {
        "status": "unverified",
        "method": null,
        "token": "verification-token",
        "verifiedAt": null
      },
      "faqs": [],
      "knowledgeSources": {
        "websites": [],
        "pdfs": []
      },
      "leads": [],
      "analytics": {
        "totalMessages": 0,
        "faqHits": {},
        "lastActive": "2026-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

### Create Business

Create a new business.

**Endpoint**: `POST /businesses`

**Request Body**:
```json
{
  "name": "My Business",
  "domain": "mybusiness.com"
}
```

**Response**:
```json
{
  "success": true,
  "business": {
    "id": "business-uuid",
    "name": "My Business",
    "domain": "mybusiness.com",
    // ... full business object
  }
}
```

---

## Knowledge Endpoints

### Train Website

Train the chatbot on a website.

**Endpoint**: `POST /businesses/:id/website`

**Request Body**:
```json
{
  "url": "https://mybusiness.com"
}
```

**Response**:
```json
{
  "success": true,
  "website": {
    "id": "website-uuid",
    "url": "https://mybusiness.com",
    "status": "pending",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### Upload PDF

Upload and train on a PDF document.

**Endpoint**: `POST /businesses/:id/pdf`

**Request**: `multipart/form-data` with a file field named `file`

**Response**:
```json
{
  "success": true,
  "pdf": {
    "id": "pdf-uuid",
    "name": "document.pdf",
    "status": "pending",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

## Verification Endpoints

### Verify Domain

Verify ownership of a domain.

**Endpoint**: `POST /businesses/:id/verify`

**Request Body**:
```json
{
  "method": "dns" // or "html"
}
```

**Response (success)**:
```json
{
  "success": true,
  "message": "Domain verified successfully"
}
```

**Response (failure)**:
```json
{
  "success": false,
  "error": "Verification failed. Couldn't find TXT record..."
}
```

---

## Lead Endpoints

### Add Lead

Add a new lead.

**Endpoint**: `POST /businesses/:id/leads`

**Request Body**:
```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+1234567890",
  "message": "I have a question about your product"
}
```

**Response**:
```json
{
  "success": true,
  "lead": {
    "id": "lead-uuid",
    "name": "Customer Name",
    "email": "customer@example.com",
    "status": "new",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### Get Leads

Get all leads for a business.

**Endpoint**: `GET /businesses/:id/leads`

**Response**:
```json
{
  "success": true,
  "leads": [
    {
      "id": "lead-uuid",
      "name": "Customer Name",
      "email": "customer@example.com",
      "status": "new",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### Update Lead Status

Update a lead's status.

**Endpoint**: `PUT /businesses/:id/leads/:leadId`

**Request Body**:
```json
{
  "status": "contacted" // "new", "contacted", or "closed"
}
```

**Response**:
```json
{
  "success": true,
  "lead": {
    "id": "lead-uuid",
    "status": "contacted"
  }
}
```
