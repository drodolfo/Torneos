import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// --- Home page ---
router.get('/', async (req, res) => {
  const visibleTournaments = (await query('SELECT id, name, rules FROM tournaments WHERE visible = true ORDER BY name')).rows;
  res.render('public/home', { tournaments: visibleTournaments });
});

router.get('/inicio', async (req, res) => {
  const visibleTournaments = (await query('SELECT id, name, rules FROM tournaments WHERE visible = true ORDER BY name')).rows;
  res.render('public/home', { tournaments: visibleTournaments });
});

// --- Tabla de posiciones ---
router.get('/table', async (req, res) => {
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
});

// --- Perfil de equipo ---
router.get('/team/:id', async (req, res) => {
  const teamRes = await query('SELECT * FROM teams WHERE id = $1', [req.params.id]);
  const team = teamRes.rows[0];
  if (!team) return res.status(404).send('Equipo no encontrado');

  res.render('public/team_profile', { team });
});

// --- Resultados ---
router.get('/results', async (req, res) => {
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
});

// --- Partidos (fixtures) ---
router.get('/fixtures', async (req, res) => {
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
});

// --- Reglas ---
router.get('/rules', async (req, res) => {
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
});

// --- Equipos por torneo ---
router.get('/tournament-teams', async (req, res) => {
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
});


export default router;
