# n8n Email Notification Setup Guide

Complete guide to set up automated email notifications for document requests with offline queue support.

## 🎯 How It Works

1. **User submits form** → Data saved to `document_requests` table
2. **Database trigger** → Creates notification in `notification_queue` table
3. **n8n polls queue** → Every 2 minutes, checks for pending notifications
4. **Sends email** → Processes each notification and sends email
5. **Marks as sent** → Updates queue status to 'sent'

**✨ Offline Resilience:** If n8n is offline, notifications accumulate in the queue. When n8n comes back online, it automatically processes all pending notifications.

---

## 📋 Prerequisites

- Docker and Docker Compose installed
- Supabase database running
- Gmail account (or other SMTP provider) for sending emails

---

## 🚀 Step-by-Step Setup

### Step 1: Set Up Supabase Queue Table

1. **Open Supabase SQL Editor**
   - Go to: https://qxswelavrvfgtpyukijb.supabase.co/project/qxswelavrvfgtpyukijb/sql

2. **Run the queue setup SQL**
   - Copy all contents from `database/schemas/010-notification-queue.sql`
   - Paste into SQL Editor
   - **IMPORTANT:** Before running, change line 61:
     ```sql
     recipient_email,
     'your-email@example.com', -- ⚠️ CHANGE THIS to your actual email
     ```
     Change to your actual email address!

3. **Click "Run"**
   - You should see: `Success. No rows returned`
   - Verify the table exists: Table Editor → `notification_queue`

---

### Step 2: Start n8n with Docker

1. **Navigate to your project directory**
   ```bash
   cd /home/user/Landing-Page
   ```

2. **Start n8n**
   ```bash
   docker-compose -f docker-compose.n8n.yml up -d
   ```

3. **Wait for n8n to start (30-60 seconds)**
   ```bash
   docker logs -f n8n-estimate-reliance
   ```
   Wait until you see: `Editor is now accessible via: http://localhost:5678/`

4. **Open n8n in your browser**
   - Go to: http://localhost:5678
   - Create your account (first-time setup)
   - Set email and password

---

### Step 3: Configure Supabase Connection in n8n

1. **In n8n, go to: Credentials → Add Credential**

2. **Search for "Postgres"**

3. **Fill in Supabase connection details:**
   ```
   Name: Supabase PostgreSQL
   Host: db.qxswelavrvfgtpyukijb.supabase.co
   Database: postgres
   User: postgres
   Password: [Your Supabase database password]
   Port: 5432
   SSL: Enable
   ```

4. **Get your Supabase database password:**
   - Supabase Dashboard → Settings → Database → Connection string
   - Look for: `postgresql://postgres:[PASSWORD]@...`
   - Copy the password part

5. **Click "Save"**

---

### Step 4: Configure Email (Gmail) in n8n

#### Option A: Gmail with App Password (Recommended)

1. **Enable 2FA on your Gmail account**
   - Go to: https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - App: Mail
   - Device: Other (Custom name: "n8n")
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **In n8n, go to: Credentials → Add Credential → SMTP**
   ```
   Name: Gmail SMTP
   User: your-email@gmail.com
   Password: [16-character app password]
   Host: smtp.gmail.com
   Port: 587
   Secure: Enable
   ```

4. **Click "Save"**

#### Option B: Other Email Providers

**SendGrid:**
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: [Your SendGrid API key]
```

**Mailgun:**
```
Host: smtp.mailgun.org
Port: 587
User: [Your Mailgun SMTP username]
Password: [Your Mailgun SMTP password]
```

---

### Step 5: Import Workflow

1. **In n8n, click "Workflows" in the top menu**

2. **Click "Add Workflow" → Import from File**

3. **Upload the workflow file:**
   - File: `n8n-workflows/document-request-notifications.json`

4. **The workflow will open - you'll see 6 nodes:**
   - Poll Queue Every 2 Minutes
   - Get Pending Notifications
   - Has Notifications?
   - Send Email
   - Mark as Sent
   - Mark as Failed

---

### Step 6: Configure Workflow Nodes

#### Node 1: Poll Queue Every 2 Minutes
- ✅ Already configured (runs every 2 minutes)
- You can change this: Click node → Adjust interval

#### Node 2: Get Pending Notifications
- ✅ Already configured
- Uses your Supabase credential
- Fetches up to 10 pending notifications at a time

#### Node 4: Send Email
- **Click the node**
- **Update "From Email"**: Change to your email address
- **Customize email template** (optional):
  - The HTML template is already set up
  - You can modify it to match your branding

#### Node 5 & 6: Mark as Sent/Failed
- ✅ Already configured
- Automatically updates the queue

---

### Step 7: Test the Workflow

1. **Click "Execute Workflow" button** (play icon in top right)

2. **Check execution:**
   - If there are pending notifications, they'll be processed
   - If none, you'll see "No data, execution succeeded"

3. **Submit a test document request:**
   - Go to your website
   - Fill out the Customized Documents form
   - Submit it

4. **Wait 2 minutes** (or manually execute workflow)

5. **Check your email** - you should receive the notification!

6. **Verify in Supabase:**
   - Table Editor → `notification_queue`
   - The notification should show `status: sent`

---

### Step 8: Activate the Workflow

1. **Click the "Inactive" toggle** in the top right

2. **It will turn to "Active"** (green)

3. **The workflow now runs automatically every 2 minutes!**

---

## 🧪 Testing Offline Resilience

### Test Scenario: n8n Goes Offline

1. **Stop n8n:**
   ```bash
   docker-compose -f docker-compose.n8n.yml down
   ```

2. **Submit 2-3 document requests** on your website

3. **Check Supabase:**
   - Go to Table Editor → `notification_queue`
   - You should see notifications with `status: pending`

4. **Start n8n again:**
   ```bash
   docker-compose -f docker-compose.n8n.yml up -d
   ```

5. **Wait 2-3 minutes**

6. **Check your email** - all pending notifications should arrive!

7. **Check Supabase again** - all should show `status: sent`

✅ **Success!** The queue system works even when n8n is offline.

---

## 🛠️ Troubleshooting

### Issue: No emails being sent

**Check 1: Workflow is active**
- n8n → Workflows → Make sure toggle is "Active" (green)

**Check 2: SMTP credentials are correct**
- n8n → Credentials → Test your SMTP connection
- Gmail: Make sure you're using an App Password, not your regular password

**Check 3: Notifications in queue**
- Supabase → Table Editor → `notification_queue`
- Check if `status = 'pending'`

**Check 4: Check n8n logs**
```bash
docker logs n8n-estimate-reliance
```

---

### Issue: "Connection refused" to Supabase

**Solution:**
- Make sure you're using the correct Supabase host:
  - Host: `db.qxswelavrvfgtpyukijb.supabase.co` (not `qxswelavrvfgtpyukijb.supabase.co`)
- Make sure SSL is enabled
- Check your database password

---

### Issue: Notifications stuck in "processing"

**Cause:** n8n crashed mid-execution

**Solution:**
```sql
-- Reset stuck notifications (run in Supabase SQL Editor)
UPDATE notification_queue
SET status = 'pending', processed_at = NULL
WHERE status = 'processing';
```

---

### Issue: Duplicate emails

**Cause:** Multiple n8n instances running

**Solution:**
```bash
# Stop all n8n containers
docker-compose -f docker-compose.n8n.yml down

# Start only one
docker-compose -f docker-compose.n8n.yml up -d
```

---

## 📊 Monitoring & Maintenance

### View Queue Status

```sql
-- See pending notifications
SELECT * FROM notification_queue
WHERE status = 'pending'
ORDER BY created_at DESC;

-- See failed notifications
SELECT * FROM notification_queue
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Count by status
SELECT status, COUNT(*)
FROM notification_queue
GROUP BY status;
```

### Manually Retry Failed Notifications

```sql
-- Reset failed notifications to pending (max 3 attempts)
UPDATE notification_queue
SET status = 'pending', attempts = 0, last_error = NULL
WHERE status = 'failed'
AND attempts < max_attempts;
```

### Clean Up Old Notifications

```sql
-- Delete sent notifications older than 30 days
DELETE FROM notification_queue
WHERE status = 'sent'
AND sent_at < NOW() - INTERVAL '30 days';
```

---

## 🔧 Advanced Configuration

### Change Polling Interval

1. Open workflow in n8n
2. Click "Poll Queue Every 2 Minutes" node
3. Change interval (e.g., every 1 minute, every 5 minutes)
4. Save workflow

### Customize Email Template

1. Open workflow in n8n
2. Click "Send Email" node
3. Edit the HTML in the "Message" field
4. You can use these variables:
   - `{{ $json.body_data.contact_name }}`
   - `{{ $json.body_data.email }}`
   - `{{ $json.body_data.phone }}`
   - `{{ $json.body_data.company_name }}`
   - `{{ $json.body_data.document_type }}`
   - `{{ $json.body_data.pricing_tier }}`
   - `{{ $json.body_data.document_title }}`
   - `{{ $json.body_data.document_description }}`
   - `{{ $json.body_data.specific_requirements }}`
   - `{{ $json.body_data.use_case }}`
   - `{{ $json.body_data.additional_notes }}`
   - `{{ $json.created_at }}`

### Add File Attachments

Currently, file URLs are included in the email body. To attach actual files:

1. Add "HTTP Request" node before "Send Email"
2. Download each file from `{{ $json.attachments[0].url }}`
3. Pass binary data to "Send Email" node
4. Enable "Attachments" in Send Email node

---

## 🚀 Production Deployment

### Option 1: Keep Docker on Your Server

**Pros:**
- Simple setup
- Full control
- No additional costs

**Cons:**
- Requires your server to be always on

**Steps:**
1. Move `docker-compose.n8n.yml` to your production server
2. Run: `docker-compose -f docker-compose.n8n.yml up -d`
3. Set up SSL/HTTPS with nginx reverse proxy (optional)

### Option 2: Use n8n Cloud

**Pros:**
- Always online (99.9% uptime)
- Managed service
- No server maintenance

**Cons:**
- Monthly cost (~$20/month)

**Steps:**
1. Sign up at: https://n8n.io/cloud
2. Import your workflow
3. Configure credentials

---

## 📧 Email Templates (Bonus)

### Professional Email Template

Replace the email content in the "Send Email" node with this:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #06b6d4; }
    .label { font-weight: bold; color: #06b6d4; }
    .value { margin-top: 5px; color: #555; }
    .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #666; font-size: 12px; }
    .badge { display: inline-block; padding: 5px 15px; background: #10b981; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 New Document Request</h1>
      <p>Reference: {{ $json.body_data.request_id }}</p>
    </div>
    <div class="content">

      <div class="section">
        <h2>👤 Contact Information</h2>
        <p><span class="label">Name:</span><br><span class="value">{{ $json.body_data.contact_name }}</span></p>
        <p><span class="label">Email:</span><br><span class="value">{{ $json.body_data.email }}</span></p>
        <p><span class="label">Phone:</span><br><span class="value">{{ $json.body_data.phone }}</span></p>
        <p><span class="label">Company:</span><br><span class="value">{{ $json.body_data.company_name }}</span></p>
      </div>

      <div class="section">
        <h2>📋 Document Details</h2>
        <p><span class="badge">{{ $json.body_data.document_type }}</span> <span class="badge">{{ $json.body_data.pricing_tier }}</span></p>
        <p><span class="label">Title:</span><br><span class="value">{{ $json.body_data.document_title }}</span></p>
        <p><span class="label">Description:</span><br><span class="value">{{ $json.body_data.document_description }}</span></p>
      </div>

      <div class="section">
        <h2>📝 Requirements</h2>
        <p><span class="value">{{ $json.body_data.specific_requirements }}</span></p>
      </div>

      <div class="section">
        <h2>💡 Use Case</h2>
        <p><span class="value">{{ $json.body_data.use_case }}</span></p>
      </div>

      <div class="section">
        <h2>📎 Additional Notes</h2>
        <p><span class="value">{{ $json.body_data.additional_notes }}</span></p>
      </div>

      <div class="footer">
        <p>Submitted: {{ $json.created_at }}</p>
        <p>Estimate Reliance © 2024</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## ✅ Checklist

- [ ] Supabase queue table created
- [ ] Email address updated in trigger function
- [ ] n8n Docker container running
- [ ] Supabase PostgreSQL credential configured
- [ ] Gmail SMTP credential configured
- [ ] Workflow imported
- [ ] Email "From" address updated
- [ ] Workflow activated
- [ ] Test submission sent
- [ ] Email received
- [ ] Queue status verified

---

## 🆘 Support

**Need help?**
- Check logs: `docker logs n8n-estimate-reliance`
- Check queue: Supabase → Table Editor → `notification_queue`
- Test manually: n8n → Execute Workflow

**Common commands:**
```bash
# Start n8n
docker-compose -f docker-compose.n8n.yml up -d

# Stop n8n
docker-compose -f docker-compose.n8n.yml down

# View logs
docker logs -f n8n-estimate-reliance

# Restart n8n
docker-compose -f docker-compose.n8n.yml restart
```

---

🎉 **You're all set!** Your automated email notification system is now running with full offline resilience.
