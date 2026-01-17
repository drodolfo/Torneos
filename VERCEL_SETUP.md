# Vercel Setup Instructions

## Required Environment Variables

You need to set the following environment variables in your Vercel project:

### 1. DATABASE_URL (Required)

This is the PostgreSQL connection string for your database.

**How to set it up for Supabase:**

1. **Get your Supabase connection string:**
   - Go to your [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Navigate to **Settings** → **Database**
   - Scroll down to **Connection string** section
   - Select **URI** tab (not Connection Pooling)
   - Copy the connection string (it should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - **Important:** Use the direct connection string, not the pooler connection string

2. **Add to Vercel:**
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Navigate to **Settings** → **Environment Variables**
   - Click **Add New**
   - Name: `DATABASE_URL`
   - Value: Your Supabase connection string (with password filled in)
   - **Critical:** Select **Production** environment (and Preview/Development if needed)
   - Click **Save**

3. **IMPORTANT - Redeploy after setting environment variables:**
   - Vercel only picks up new environment variables on new deployments
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy** (or push a new commit to trigger a redeploy)
   - Wait for the deployment to complete

4. **Run migrations:**
   - After setting DATABASE_URL, you need to run the database migrations
   - You can do this by:
     - Running `npm run migrate` locally (if you have DATABASE_URL set locally)
     - Or connecting to your database directly and running the SQL from `migrations/001_init.sql`

### 2. SESSION_SECRET (Optional but Recommended)

A secret key for encrypting session cookies. If not set, a fallback will be used (not secure for production).

- Generate a random string: `openssl rand -base64 32`
- Add as `SESSION_SECRET` in Vercel environment variables

### 3. ADMIN_USER and ADMIN_PASS (Optional)

Default admin credentials for bootstrapping the first admin user.

- `ADMIN_USER`: Default admin username
- `ADMIN_PASS`: Default admin password

## After Setting Environment Variables

1. **Redeploy your application:**
   - Go to Vercel dashboard → Your project → Deployments
   - Click the three dots on the latest deployment → Redeploy
   - Or push a new commit to trigger a redeploy

2. **Verify it's working:**
   - Visit `https://your-app.vercel.app/health`
   - You should see: `{"status":"ok","timestamp":"...","databaseUrl":"configured"}`

3. **Check the homepage:**
   - Visit `https://your-app.vercel.app/`
   - It should load without errors

## Troubleshooting

### "Database configuration error" or "DATABASE_URL not configured"
- **Most common issue:** Environment variable not set or not redeployed
- Make sure `DATABASE_URL` is set in Vercel **Settings → Environment Variables**
- **Critical:** You must redeploy after adding/changing environment variables
- Verify it's set for the **Production** environment (not just Preview/Development)
- Check the `/health` endpoint - it should show `"databaseUrl":"configured"`

### "ENOTFOUND" error (DNS resolution failed)
- The database hostname cannot be resolved
- **For Supabase:** Make sure you're using the correct connection string from Supabase Dashboard
- Verify the connection string format: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
- Check that you replaced `[YOUR-PASSWORD]` with your actual password
- Make sure you're using the **URI** connection string, not the pooler string
- **Solution:** Double-check the connection string in Supabase Dashboard → Settings → Database → Connection string → URI tab

### "Connection refused" error
- Your database might not allow external connections
- **For Supabase:** Supabase allows connections by default, but check:
  - Your connection string is correct
  - You're using the direct connection (port 5432), not the pooler
  - Your database password is correct

### Environment variable not being read
- **Common mistake:** Setting the variable but not redeploying
- Vercel only reads environment variables during deployment
- **Fix:** After setting/changing `DATABASE_URL`, you MUST redeploy:
  1. Go to Deployments tab
  2. Click three dots (⋯) on latest deployment
  3. Click Redeploy
  4. Or push a new commit to trigger automatic redeploy

### Verify environment variable is set
- Visit `https://your-app.vercel.app/health`
- Check the response - `databaseUrl` should be `"configured"` not `"not configured"`
- If it shows `"not configured"`, the environment variable is not set or not being read

### Supabase-specific issues
- Make sure you're using the **URI** connection string (not Connection Pooling)
- The connection string should start with `postgresql://` or `postgres://`
- Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- Replace `[PASSWORD]` with your actual database password
- Replace `[PROJECT-REF]` with your Supabase project reference
