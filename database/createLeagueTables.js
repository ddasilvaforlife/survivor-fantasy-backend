const pool = require('./connection');

async function createLeagueTables() {
  try {
    console.log('Creating league tables...');

    // LEAGUES TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leagues (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        commissioner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        season INTEGER NOT NULL,
        max_teams INTEGER DEFAULT 10,
        draft_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Leagues table created!');

    // TEAMS TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        team_name VARCHAR(100) NOT NULL,
        total_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(league_id, user_id)
      );
    `);
    console.log('✅ Teams table created!');

    // SCORING_RULES TABLE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scoring_rules (
        id SERIAL PRIMARY KEY,
        league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        points INTEGER NOT NULL,
        description TEXT,
        UNIQUE(league_id, action_type)
      );
    `);
    console.log('✅ Scoring rules table created!');

    // DRAFT_PICKS TABLE (bonus for later)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS draft_picks (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
        pick_number INTEGER,
        drafted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(team_id, player_id)
      );
    `);
    console.log('✅ Draft picks table created!');

    console.log('\n🎉 All league tables created successfully!\n');
    
    // Show what we created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 All tables in database:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createLeagueTables();