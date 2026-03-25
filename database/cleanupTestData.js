const pool = require('./connection');

async function cleanup() {
  try {
    console.log('Cleaning up old test data...');
    
    // Delete all test leagues and related data
    await pool.query('DELETE FROM scoring_rules');
    await pool.query('DELETE FROM teams');
    await pool.query('DELETE FROM leagues');
    
    console.log('✅ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanup();