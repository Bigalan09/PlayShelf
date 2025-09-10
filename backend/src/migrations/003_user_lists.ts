import { Migration } from '../types/database.js';

const migration: Migration = {
  id: '003',
  name: 'user_lists',
  up: async (db) => {
    // Create user lists table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      );
    `);

    // Create user list games junction table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_list_games (
        list_id UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (list_id, game_id)
      );
    `);

    // Create indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_lists_user ON user_lists(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_lists_public ON user_lists(is_public);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_list_games_list ON user_list_games(list_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_user_list_games_game ON user_list_games(game_id);');

    // Create trigger for updated_at
    await db.query(`
      CREATE TRIGGER update_user_lists_updated_at 
      BEFORE UPDATE ON user_lists 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  },

  down: async (db) => {
    await db.query('DROP TABLE IF EXISTS user_list_games CASCADE;');
    await db.query('DROP TABLE IF EXISTS user_lists CASCADE;');
  },
};

export default migration;