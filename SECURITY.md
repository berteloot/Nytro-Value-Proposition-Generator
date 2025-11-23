# Security Guide - API Key Protection

This document outlines the security measures in place to protect API keys and sensitive credentials.

## API Key Security

### Server-Side Only Access
All API keys are **strictly server-side only** and are never exposed to the client:

- ✅ **OPENAI_API_KEY** - Used only in server-side API routes and lib functions
- ✅ **HUBSPOT_API_KEY** - Used only in server-side API routes and lib functions  
- ✅ **SENDGRID_API_KEY** - Used only in server-side API routes and lib functions
- ✅ **SENDGRID_FROM_EMAIL** - Used only in server-side API routes

### Protection Mechanisms

1. **Next.js Environment Variables**
   - API keys use `process.env` which is **NOT** prefixed with `NEXT_PUBLIC_`
   - Variables without `NEXT_PUBLIC_` prefix are **never** exposed to the browser
   - Only server-side code (API routes, Server Components, Server Actions) can access these variables

2. **API Routes**
   - All API calls are made through Next.js API routes in `/app/api/`
   - These routes run **exclusively on the server**
   - Client components only make HTTP requests to these routes, never directly access API keys

3. **Error Handling**
   - Error messages never expose API key values
   - Only generic error messages are returned to clients (e.g., "API key not configured")
   - Detailed error information is logged server-side only

4. **Git Protection**
   - `.env` and `.env*.local` files are excluded from version control (see `.gitignore`)
   - Never commit API keys to the repository

### File Structure

```
app/
  api/              # Server-side only - API keys accessible here
    send-email/
    research/
    ...
lib/                # Server-side only - API keys accessible here
  openai.ts         # Uses OPENAI_API_KEY
  hubspot.ts        # Uses HUBSPOT_API_KEY
components/         # Client-side - NO API key access
  ...               # Only makes fetch() calls to /api routes
```

### Best Practices

1. **Never use `NEXT_PUBLIC_` prefix** for API keys
2. **Never log API keys** in console.log, error messages, or responses
3. **Never pass API keys** to client components as props
4. **Always validate** API keys exist before use, but don't expose their values
5. **Use environment variables** for all sensitive credentials

### Verification Checklist

- [x] All API keys use `process.env` without `NEXT_PUBLIC_` prefix
- [x] No API keys in client components (`'use client'` files)
- [x] All API routes are in `/app/api/` (server-side only)
- [x] Error messages don't expose API key values
- [x] `.gitignore` excludes `.env` files
- [x] No console.log statements that could leak API keys

### If You Suspect a Key Has Been Exposed

1. **Immediately rotate/regenerate** the exposed API key in the provider's dashboard
2. **Review access logs** for unauthorized usage
3. **Update the key** in your environment variables
4. **Review code** to identify and fix the exposure point

