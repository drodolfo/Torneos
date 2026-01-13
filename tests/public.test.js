import request from 'supertest';
import app from '../server.js';
import { pool } from '../db.js';

describe('Public Routes', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('GET / should return 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });

  test('GET /table should return 200', async () => {
    const response = await request(app).get('/table');
    expect(response.status).toBe(200);
  });
});