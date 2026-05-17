import request from 'supertest';
import { createApp } from '../app';

describe('App bootstrap', () => {
  const app = createApp();

  it('responds with service status JSON', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'LTI ATS API' });
  });
});
