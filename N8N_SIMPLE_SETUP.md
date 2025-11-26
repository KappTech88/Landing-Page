# Simple n8n Setup (HTTP Method)

**No PostgreSQL connection needed!** Uses Supabase REST API instead.

---

## Step 1: Create Supabase API Credential

1. **In n8n → Credentials → Add Credential**
2. **Search:** "Header Auth"
3. **Fill in:**
   ```
   Name: Supabase API

   Header Name: apikey
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3dlbGF2cnZmZ3RweXVraWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDAxNzg5MywiZXhwIjoyMDc5NTkzODkzfQ.WE0cFE99i5LpCfF7TxFaZHv0mKKHOCgjQEhbmHZdvRs
   ```
4. **Click Save**

---

## Step 2: Import Workflow

1. **n8n → Workflows → Import from File**
2. **Select file:** `n8n-workflows/document-request-notifications-http.json`
3. **Done!**

---

## Step 3: Update Nodes

**Only 2 things to update:**

### Node: "Send Email"
- Click the node
- Change **From Email** to: `bryant@estimatereliance.com`
- Make sure **Credential** is: `SendGrid SMTP` (should already be selected)

### All HTTP Request Nodes
- They should auto-select the `Supabase API` credential
- If not, manually select it

---

## Step 4: Activate

1. **Click "Inactive" toggle** → turns green "Active"
2. **Done!**

---

## Test It

1. **Go to your website**
2. **Submit a document request**
3. **Wait 2 minutes** (or click "Execute Workflow" manually)
4. **Check your email!**

---

## Troubleshooting

**No email received?**
```bash
# Check n8n logs
docker logs n8n-estimate-reliance
```

**Check queue in Supabase:**
- Go to: Table Editor → `notification_queue`
- Should see status: `sent`

---

That's it! No PostgreSQL connection needed.
