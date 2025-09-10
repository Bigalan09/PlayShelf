-- Initial database setup for PlayShelf
-- This file is executed when the PostgreSQL container starts

-- Ensure the database exists
CREATE DATABASE IF NOT EXISTS playshelf_dev;

-- Create user if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'playshelf_user') THEN
        CREATE USER playshelf_user WITH PASSWORD 'playshelf_password';
    END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE playshelf_dev TO playshelf_user;

-- Connect to the database
\c playshelf_dev;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO playshelf_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO playshelf_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO playshelf_user;

-- Enable extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO playshelf_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO playshelf_user;