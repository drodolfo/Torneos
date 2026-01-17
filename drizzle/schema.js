import { pgTable, serial, varchar, integer, date, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const tournaments = pgTable('tournaments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  visible: boolean('visible').default(false),
  rules: text('rules'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  userName: varchar('user_name', { length: 100 }),
  edad: integer('edad'),
  locacion: varchar('locacion', { length: 100 }),
  contacto: varchar('contacto', { length: 150 }),
  tournamentId: integer('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }),
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  homeTeamId: integer('home_team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  awayTeamId: integer('away_team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  homeGoals: integer('home_goals'),
  awayGoals: integer('away_goals'),
  matchDate: date('match_date').notNull(),
  status: varchar('status', { length: 20 }).default('scheduled'),
  tournamentId: integer('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }),
});

export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
});