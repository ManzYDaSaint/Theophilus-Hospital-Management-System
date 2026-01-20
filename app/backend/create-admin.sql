-- SQL script to create first admin user
-- Run this in DB Browser for SQLite or any SQLite client

-- 1. Create Admin role
INSERT INTO roles (id, name, description, createdAt, updatedAt) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Admin', 'System Administrator', datetime('now'), datetime('now'));

-- 2. Create admin user (password: Admin@123)
-- This password is pre-hashed with bcrypt
INSERT INTO users (id, email, password, firstName, lastName, roleId, isActive, createdAt, updatedAt)
VALUES (
  '660e8400-e29b-41d4-a716-446655440000',
  'admin@theophilus.local',
  '$2b$10$hl2Z3dJBtBh.dayxmu8UW.tOQo76g52HCxXsy9NjfZK0U3osilXrK',
  'System',
  'Admin',
  '550e8400-e29b-41d4-a716-446655440000',
  1,
  datetime('now'),
  datetime('now')
);

-- Verify the user was created
SELECT u.email, u.firstName, u.lastName, r.name as role 
FROM users u 
JOIN roles r ON u.roleId = r.id 
WHERE u.email = 'admin@theophilus.local';
