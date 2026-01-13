-- Crear tabla de equipos
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    user_name VARCHAR(100),   -- Responsable del equipo
    edad INTEGER,             -- Edad promedio
    locacion VARCHAR(100),    -- Ciudad / ubicación
    contacto VARCHAR(150)     -- Email o teléfono de contacto
);

-- Crear tabla de partidos
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    home_team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    away_team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    home_goals INT,
    away_goals INT,
    match_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled'
);

-- Crear tabla de torneos
CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    visible BOOLEAN DEFAULT FALSE,
    rules TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de administradores
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- Asegurar columnas en teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS user_name VARCHAR(100);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS edad INTEGER;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS locacion VARCHAR(100);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contacto VARCHAR(150);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE;

-- Cambiar constraint único de name a (name, tournament_id)
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_name_key;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_name_tournament_unique') THEN
        ALTER TABLE teams ADD CONSTRAINT teams_name_tournament_unique UNIQUE (name, tournament_id);
    END IF;
END $$;

-- Asegurar columnas en matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id INT REFERENCES tournaments(id) ON DELETE CASCADE;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
