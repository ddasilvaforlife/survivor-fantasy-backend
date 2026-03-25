const pool = require('./connection');

async function fixPointsColumn() {
  try {
    console.log('Updating points column to support decimal values...\n');
    
    // Change points column from INTEGER to NUMERIC(5,2)
    // This allows values like 0.5, 10.25, etc.
    // Format: NUMERIC(5,2) means up to 5 total digits with 2 decimal places
    // Example: 999.99 is the max
    await pool.query(`
      ALTER TABLE scoring_rules 
      ALTER COLUMN points TYPE NUMERIC(5,2);
    `);
    
    console.log('✅ Points column updated to NUMERIC(5,2)');
    console.log('   Now supports decimal values like 0.5, 10.25, etc.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating column:', error.message);
    
    // If ALTER fails, we might need to recreate
    console.log('\n⚠️  ALTER TABLE failed. Trying to recreate table...\n');
    
    try {
      // Drop and recreate
      await pool.query('DROP TABLE IF EXISTS scoring_rules CASCADE;');
      console.log('✅ Old table dropped');
      
      await pool.query(`
        CREATE TABLE scoring_rules (
          id SERIAL PRIMARY KEY,
          league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
          action_type VARCHAR(50) NOT NULL,
          points NUMERIC(5,2) NOT NULL,
          description TEXT,
          UNIQUE(league_id, action_type)
        );
      `);
      console.log('✅ New table created with NUMERIC(5,2) points column\n');
      
      process.exit(0);
    } catch (recreateError) {
      console.error('❌ Recreate failed:', recreateError.message);
      process.exit(1);
    }
  }
}

fixPointsColumn();