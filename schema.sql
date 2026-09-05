-- SecureChat MySQL Database Schema
-- Database: securechat_db

CREATE DATABASE IF NOT EXISTS securechat_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE securechat_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  avatar TEXT,
  bio TEXT,
  status VARCHAR(50) DEFAULT 'offline',
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  chat_id VARCHAR(64) NULL,
  sender_id VARCHAR(64) NOT NULL,
  receiver_id VARCHAR(64) NULL,
  text TEXT,
  timestamp VARCHAR(64) NULL,
  status VARCHAR(50) DEFAULT 'sent',
  media_url TEXT NULL,
  media_type VARCHAR(50) NULL,
  risk_level VARCHAR(50) NULL,
  threats JSON NULL,
  raw_payload JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_id (chat_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_receiver_id (receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
