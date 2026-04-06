const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// Helper function to calculate snake draft order
// Example: 3 teams, 3 rounds
// Round 1: Team 1, Team 2, Team 3
// Round 2: Team 3, Team 2, Team 1
// Round 3: Team 1, Team 2, Team 3
function calculateSnakeOrder(teams, totalRounds) {
  const order = [];
  for (let round = 0; round < totalRounds; round++) {
    const roundTeams = round % 2 === 0 ? [...teams] : [...teams].reverse();
    order.push(...roundTeams);
  }
  return order;
}

// GET - Get draft state for a league
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Get league info
    const leagueResult = await pool.query(
      `SELECT l.*, u.username as commissioner_username
       FROM leagues l
       JOIN users u ON u.id = l.commissioner_id
       WHERE l.id = $1`,
      [leagueId]
    );

    if (leagueResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }

    const league = leagueResult.rows[0];

    // Get all teams in league
    const teamsResult = await pool.query(
      `SELECT t.*, u.username
       FROM teams t
       JOIN users u ON u.id = t.user_id
       WHERE t.league_id = $1
       ORDER BY t.id ASC`,
      [leagueId]
    );

    const teams = teamsResult.rows;

    // Get all draft picks made so far
    const picksResult = await pool.query(
      `SELECT dp.*, p.name as player_name, p.tribe, p.season,
              t.team_name
       FROM draft_picks dp
       JOIN players p ON p.id = dp.player_id
       JOIN teams t ON t.id = dp.team_id
       WHERE t.league_id = $1
       ORDER BY dp.pick_number ASC`,
      [leagueId]
    );

    const picks = picksResult.rows;

    // Get all players for this league's season
    const playersResult = await pool.query(
      `SELECT * FROM players
       WHERE season = $1
       ORDER BY placement ASC`,
      [league.season]
    );

    const allPlayers = playersResult.rows;

    // Figure out which players have been drafted
    const draftedPlayerIds = picks.map(p => p.player_id);
    const availablePlayers = allPlayers.filter(p => !draftedPlayerIds.includes(p.id));

    // Calculate snake order
    const totalRounds = allPlayers.length > 0 
      ? Math.ceil(allPlayers.length / teams.length)
      : 10;
    const snakeOrder = calculateSnakeOrder(teams, totalRounds);

    // Figure out whose turn it is
    const currentPickIndex = picks.length;
    const currentTeam = snakeOrder[currentPickIndex] || null;
    const currentRound = Math.floor(currentPickIndex / teams.length) + 1;
    const currentPick = (currentPickIndex % teams.length) + 1;

    res.json({
      success: true,
      league,
      teams,
      picks,
      availablePlayers,
      draftState: {
        currentTeam,
        currentRound,
        currentPick,
        totalPicks: currentPickIndex,
        isDraftComplete: currentPickIndex >= snakeOrder.length || availablePlayers.length === 0
      }
    });
  } catch (error) {
    console.error('Error fetching draft state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Make a draft pick
router.post('/:leagueId/pick', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { team_id, player_id } = req.body;

    if (!team_id || !player_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: team_id and player_id'
      });
    }

    // Check player isn't already drafted in this league
    const existingPick = await pool.query(
      `SELECT dp.* FROM draft_picks dp
       JOIN teams t ON t.id = dp.team_id
       WHERE t.league_id = $1 AND dp.player_id = $2`,
      [leagueId, player_id]
    );

    if (existingPick.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Player has already been drafted'
      });
    }

    // Get current pick number
    const pickCountResult = await pool.query(
      `SELECT COUNT(*) FROM draft_picks dp
       JOIN teams t ON t.id = dp.team_id
       WHERE t.league_id = $1`,
      [leagueId]
    );

    const pickNumber = parseInt(pickCountResult.rows[0].count) + 1;

    // Save the pick
    const result = await pool.query(
      `INSERT INTO draft_picks (team_id, player_id, pick_number)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [team_id, player_id, pickNumber]
    );

    // Get player name for response
    const playerResult = await pool.query(
      'SELECT name FROM players WHERE id = $1',
      [player_id]
    );

    const teamResult = await pool.query(
      'SELECT team_name FROM teams WHERE id = $1',
      [team_id]
    );

    res.json({
      success: true,
      message: `Pick #${pickNumber}: ${teamResult.rows[0].team_name} selected ${playerResult.rows[0].name}!`,
      pick: result.rows[0]
    });
  } catch (error) {
    console.error('Error making draft pick:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Reset draft for a league
router.delete('/:leagueId/reset', async (req, res) => {
  try {
    const { leagueId } = req.params;

    await pool.query(
      `DELETE FROM draft_picks
       WHERE team_id IN (SELECT id FROM teams WHERE league_id = $1)`,
      [leagueId]
    );

    res.json({
      success: true,
      message: 'Draft reset successfully!'
    });
  } catch (error) {
    console.error('Error resetting draft:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;