import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
const app = createApp();
describe('Auth API (/api/auth)', () => {
    it('POST /api/auth/login - should authenticate admin with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
            email: 'admin@sail.kiom',
            password: 'admin123',
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('uid');
        expect(res.body.user.email).toBe('admin@sail.kiom');
        expect(res.body.role.role).toBe('admin');
    });
    it('POST /api/auth/login - should authenticate moderator with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
            email: 'mod@sail.kiom',
            password: 'mod123',
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.role.role).toBe('moderator');
    });
    it('POST /api/auth/login - should fail with invalid password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
            email: 'admin@sail.kiom',
            password: 'wrongpassword',
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Invalid email or password');
    });
    it('POST /api/auth/login - should fail with non-existent user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
            email: 'nonexistent@sail.kiom',
            password: 'password123',
        });
        expect(res.status).toBe(404);
        expect(res.body.message).toBe('User not found');
    });
    it('POST /api/auth/signup - should register a new regular user', async () => {
        const testEmail = `newuser_${Date.now()}@sail.in`;
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
            email: testEmail,
            password: 'securePassword123',
            displayName: 'Test User',
        });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.role).toBe('user');
        expect(res.body.message).toBe('Account created successfully with user role');
    });
    it('GET /api/auth/me - should return user profile with valid Bearer token', async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
            email: 'admin@sail.kiom',
            password: 'admin123',
        });
        const token = loginRes.body.token;
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe('admin@sail.kiom');
        expect(res.body.role).toBe('admin');
    });
    it('GET /api/auth/me - should reject unauthorized request without token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });
});
