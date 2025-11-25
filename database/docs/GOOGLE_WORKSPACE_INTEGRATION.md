# Google Workspace Email Integration

## Overview

This integration allows users to send emails through Gmail API using their own email address, perfect for:
- Sending estimate notifications to clients
- Communicating with insurance adjusters
- Automated follow-up emails
- Document sharing with branded emails

## Setup Process

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Estimate Reliance CRM"
3. Enable Gmail API:
   - Go to **APIs & Services** → **Library**
   - Search for "Gmail API"
   - Click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (or Internal if Google Workspace organization)
3. Fill in application details:
   - App name: "Estimate Reliance CRM"
   - User support email: your-email@estimatereliance.com
   - Developer contact: your-email@estimatereliance.com
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (during development)

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: "Estimate Reliance Web Client"
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/google/callback
   https://your-production-domain.com/api/auth/google/callback
   https://your-vercel-domain.vercel.app/api/auth/google/callback
   ```
6. Save **Client ID** and **Client Secret**

### 4. Environment Variables

Add to `.env.local` and Vercel:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

## Database Schema

User table already includes Google Workspace fields:

```sql
-- users table
google_workspace_email VARCHAR(255)  -- Email for sending
google_refresh_token TEXT            -- OAuth refresh token
google_token_expires_at TIMESTAMP    -- Token expiry
```

## Implementation

### Next.js API Route for OAuth

```typescript
// app/api/auth/google/route.ts
import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    // Step 1: Redirect to Google OAuth
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      prompt: 'consent', // Forces refresh token
    })
    return NextResponse.redirect(authUrl)
  }

  // Step 2: Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  // Get user info
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data: userInfo } = await oauth2.userinfo.get()

  // Save to database
  const supabase = await createClient()
  await supabase.from('users').update({
    google_workspace_email: userInfo.email,
    google_refresh_token: tokens.refresh_token, // ENCRYPT THIS!
    google_token_expires_at: new Date(tokens.expiry_date!),
  }).eq('id', 'current-user-id')

  return NextResponse.redirect('/portal/dashboard?gmail=connected')
}
```

### Sending Email Function

```typescript
// lib/gmail.ts
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase-server'

export async function sendEmailAsUser(userId: string, emailData: {
  to: string
  subject: string
  body: string
  attachments?: Array<{ filename: string; content: Buffer }>
}) {
  // Get user's Google credentials
  const supabase = await createClient()
  const { data: user } = await supabase
    .from('users')
    .select('google_workspace_email, google_refresh_token')
    .eq('id', userId)
    .single()

  if (!user?.google_refresh_token) {
    throw new Error('User has not connected Gmail')
  }

  // Set up OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    refresh_token: user.google_refresh_token,
  })

  // Create Gmail client
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Compose email
  const message = [
    `From: ${user.google_workspace_email}`,
    `To: ${emailData.to}`,
    `Subject: ${emailData.subject}`,
    '',
    emailData.body,
  ].join('\n')

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // Send email
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  })

  return result.data
}
```

### Usage Example

```typescript
// app/api/estimates/send/route.ts
import { sendEmailAsUser } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { estimateId, recipientEmail } = await request.json()

  try {
    await sendEmailAsUser('current-user-id', {
      to: recipientEmail,
      subject: 'Your Estimate from Estimate Reliance',
      body: `
        Hello,

        Please find your estimate attached.

        Best regards,
        Estimate Reliance Team
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Security Considerations

### 1. Encrypt Refresh Tokens

**CRITICAL**: Never store refresh tokens in plain text!

```typescript
// lib/crypto.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY! // 32 bytes
const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}
```

### 2. Token Rotation

```typescript
// Check token expiry before sending
if (user.google_token_expires_at < new Date()) {
  // Token expired, refresh it
  const { credentials } = await oauth2Client.refreshAccessToken()

  // Update database
  await supabase.from('users').update({
    google_refresh_token: encrypt(credentials.refresh_token!),
    google_token_expires_at: new Date(credentials.expiry_date!),
  }).eq('id', userId)
}
```

### 3. Scope Limitations

Only request minimal scopes needed:
- ✅ `gmail.send` - Send emails only
- ❌ `gmail.readonly` - DON'T request unless needed
- ❌ `gmail.modify` - DON'T request unless needed

## UI Components

### Connect Gmail Button

```typescript
'use client'

export function ConnectGmailButton() {
  const handleConnect = () => {
    window.location.href = '/api/auth/google'
  }

  return (
    <button onClick={handleConnect} className="btn-primary">
      Connect Gmail Account
    </button>
  )
}
```

### Email Status Indicator

```typescript
'use client'

import { useEffect, useState } from 'react'

export function GmailStatus() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(r => r.json())
      .then(data => setConnected(data.connected))
  }, [])

  return (
    <div>
      {connected ? (
        <span className="text-green-600">✓ Gmail Connected</span>
      ) : (
        <span className="text-yellow-600">⚠ Gmail Not Connected</span>
      )}
    </div>
  )
}
```

## Testing

### Test Email Sending

```bash
curl -X POST http://localhost:3000/api/estimates/send \
  -H "Content-Type: application/json" \
  -d '{
    "estimateId": "estimate-uuid",
    "recipientEmail": "test@example.com"
  }'
```

### Check Token Status

```sql
SELECT
  email,
  google_workspace_email,
  google_token_expires_at,
  CASE
    WHEN google_token_expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END as token_status
FROM users
WHERE google_workspace_email IS NOT NULL;
```

## Production Checklist

- [ ] Enable Gmail API in Google Cloud
- [ ] Configure OAuth consent screen
- [ ] Add production redirect URIs
- [ ] Set environment variables in Vercel
- [ ] Implement token encryption
- [ ] Add token refresh logic
- [ ] Test email sending
- [ ] Monitor API quotas
- [ ] Set up error logging
- [ ] Request production OAuth approval (if needed)

## Quotas & Limits

Gmail API limits:
- **Free tier**: 1 billion quota units/day
- **Sending emails**: ~100 units per email
- **Daily send limit**: ~500 emails/day (can request increase)

Monitor usage:
- [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Dashboard
