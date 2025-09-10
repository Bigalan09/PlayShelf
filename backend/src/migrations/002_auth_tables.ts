import { Migration } from '../types/database.js';

const migration: Migration = {
  id: '002',
  name: 'auth_tables',
  up: async (db) => {
    // Create user sessions table for refresh token management
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT,
        is_revoked BOOLEAN DEFAULT false,
        revoked_at TIMESTAMP WITH TIME ZONE,
        revoked_reason VARCHAR(50)
      );
    `);

    // Create password reset tokens table
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_used BOOLEAN DEFAULT false,
        used_at TIMESTAMP WITH TIME ZONE,
        ip_address INET
      );
    `);

    // Create email verification tokens table
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_used BOOLEAN DEFAULT false,
        used_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create login attempts table for rate limiting and security monitoring
    await db.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255),
        ip_address INET NOT NULL,
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        failure_reason VARCHAR(100),
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for performance
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token_hash);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_revoked, expires_at);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token_hash);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification_tokens(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token_hash);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);');

    // Create trigger for updated_at on user_sessions
    await db.query(`
      CREATE TRIGGER update_user_sessions_updated_at 
      BEFORE UPDATE ON user_sessions 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create function to clean up expired tokens
    await db.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
      RETURNS void AS $$
      BEGIN
        -- Delete expired refresh tokens
        DELETE FROM user_sessions 
        WHERE expires_at < CURRENT_TIMESTAMP AND is_revoked = false;
        
        -- Delete expired password reset tokens
        DELETE FROM password_reset_tokens 
        WHERE expires_at < CURRENT_TIMESTAMP;
        
        -- Delete expired email verification tokens
        DELETE FROM email_verification_tokens 
        WHERE expires_at < CURRENT_TIMESTAMP;
        
        -- Delete old login attempts (keep last 30 days)
        DELETE FROM login_attempts 
        WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
        
        RAISE NOTICE 'Expired tokens cleaned up successfully';
      END;
      $$ LANGUAGE plpgsql;
    `);
  },

  down: async (db) => {
    // Drop the cleanup function
    await db.query('DROP FUNCTION IF EXISTS cleanup_expired_tokens() CASCADE;');
    
    // Drop tables in reverse order
    await db.query('DROP TABLE IF EXISTS login_attempts CASCADE;');
    await db.query('DROP TABLE IF EXISTS email_verification_tokens CASCADE;');
    await db.query('DROP TABLE IF EXISTS password_reset_tokens CASCADE;');
    await db.query('DROP TABLE IF EXISTS user_sessions CASCADE;');
  },
};

export default migration;