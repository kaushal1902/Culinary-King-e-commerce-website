process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');

test('serves the home page and static assets', async () => {
  const homeRes = await request(app).get('/');
  assert.equal(homeRes.statusCode, 200);
  assert.match(homeRes.text, /Culinary King/);

  const cssRes = await request(app).get('/css/style.css');
  assert.equal(cssRes.statusCode, 200);

  const jsRes = await request(app).get('/js/auth.js');
  assert.equal(jsRes.statusCode, 200);
});

test('serves the login page', async () => {
  const response = await request(app).get('/login.html');
  assert.equal(response.statusCode, 200);
  assert.match(response.text, /Welcome back/);
});

test('protects the cart API', async () => {
  const response = await request(app).get('/api/cart');
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.message, 'Authentication required.');
});

test('rejects invalid signup data before database access', async () => {
  const response = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'A', email: 'not-an-email', password: 'short' });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.message, 'Please enter your full name.');
});

test('serves the orders and checkout pages', async () => {
  const checkoutRes = await request(app).get('/checkout.html');
  assert.equal(checkoutRes.statusCode, 200);
  assert.match(checkoutRes.text, /Secure Gourmet Checkout/);

  const ordersRes = await request(app).get('/orders.html');
  assert.equal(ordersRes.statusCode, 200);
  assert.match(ordersRes.text, /My Order History/);
});

test('validates required order fields', async () => {
  const response = await request(app)
    .post('/api/orders')
    .send({ customer: { name: 'Test' } });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /complete all required customer shipping information/);
});
