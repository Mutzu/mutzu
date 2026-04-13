-- Run this file once to set up the database schema
-- Usage: mysql -u root -p < schema.sql
-- Or paste into Railway / PlanetScale query editor

CREATE DATABASE IF NOT EXISTS mutzu_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mutzu_db;

CREATE TABLE IF NOT EXISTS tasks (
  id          INT          AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  priority    ENUM('low', 'medium', 'high')               NOT NULL DEFAULT 'medium',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed data so the app has something to show on first run
INSERT INTO tasks (title, description, status, priority) VALUES
  ('Set up project repository',  'Initialize Git repo and push to GitHub',          'completed', 'high'),
  ('Deploy backend to Render',   'Create Render service and configure env vars',     'in_progress', 'high'),
  ('Configure cloud database',   'Set up MySQL instance on Railway or PlanetScale',  'pending',   'high'),
  ('Deploy frontend to Vercel',  'Connect GitHub repo and configure build settings', 'pending',   'medium'),
  ('Write technical documentation', 'Architecture diagram + deployment steps',       'pending',   'low');
