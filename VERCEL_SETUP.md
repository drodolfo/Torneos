# Vercel Setup Instructions

## Required Environment Variables

You need to set the following environment variables in your Vercel project:

### 1. DATABASE_URL (Required)

This is the PostgreSQL connection string for your database.

**How to set it up:**

1. **If you don't have a database yet:**
   - Sign up for a free PostgreSQL database at [Supabase](https://supabase.com) or [Neon](https://neon.tech)
   - Create a new project
   - Get your connection string from the project settings

2. **If you already have a database:**
   - Get your connection string from your database provider
   - Format: `postgresql://user:password@host:port/database`

3. **Add to Vercel:**
   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Environment Variables**
   - Click **Add New**
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Select all environments (Production, Preview, Development)
   - Click **Save**

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

### "Database configuration error" message
- Make sure `DATABASE_URL` is set in Vercel
- Verify the connection string format is correct
- Check that your database allows connections from Vercel's IP addresses

### "ENOTFOUND" error
- The database hostname cannot be resolved
- Check that your DATABASE_URL is correct
- Verify your database is accessible

### "Connection refused" error
- Your database might not allow external connections
- Check your database firewall settings
- Make sure your database provider allows connections from Vercel
