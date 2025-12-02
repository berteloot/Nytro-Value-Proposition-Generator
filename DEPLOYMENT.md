# Deployment Checklist

## Pre-Deployment

- [x] `.gitignore` configured to exclude sensitive files
- [x] `.env.example` created with all required variables
- [x] `render.yaml` configured for Render deployment
- [x] `package.json` includes Node.js version requirements
- [x] `.nvmrc` file created for Node version specification
- [x] README.md updated with deployment instructions

## GitHub Setup

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push to GitHub:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

## Render Deployment

### Option 1: Using Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Review the service configuration
6. Add environment variables in the Render dashboard:
   - `OPENAI_API_KEY` (required)
   - `OPENAI_MODEL` (optional, defaults to `gpt-4o`)
   - `HUBSPOT_API_KEY` (optional)
   - `SENDGRID_API_KEY` (optional)
   - `SENDGRID_FROM_EMAIL` (optional)
7. Click "Apply" to deploy

### Option 2: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `nytro-value-prop-engine`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter (or higher)
5. Add environment variables (same as above)
6. Click "Create Web Service"

## Post-Deployment

- [ ] Verify the application is accessible
- [ ] Test all API endpoints
- [ ] Verify environment variables are set correctly
- [ ] Check application logs for any errors
- [ ] Test OpenAI integration
- [ ] Test optional integrations (HubSpot, SendGrid) if configured

## Environment Variables Reference

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | ❌ No | Model to use (default: `gpt-4o`) | - |
| `HUBSPOT_API_KEY` | ❌ No | HubSpot API key | [HubSpot Settings](https://app.hubspot.com/settings/private-apps) |
| `SENDGRID_API_KEY` | ❌ No | SendGrid API key | [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys) |
| `SENDGRID_FROM_EMAIL` | ❌ No | Sender email address | Your verified SendGrid email |

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs in Render dashboard

### Application Crashes
- Check environment variables are set correctly
- Review application logs in Render dashboard
- Verify API keys are valid

### API Errors
- Verify `OPENAI_API_KEY` is set and valid
- Check API rate limits
- Review error logs

## Notes

- The application requires at least Node.js 18
- Render's Starter plan is suitable for development/testing
- For production, consider upgrading to a higher plan
- Monitor usage to avoid exceeding API rate limits








