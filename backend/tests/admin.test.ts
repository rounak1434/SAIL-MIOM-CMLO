import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();
let adminToken: string;
let createdModUid: string;

describe('Moderator & Admin & User API', () => {
  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@sail.kiom', password: 'admin123' });
    adminToken = adminLogin.body.token;
  });

  it('POST /api/moderators - admin can create moderator account', async () => {
    const modEmail = `mod_${Date.now()}@sail.kiom`;
    const res = await request(app)
      .post('/api/moderators')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Civil Moderator',
        businessName: 'Civil Dept',
        email: modEmail,
        phone: '9876500000',
        password: 'modpassword123',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('uid');
    createdModUid = res.body.uid;
  });

  it('GET /api/moderators - admin can list all moderators', async () => {
    const res = await request(app)
      .get('/api/moderators')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((m: any) => m.id === createdModUid)).toBe(true);
  });

  it('PATCH /api/moderators/:id/status - admin can toggle moderator status', async () => {
    const res = await request(app)
      .patch(`/api/moderators/${createdModUid}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PATCH /api/users/:uid/block - admin can block and unblock a user', async () => {
    const res = await request(app)
      .patch(`/api/users/${createdModUid}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocked: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const blockedList = await request(app)
      .get('/api/users/blocked')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(blockedList.status).toBe(200);
    expect(blockedList.body.some((u: any) => u.id === createdModUid)).toBe(true);
  });

  it('PATCH /api/admin/users/:uid - admin can update user data', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${createdModUid}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Civil Mod',
        businessName: 'Infrastructure',
        phone: '919876599999',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/admin/users/:uid - admin can delete a user', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${createdModUid}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User deleted successfully');
  });
});

describe('Chief Admin Role & Permissions', () => {
  let chiefAdminToken: string;
  let chiefAdminEmail: string;

  beforeAll(async () => {
    chiefAdminEmail = `chief_${Date.now()}@sail.kiom`;
    const { AdminService } = await import('../src/services/admin.service.js');
    await AdminService.createPrivilegedUser({
      name: 'Super Chief Admin',
      email: chiefAdminEmail,
      password: 'chiefpassword123',
      role: 'chief_admin',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: chiefAdminEmail, password: 'chiefpassword123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.role.role).toBe('chief_admin');
    chiefAdminToken = loginRes.body.token;
  });

  it('Chief Admin can access existing admin functionality (e.g. list moderators)', async () => {
    const res = await request(app)
      .get('/api/moderators')
      .set('Authorization', `Bearer ${chiefAdminToken}`);
    expect(res.status).toBe(200);
  });

  it('Chief Admin can create an Admin account via POST /api/admin/users', async () => {
    const email = `admin_created_${Date.now()}@sail.kiom`;
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${chiefAdminToken}`)
      .send({
        name: 'New Assigned Admin',
        email,
        password: 'adminpass123',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('admin');
  });

  it('Chief Admin can create another Chief Admin account via POST /api/admin/users', async () => {
    const email = `chief_created_${Date.now()}@sail.kiom`;
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${chiefAdminToken}`)
      .send({
        name: 'Second Chief Admin',
        email,
        password: 'chiefpass123',
        role: 'chief_admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('chief_admin');
  });

  it('Chief Admin can create a Moderator account via POST /api/admin/users', async () => {
    const email = `mod_created_${Date.now()}@sail.kiom`;
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${chiefAdminToken}`)
      .send({
        name: 'Created Moderator',
        email,
        password: 'modpass123',
        role: 'moderator',
        businessName: 'Electrical Maintenance',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('moderator');
  });

  it('Normal Admin CANNOT create an Admin or Chief Admin account (403 Forbidden)', async () => {
    const adminRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unauthorized Admin Attempt',
        email: `unauth_admin_${Date.now()}@sail.kiom`,
        password: 'password123',
        role: 'admin',
      });

    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error).toContain('Only Chief Admins');

    const chiefRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unauthorized Chief Attempt',
        email: `unauth_chief_${Date.now()}@sail.kiom`,
        password: 'password123',
        role: 'chief_admin',
      });

    expect(chiefRes.status).toBe(403);
    expect(chiefRes.body.error).toContain('Only Chief Admins');
  });

  it('Normal Admin CANNOT promote a user to Chief Admin or Admin via PATCH (403 Forbidden)', async () => {
    const modEmail = `test_mod_${Date.now()}@sail.kiom`;
    const createRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${chiefAdminToken}`)
      .send({
        name: 'Test Mod For Promotion',
        email: modEmail,
        password: 'password123',
        role: 'moderator',
      });
    const modUid = createRes.body.user.uid;

    const patchRes = await request(app)
      .patch(`/api/admin/users/${modUid}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'chief_admin',
      });

    expect(patchRes.status).toBe(403);
    expect(patchRes.body.error).toContain('Only Chief Admins');
  });
});

