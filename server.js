const express = require('express');
const cors = require('cors');
const app = express();
const pool = require('./database/connection');
const authRouter = require('./routes/auth');
const leaguesRouter = require('./routes/leagues');
const scoringRouter = require('./routes/scoring');
const draftRouter = require('./routes/draft');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3001;

// Basic route
app.get('/', (req, res) => {
  res.send('🏝️ Survivor Fantasy League API');
});

// Authentication routes
app.use('/api/auth', authRouter);

// League routes
app.use('/api/leagues', leaguesRouter);

// Scoring routes
app.use('/api/scoring', scoringRouter);

app.use('/api/draft', draftRouter);

// Get all players
app.get('/api/players', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM players ORDER BY season, placement');
    res.json({
      success: true,
      count: result.rows.length,
      players: result.rows
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get players by season
app.get('/api/players/season/:seasonNumber', async (req, res) => {
  try {
    const { seasonNumber } = req.params;
    const result = await pool.query(
      'SELECT * FROM players WHERE season = $1 ORDER BY placement',
      [seasonNumber]
    );
    res.json({
      success: true,
      season: seasonNumber,
      count: result.rows.length,
      players: result.rows
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Authentication endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`🏆 League endpoints:`);
  console.log(`   POST   http://localhost:${PORT}/api/leagues`);
  console.log(`   GET    http://localhost:${PORT}/api/leagues/user/:userId`);
  console.log(`   GET    http://localhost:${PORT}/api/leagues/:id`);
  console.log(`   PUT    http://localhost:${PORT}/api/leagues/:id`);
  console.log(`   DELETE http://localhost:${PORT}/api/leagues/:id`);
  console.log(`📊 Scoring endpoints:`);
  console.log(`   GET    http://localhost:${PORT}/api/scoring/league/:leagueId/rules`);
  console.log(`   PUT    http://localhost:${PORT}/api/scoring/league/:leagueId/rules`);
  console.log(`   POST   http://localhost:${PORT}/api/scoring/league/:leagueId/calculate`);
});