import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app';

describe('Aaj Kal Cafe - Core Backend API Tests', () => {
  let adminToken = '';
  let customerToken = '';

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aaj_kal_cafe';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  }, 15000);

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('Health Check endpoint should return 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.system).toBe('Aaj Kal Cafe API');
  });

  it('Public Menu endpoint should return categories and items', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Public Offers endpoint should return active offers', async () => {
    const res = await request(app).get('/api/offers');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Table QR validation should succeed for valid table identifier', async () => {
    const res = await request(app).get('/api/tables/validate/01');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.table.tableNumber).toBe('Table 01');
  });

  it('Customer Login with seeded credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rohan@example.com', password: 'Customer@123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    customerToken = res.body.token;
  });

  it('Admin Login with seeded credentials and role check', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aajkalcafe.com', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
  });

  it('Customer cannot access Admin Dashboard (Unauthorized 403)', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('Admin can access Dashboard stats', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalOrders).toBeGreaterThan(0);
  });

  it('Server accurately recalculates total and rejects invalid prices', async () => {
    const menuRes = await request(app).get('/api/menu');
    const firstItem = menuRes.body.data[0];

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        tableIdentifier: '01',
        couponCode: 'AAJKAL20',
        items: [{ menuItemId: firstItem._id, quantity: 2 }]
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);
    expect(orderRes.body.data.itemSubtotal).toBe(firstItem.price * 2);
  });
});
