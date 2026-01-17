import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// --- Home page ---
router.get('/', async (req, res) => {
  try {
    const visibleTournaments = (await query('SELECT id, name, rules FROM tournaments WHERE visible = true ORDER BY name')).rows;
    res.render('public/home', { tournaments: visibleTournaments });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    
    // Provide more helpful error messages
    if (err.code === 'DATABASE_URL_MISSING' || err.message?.includes('DATABASE_URL')) {
      res.status(500).send(`
        <html>
          <head><title>Configuration Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>Database Configuration Error</h1>
            <p>The DATABASE_URL environment variable is not configured.</p>
            <p>Please set it in your Vercel project settings.</p>
            <hr>
            <h2>How to Fix:</h2>
            <ol style="text-align: left; max-width: 600px; margin: 0 auto;">
              <li>Go to your Vercel project dashboard</li>
              <li>Navigate to <strong>Settings → Environment Variables</strong></li>
              <li>Add a new variable:
                <ul>
                  <li><strong>Name:</strong> DATABASE_URL</li>
                  <li><strong>Value:</strong> Your PostgreSQL connection string</li>
                </ul>
              </li>
              <li>Format: <code>postgresql://user:password@host:port/database</code></li>
              <li>Redeploy your application</li>
            </ol>
          </body>
        </html>
      `);
    } else if (err.code === 'ENOTFOUND') {
      // Check if it's a Supabase connection
      const isSupabase = err.message?.includes('.supabase.co') || err.hostname?.includes('.supabase.co');
      if (isSupabase) {
        res.status(503).send(`
          <html>
            <head>
              <title>Database Temporarily Unavailable</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #333;">⚠️ Database Temporarily Unavailable</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  The database connection cannot be established. This usually happens when the Supabase project is paused.
                </p>
                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 20px; margin: 20px 0; text-align: left;">
                  <h3 style="margin-top: 0; color: #856404;">Most Common Cause: Supabase Project is Paused</h3>
                  <p style="color: #856404; margin-bottom: 0;">
                    Free tier Supabase projects automatically pause after 7 days of inactivity. 
                    The project needs to be restored in the Supabase Dashboard.
                  </p>
                </div>
                <hr style="margin: 30px 0;">
                <h2 style="color: #333;">For Administrators:</h2>
                <ol style="text-align: left; color: #666; line-height: 1.8;">
                  <li>Go to <a href="https://app.supabase.com" target="_blank">Supabase Dashboard</a></li>
                  <li>Select your project</li>
                  <li>If you see "Project Paused", click <strong>"Restore project"</strong></li>
                  <li>Wait 2-3 minutes for the database to be restored</li>
                  <li>Refresh this page</li>
                </ol>
                <p style="color: #999; font-size: 14px; margin-top: 30px;">
                  Error: ENOTFOUND - Hostname cannot be resolved<br>
                  Hostname: ${err.hostname || 'unknown'}
                </p>
              </div>
            </body>
          </html>
        `);
      } else {
        res.status(503).send(`
          <html>
            <head><title>Database Unavailable</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
              <h1>Database Connection Error</h1>
              <p>The database server cannot be reached. Please try again later.</p>
              <p style="color: #999; font-size: 14px;">Error: ${err.message}</p>
            </body>
          </html>
        `);
      }
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      res.status(503).send(`
        <html>
          <head><title>Database Unavailable</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>Database Temporarily Unavailable</h1>
            <p>The database connection could not be established. Please try again later.</p>
            <p style="color: #999; font-size: 14px;">Error: ${err.code}</p>
          </body>
        </html>
      `);
    } else {
      res.status(500).send(`
        <html>
          <head><title>Server Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1>Internal Server Error</h1>
            <p>An unexpected error occurred. Please try again later.</p>
          </body>
        </html>
      `);
    }
  }
});

router.get('/inicio', async (req, res) => {
  try {
    const visibleTournaments = (await query('SELECT id, name, rules FROM tournaments WHERE visible = true ORDER BY name')).rows;
    res.render('public/home', { tournaments: visibleTournaments });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- Tabla de posiciones ---
router.get('/table', async (req, res) => {
  try {
    const visibleTournaments = (await query('SELECT id, name FROM tournaments WHERE visible = true ORDER BY name')).rows;
    const selectedTournament = req.query.tournament && visibleTournaments.some(t => t.id == req.query.tournament) ? req.query.tournament : null;
    let table = [];
    if (selectedTournament) {
      const querySql = `
        SELECT t.id,
               t.name,
               t.user_name,
               tr.name AS tournament_name,
               COUNT(m.id) AS played,
               SUM(CASE
                     WHEN (m.home_team_id = t.id AND m.home_goals > m.away_goals)
                       OR (m.away_team_id = t.id AND m.away_goals > m.home_goals)
                     THEN 1 ELSE 0 END) AS wins,
               SUM(CASE WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) AS draws,
               SUM(CASE
                     WHEN (m.home_team_id = t.id AND m.home_goals < m.away_goals)
                       OR (m.away_team_id = t.id AND m.away_goals < m.home_goals)
                     THEN 1 ELSE 0 END) AS losses,
               SUM(CASE WHEN m.home_team_id = t.id THEN m.home_goals ELSE m.away_goals END) AS gf,
               SUM(CASE WHEN m.home_team_id = t.id THEN m.away_goals ELSE m.home_goals END) AS ga,
               SUM(CASE WHEN m.home_team_id = t.id THEN m.home_goals - m.away_goals
                        ELSE m.away_goals - m.home_goals END) AS gd,
               SUM(CASE
                     WHEN (m.home_team_id = t.id AND m.home_goals > m.away_goals)
                       OR (m.away_team_id = t.id AND m.away_goals > m.home_goals)
                     THEN 3
                     WHEN m.home_goals = m.away_goals THEN 1
                     ELSE 0 END) AS points
        FROM teams t
        JOIN tournaments tr ON t.tournament_id = tr.id
        LEFT JOIN matches m ON t.id IN (m.home_team_id, m.away_team_id)
        WHERE t.tournament_id = $1
        GROUP BY t.id, t.name, t.user_name, tr.name
        ORDER BY points DESC, gd DESC, gf DESC
      `;
      const result = await query(querySql, [selectedTournament]);
      table = result.rows;
    }

    res.render('public/table', { table, visibleTournaments, selectedTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- Perfil de equipo ---
router.get('/team/:id', async (req, res) => {
  try {
    const teamRes = await query('SELECT * FROM teams WHERE id = $1', [req.params.id]);
    const team = teamRes.rows[0];
    if (!team) return res.status(404).send('Equipo no encontrado');

    res.render('public/team_profile', { team });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- Resultados ---
router.get('/results', async (req, res) => {
  try {
    const visibleTournaments = (await query('SELECT id, name FROM tournaments WHERE visible = true ORDER BY name')).rows;
    const selectedTournament = req.query.tournament && visibleTournaments.some(t => t.id == req.query.tournament) ? req.query.tournament : null;
    let results = [];
    if (visibleTournaments.length > 0) {
      let querySql, params;
      if (selectedTournament) {
        querySql = `SELECT m.*, ht.name AS home_name, at.name AS away_name, tr.name AS tournament_name
                    FROM matches m
                    JOIN teams ht ON m.home_team_id = ht.id
                    JOIN teams at ON m.away_team_id = at.id
                    JOIN tournaments tr ON m.tournament_id = tr.id
                    WHERE m.status = 'played' AND m.tournament_id = $1
                    ORDER BY m.match_date DESC`;
        params = [selectedTournament];
      } else {
        const tournamentIds = visibleTournaments.map(t => t.id);
        const placeholders = tournamentIds.map((_, i) => `$${i + 1}`).join(',');
        querySql = `SELECT m.*, ht.name AS home_name, at.name AS away_name, tr.name AS tournament_name
                    FROM matches m
                    JOIN teams ht ON m.home_team_id = ht.id
                    JOIN teams at ON m.away_team_id = at.id
                    JOIN tournaments tr ON m.tournament_id = tr.id
                    WHERE m.status = 'played' AND m.tournament_id IN (${placeholders})
                    ORDER BY m.match_date DESC`;
        params = tournamentIds;
      }
      results = (await query(querySql, params)).rows;
    }

    res.render('public/results', { results, visibleTournaments, selectedTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- Partidos (fixtures) ---
router.get('/fixtures', async (req, res) => {
  try {
    const visibleTournaments = (await query('SELECT id, name FROM tournaments WHERE visible = true ORDER BY name')).rows;
    const selectedTournament = req.query.tournament && visibleTournaments.some(t => t.id == req.query.tournament) ? req.query.tournament : null;
    let fixtures = [];
    if (visibleTournaments.length > 0) {
      let querySql, params;
      if (selectedTournament) {
        querySql = `SELECT m.*, ht.name AS home_name, at.name AS away_name, tr.name AS tournament_name
                    FROM matches m
                    JOIN teams ht ON m.home_team_id = ht.id
                    JOIN teams at ON m.away_team_id = at.id
                    JOIN tournaments tr ON m.tournament_id = tr.id
                    WHERE m.status = 'scheduled' AND m.tournament_id = $1
                    ORDER BY m.match_date ASC`;
        params = [selectedTournament];
      } else {
        const tournamentIds = visibleTournaments.map(t => t.id);
        const placeholders = tournamentIds.map((_, i) => `$${i + 1}`).join(',');
        querySql = `SELECT m.*, ht.name AS home_name, at.name AS away_name, tr.name AS tournament_name
                    FROM matches m
                    JOIN teams ht ON m.home_team_id = ht.id
                    JOIN teams at ON m.away_team_id = at.id
                    JOIN tournaments tr ON m.tournament_id = tr.id
                    WHERE m.status = 'scheduled' AND m.tournament_id IN (${placeholders})
                    ORDER BY m.match_date ASC`;
        params = tournamentIds;
      }
      fixtures = (await query(querySql, params)).rows;
    }

    res.render('public/fixtures', { fixtures, visibleTournaments, selectedTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- Reglas ---
router.get('/rules', async (req, res) => {
  try {
    const visibleTournaments = (await query('SELECT id, name FROM tournaments WHERE visible = true ORDER BY name')).rows;
    const selectedTournament = req.query.tournament && visibleTournaments.some(t => t.id == req.query.tournament) ? req.query.tournament : null;
    let rules = '';
    let tournamentName = '';
    if (selectedTournament) {
      const tournamentRes = await query('SELECT name, rules FROM tournaments WHERE id = $1 AND visible = true', [selectedTournament]);
      if (tournamentRes.rows.length > 0) {
        tournamentName = tournamentRes.rows[0].name;
        rules = tournamentRes.rows[0].rules || '';
      }
    }

    res.render('public/rules', { rules, tournamentName, visibleTournaments, selectedTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- Equipos por torneo ---
router.get('/tournament-teams', async (req, res) => {
  try {
    const visibleTournaments = (await query('SELECT id, name FROM tournaments WHERE visible = true ORDER BY name')).rows;
    const selectedTournament = req.query.tournament && visibleTournaments.some(t => t.id == req.query.tournament) ? req.query.tournament : null;
    let teams = [];
    let tournamentName = '';
    if (selectedTournament) {
      const tournamentRes = await query('SELECT name FROM tournaments WHERE id = $1 AND visible = true', [selectedTournament]);
      if (tournamentRes.rows.length > 0) {
        tournamentName = tournamentRes.rows[0].name;
        teams = (await query('SELECT name, user_name, edad, locacion, contacto FROM teams WHERE tournament_id = $1 ORDER BY name', [selectedTournament])).rows;
      }
    }

    res.render('public/tournament_teams', { teams, tournamentName, visibleTournaments, selectedTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});


export default router;
