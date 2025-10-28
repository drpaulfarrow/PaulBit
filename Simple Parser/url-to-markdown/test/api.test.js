const request = require('supertest');
const app = require('../server');

describe('API Tests', () => {
  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('POST /to-markdown', () => {
    it('should reject missing URL with 400', async () => {
      const response = await request(app)
        .post('/to-markdown')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // Additional tests for /to-markdown would require mocking axios or using a live test URL
  // Example structure:
  // describe('POST /to-markdown', () => {
  //   it('should reject missing URL', async () => { ... });
  //   it('should reject private IPs', async () => { ... });
  //   it('should convert valid URL', async () => { ... });
  // });
});
