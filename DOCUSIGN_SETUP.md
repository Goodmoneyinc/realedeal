# DocuSign Integration Setup Guide

This guide will help you configure DocuSign integration for your real estate CRM platform.

## Prerequisites

- A DocuSign account (Developer or Production)
- Admin access to your Supabase project

## Step 1: Create a DocuSign Application

1. Log in to your DocuSign account
   - For development: https://admindemo.docusign.com/
   - For production: https://admin.docusign.com/

2. Navigate to **Settings > Apps and Keys**

3. Click **Add App and Integration Key**

4. Fill in the application details:
   - App Name: Your CRM Name
   - Description: Real Estate CRM E-Signature Integration

5. Save and note your **Integration Key** (this is your Client ID)

## Step 2: Configure Authentication

DocuSign supports multiple authentication methods. For server-to-server integration, we recommend using **JWT Grant Authentication**.

### JWT Grant Setup

1. In your DocuSign app settings, under **Authentication**, select **JWT Grant**

2. Generate an **RSA Keypair**:
   - Click **Generate RSA**
   - Download the private key file
   - Save it securely - you'll need it later

3. Add a **Redirect URI** (required but not used for JWT):
   - `https://your-app-domain.com/callback`

4. Note your **Account ID**:
   - Found in Settings > API and Keys > Account ID
   - Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

5. Grant Consent:
   - Click the **Generate Consent URL** button
   - Visit the URL in your browser
   - Log in and grant consent

## Step 3: Obtain an Access Token

DocuSign access tokens expire after 8 hours. For production, you should implement automatic token refresh.

### Getting Your First Access Token

You can use DocuSign's API to obtain a JWT token. Here's a sample request:

```bash
POST https://account-d.docusign.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=YOUR_JWT_TOKEN
```

For detailed instructions, see: https://developers.docusign.com/platform/auth/jwt/jwt-get-token/

## Step 4: Configure Supabase Environment Variables

You need to add three environment variables to your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings > Edge Functions > Secrets**
3. Add the following secrets:

```
DOCUSIGN_ACCOUNT_ID=your-account-id-here
DOCUSIGN_ACCESS_TOKEN=your-access-token-here
DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi
```

**Notes:**
- For production, use: `https://na3.docusign.net/restapi` (or your region)
- For development/sandbox, use: `https://demo.docusign.net/restapi`
- Access tokens expire every 8 hours - implement refresh logic for production

## Step 5: Set Up Webhooks (Optional but Recommended)

Webhooks allow DocuSign to notify your application of signature events in real-time.

1. In your DocuSign app settings, find **Webhooks**

2. Add a new webhook endpoint:
   - URL: `https://your-project.supabase.co/functions/v1/docusign-webhook`
   - Events to monitor:
     - envelope-sent
     - envelope-delivered
     - recipient-completed
     - envelope-completed
     - envelope-declined
     - envelope-voided

3. Save the webhook configuration

## Step 6: Test the Integration

1. Log in to your CRM
2. Upload a document to the Document Hub
3. Mark it as "Requires Signature"
4. Click "Request Signature" and add recipient details
5. Click "Send for Signature"

You should receive a confirmation, and the recipient will get an email from DocuSign.

## Production Deployment Checklist

- [ ] Switch from sandbox to production DocuSign account
- [ ] Update DOCUSIGN_BASE_URL to production URL
- [ ] Implement automatic JWT token refresh
- [ ] Configure webhook endpoints for production
- [ ] Test with real documents and recipients
- [ ] Set up monitoring and error alerting
- [ ] Review DocuSign API usage limits

## Token Refresh Implementation

For production, implement automatic token refresh. Here's the flow:

1. Store the refresh token securely
2. Check token expiration before each API call
3. If expired, request a new token using the refresh token
4. Update the environment variable or cache

## Troubleshooting

### "DocuSign not configured" Error

This means the environment variables are not set in Supabase. Follow Step 4 above.

### "Failed to create envelope" Error

- Verify your access token is valid and not expired
- Check that your Integration Key is correct
- Ensure the document file is accessible
- Verify recipient email addresses are valid

### Webhook Not Receiving Events

- Confirm the webhook URL is publicly accessible
- Check Supabase Edge Function logs for errors
- Verify webhook events are enabled in DocuSign

## Additional Resources

- [DocuSign Developer Center](https://developers.docusign.com/)
- [DocuSign API Reference](https://developers.docusign.com/docs/esign-rest-api/reference/)
- [JWT Authentication Guide](https://developers.docusign.com/platform/auth/jwt/)
- [Webhook Events Reference](https://developers.docusign.com/platform/webhooks/connect/)

## Support

For integration issues, contact your development team or refer to:
- DocuSign Developer Support
- Supabase Documentation
- Your CRM administrator
