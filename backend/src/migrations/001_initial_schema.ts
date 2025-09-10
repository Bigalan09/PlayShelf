import { Migration } from '../types/database.js';

const migration: Migration = {
  id: '001',
  name: 'initial_schema',
  up: async (db) => {
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        password_hash VARCHAR(255) NOT NULL,
        avatar TEXT,
        bio TEXT,
        is_active BOOLEAN DEFAULT true,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        email_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create categories table
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        color VARCHAR(7),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create mechanisms table
    await db.query(`
      CREATE TABLE IF NOT EXISTS mechanisms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create publishers table
    await db.query(`
      CREATE TABLE IF NOT EXISTS publishers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        website TEXT,
        logo_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create designers table
    await db.query(`
      CREATE TABLE IF NOT EXISTS designers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        bio TEXT,
        website TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create games table
    await db.query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        year_published INTEGER CHECK (year_published >= 1900 AND year_published <= 2100),
        min_players INTEGER CHECK (min_players >= 1),
        max_players INTEGER CHECK (max_players >= 1),
        playing_time INTEGER CHECK (playing_time >= 1),
        min_age INTEGER CHECK (min_age >= 0),
        complexity DECIMAL(2,1) CHECK (complexity >= 1 AND complexity <= 5),
        image_url TEXT,
        thumbnail_url TEXT,
        bgg_id INTEGER UNIQUE,
        average_rating DECIMAL(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 10),
        rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_player_count CHECK (max_players IS NULL OR min_players IS NULL OR max_players >= min_players)
      );
    `);

    // Create collection entries table
    await db.query(`
      CREATE TABLE IF NOT EXISTS collection_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'owned' CHECK (status IN ('owned', 'wishlist', 'played', 'for_trade', 'want_in_trade')),
        purchase_price DECIMAL(10,2) CHECK (purchase_price >= 0),
        purchase_date DATE,
        condition VARCHAR(20) CHECK (condition IN ('mint', 'excellent', 'good', 'fair', 'poor')),
        notes TEXT,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, game_id, status)
      );
    `);

    // Create reviews table
    await db.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
        title VARCHAR(255),
        content TEXT,
        is_recommended BOOLEAN,
        play_count INTEGER DEFAULT 1 CHECK (play_count >= 1),
        difficulty DECIMAL(2,1) CHECK (difficulty >= 1 AND difficulty <= 5),
        is_public BOOLEAN DEFAULT true,
        helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, game_id)
      );
    `);

    // Create game sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        played_at TIMESTAMP WITH TIME ZONE NOT NULL,
        duration INTEGER CHECK (duration >= 1),
        player_count INTEGER NOT NULL CHECK (player_count >= 1),
        location VARCHAR(255),
        notes TEXT,
        score DECIMAL(10,2),
        won BOOLEAN,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create relationship tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS game_categories (
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (game_id, category_id)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS game_mechanisms (
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        mechanism_id UUID NOT NULL REFERENCES mechanisms(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (game_id, mechanism_id)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS game_publishers (
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        publisher_id UUID NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (game_id, publisher_id)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS game_designers (
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        designer_id UUID NOT NULL REFERENCES designers(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (game_id, designer_id)
      );
    `);

    // Create friendships table
    await db.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
        accepted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, receiver_id),
        CHECK (requester_id != receiver_id)
      );
    `);

    // Create activities table
    await db.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN (
          'game_added', 'game_removed', 'game_played', 'review_created', 
          'review_updated', 'friend_added', 'wishlist_added', 'collection_updated'
        )),
        entity_type VARCHAR(20) CHECK (entity_type IN ('game', 'review', 'user', 'session')),
        entity_id UUID,
        metadata JSONB,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create migration tracking table
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_games_year ON games(year_published);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_games_bgg ON games(bgg_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_collection_user ON collection_entries(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_collection_game ON collection_entries(game_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_collection_status ON collection_entries(status);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_reviews_game ON reviews(game_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_reviews_public ON reviews(is_public);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_user ON game_sessions(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_game ON game_sessions(game_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_played ON game_sessions(played_at);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);');
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON friendships(receiver_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);');

    // Create updated_at trigger function
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    const tablesWithUpdatedAt = [
      'users', 'games', 'collection_entries', 'reviews', 'game_sessions',
      'categories', 'mechanisms', 'publishers', 'designers', 'friendships', 'activities'
    ];

    for (const table of tablesWithUpdatedAt) {
      await db.query(`
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table} 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
  },

  down: async (db) => {
    // Drop tables in reverse order of dependencies
    await db.query('DROP TABLE IF EXISTS activities CASCADE;');
    await db.query('DROP TABLE IF EXISTS friendships CASCADE;');
    await db.query('DROP TABLE IF EXISTS game_designers CASCADE;');
    await db.query('DROP TABLE IF EXISTS game_publishers CASCADE;');
    await db.query('DROP TABLE IF EXISTS game_mechanisms CASCADE;');
    await db.query('DROP TABLE IF EXISTS game_categories CASCADE;');
    await db.query('DROP TABLE IF EXISTS game_sessions CASCADE;');
    await db.query('DROP TABLE IF EXISTS reviews CASCADE;');
    await db.query('DROP TABLE IF EXISTS collection_entries CASCADE;');
    await db.query('DROP TABLE IF EXISTS games CASCADE;');
    await db.query('DROP TABLE IF EXISTS designers CASCADE;');
    await db.query('DROP TABLE IF EXISTS publishers CASCADE;');
    await db.query('DROP TABLE IF EXISTS mechanisms CASCADE;');
    await db.query('DROP TABLE IF EXISTS categories CASCADE;');
    await db.query('DROP TABLE IF EXISTS users CASCADE;');
    await db.query('DROP TABLE IF EXISTS migrations CASCADE;');
    
    // Drop the trigger function
    await db.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
  },
};

export default migration;