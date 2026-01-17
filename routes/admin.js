import express from 'express';
import { query } from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Middleware para verificar sesión de admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/admin/login');
}

// --- LOGIN ---
router.get('/login', (req, res) => {
  res.render('admin/login');
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminRes = await query('SELECT password_hash FROM admins WHERE username = $1', [username]);
    if (adminRes.rows.length > 0 && await bcrypt.compare(password, adminRes.rows[0].password_hash)) {
      req.session.isAdmin = true;
      res.redirect('/admin/dashboard');
    } else {
      res.render('admin/login', { error: 'Credenciales inválidas' });
    }
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

// --- DASHBOARD ---
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const tournaments = (await query('SELECT * FROM tournaments ORDER BY name')).rows;
    let selectedTournament = req.query.tournament;
    if (!selectedTournament || !tournaments.some(t => t.id == selectedTournament)) {
      selectedTournament = tournaments[0]?.id || null;
    }
    const teamsCount = selectedTournament ? (await query('SELECT COUNT(*) FROM teams WHERE tournament_id = $1', [selectedTournament])).rows[0].count : 0;
    const matchesCount = selectedTournament ? (await query('SELECT COUNT(*) FROM matches WHERE tournament_id = $1', [selectedTournament])).rows[0].count : 0;
    const currentTournament = selectedTournament ? tournaments.find(t => t.id == selectedTournament) : null;
    res.render('admin/dashboard', { teamsCount, matchesCount, tournaments, selectedTournament, currentTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- GESTIONAR TORNEOS ---
router.get('/tournaments', requireAdmin, async (req, res) => {
  try {
    const tournaments = (await query('SELECT * FROM tournaments ORDER BY created_at DESC')).rows;
    res.render('admin/tournaments', { tournaments });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/tournaments', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    await query('INSERT INTO tournaments (name) VALUES ($1)', [name.trim()]);
    res.redirect('/admin/tournaments');
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/tournaments/:id/toggle', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE tournaments SET visible = NOT visible WHERE id = $1', [req.params.id]);
    res.redirect('/admin/tournaments');
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/tournaments/:id/delete', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM tournaments WHERE id = $1', [req.params.id]);
    res.redirect('/admin/tournaments');
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- EDITAR REGLAS ---
router.get('/tournaments/:id/rules', requireAdmin, async (req, res) => {
  try {
    const tournamentRes = await query('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
    const tournament = tournamentRes.rows[0];
    if (!tournament) return res.status(404).send('Torneo no encontrado');
    res.render('admin/edit_rules', { tournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/tournaments/:id/rules', requireAdmin, async (req, res) => {
  try {
    const { rules } = req.body;
    await query('UPDATE tournaments SET rules = $1 WHERE id = $2', [rules, req.params.id]);
    res.redirect('/admin/tournaments');
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- GESTIONAR EQUIPOS ---
router.get('/teams', requireAdmin, async (req, res) => {
  try {
    const tournaments = (await query('SELECT * FROM tournaments ORDER BY name')).rows;
    let selectedTournament = req.query.tournament;
    if (!selectedTournament || !tournaments.some(t => t.id == selectedTournament)) {
      selectedTournament = tournaments[0]?.id || null;
    }
    const teams = selectedTournament ? (await query('SELECT * FROM teams WHERE tournament_id = $1 ORDER BY name', [selectedTournament])).rows : [];
    res.render('admin/teams', { teams, tournaments, selectedTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/teams', requireAdmin, async (req, res) => {
  try {
    const { name, user_name, edad, locacion, contacto, tournament_id } = req.body;
    const trimmedName = name.trim();

    // Check if team name already exists in this tournament
    const existing = await query('SELECT id FROM teams WHERE name = $1 AND tournament_id = $2', [trimmedName, tournament_id]);
    if (existing.rows.length > 0) {
      // Redirect back with error or render with error message
      const tournaments = (await query('SELECT * FROM tournaments ORDER BY name')).rows;
      const teams = (await query('SELECT * FROM teams WHERE tournament_id = $1 ORDER BY name', [tournament_id])).rows;
      return res.render('admin/teams', {
        teams,
        tournaments,
        selectedTournament: tournament_id,
        error: `El equipo "${trimmedName}" ya existe en este torneo.`
      });
    }

    await query(
      'INSERT INTO teams (name, user_name, edad, locacion, contacto, tournament_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [trimmedName, user_name, edad, locacion, contacto, tournament_id]
    );
    res.redirect('/admin/teams?tournament=' + tournament_id);
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/teams/:id/delete', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.redirect('/admin/teams');
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// --- GESTIONAR PARTIDOS ---
router.get('/matches', requireAdmin, async (req, res) => {
  try {
    const tournaments = (await query('SELECT * FROM tournaments ORDER BY name')).rows;
    let selectedTournament = req.query.tournament;
    if (!selectedTournament || !tournaments.some(t => t.id == selectedTournament)) {
      selectedTournament = tournaments[0]?.id || null;
    }
    const teams = selectedTournament ? (await query('SELECT * FROM teams WHERE tournament_id = $1 ORDER BY name', [selectedTournament])).rows : [];
    const matches = selectedTournament ? (await query(
      `SELECT m.*,
              ht.name AS home_name,
              at.name AS away_name
       FROM matches m
       JOIN teams ht ON m.home_team_id = ht.id
       JOIN teams at ON m.away_team_id = at.id
       WHERE m.tournament_id = $1
       ORDER BY m.match_date DESC`,
      [selectedTournament]
    )).rows : [];
    res.render('admin/matches', { teams, matches, tournaments, selectedTournament });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Planificar partido
router.post('/matches', requireAdmin, async (req, res) => {
  try {
    const { home_team_id, away_team_id, match_date, tournament_id } = req.body;
    if (home_team_id == away_team_id) {
      const tournaments = (await query('SELECT * FROM tournaments ORDER BY name')).rows;
      let selectedTournament = tournament_id;
      if (!selectedTournament || !tournaments.some(t => t.id == selectedTournament)) {
        selectedTournament = tournaments[0]?.id || null;
      }
      const teams = selectedTournament ? (await query('SELECT * FROM teams WHERE tournament_id = $1 ORDER BY name', [selectedTournament])).rows : [];
      const matches = selectedTournament ? (await query(
        `SELECT m.*,
                ht.name AS home_name,
                at.name AS away_name
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE m.tournament_id = $1
         ORDER BY m.match_date DESC`,
        [selectedTournament]
      )).rows : [];
      return res.render('admin/matches', { teams, matches, tournaments, selectedTournament, error: 'El equipo local y visitante deben ser diferentes.' });
    }
    await query(
      'INSERT INTO matches (home_team_id, away_team_id, match_date, status, tournament_id) VALUES ($1, $2, $3, $4, $5)',
      [home_team_id, away_team_id, match_date, 'scheduled', tournament_id]
    );
    res.redirect('/admin/matches?tournament=' + tournament_id);
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Formulario para cargar/editar resultado
router.get('/matches/:id', requireAdmin, async (req, res) => {
  try {
    const matchRes = await query(
      `SELECT m.*, ht.name AS home_name, at.name AS away_name
       FROM matches m
       JOIN teams ht ON m.home_team_id = ht.id
       JOIN teams at ON m.away_team_id = at.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    const match = matchRes.rows[0];
    const teams = (await query('SELECT * FROM teams ORDER BY name')).rows;
    res.render('admin/edit_match', { match, teams });
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Guardar resultado
router.post('/matches/:id/result', requireAdmin, async (req, res) => {
  try {
    const { home_goals, away_goals } = req.body;
    await query(
      'UPDATE matches SET home_goals = $1, away_goals = $2, status = $3 WHERE id = $4',
      [home_goals, away_goals, 'played', req.params.id]
    );
    res.redirect('/admin/matches');
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Deshacer resultado
router.post('/matches/:id/undo', requireAdmin, async (req, res) => {
  try {
    await query(
      'UPDATE matches SET home_goals = NULL, away_goals = NULL, status = $1 WHERE id = $2',
      ['scheduled', req.params.id]
    );
    res.redirect('/admin/matches');
  } catch (err) {
    console.error('Error in route:', req.path);
    console.error('Error details:', err);
    console.error('Error stack:', err.stack);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
