# Soccer Tournament

A web application for managing soccer tournaments.

## Setup

1. Install dependencies: `npm install`
2. Set up database: Set `DATABASE_URL` environment variable
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

## Deployment on Render

1. Connect this GitHub repo to Render
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:
   - `NODE_ENV`: production
   - `DATABASE_URL`: Your PostgreSQL connection string
   - Other config vars as needed
6. Deploy

For database, you can use Render's managed PostgreSQL or external providers like Supabase.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_BOOTSTRAP_USER`: Admin username
- `ADMIN_BOOTSTRAP_PASS`: Admin password
- `SESSION_SECRET`: Session secret