const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { calculatePoints, getPlayerNames, updateTeamPoints } = require('../utils/calculatePoints');

// GET scoring rules for a league
router.get('/league/:leagueId/rules', async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM scoring_rules 
       WHERE league_id = $1 
       ORDER BY points DESC`,
      [leagueId]
    );

    res.json({
      success: true,
      league_id: leagueId,
      rules_count: result.rows.length,
      rules: result.rows
    });
  } catch (error) {
    console.error('Error fetching scoring rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE scoring rules for a league
router.put('/league/:leagueId/rules', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { rules } = req.body; // Array of { action_type, points }

    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        error: 'Rules must be an array of { action_type, points } objects'
      });
    }

    // Update each rule
    for (const rule of rules) {
      await pool.query(
        `UPDATE scoring_rules 
         SET points = $1
         WHERE league_id = $2 AND action_type = $3`,
        [rule.points, leagueId, rule.action_type]
      );
    }

    res.json({
      success: true,
      message: 'Scoring rules updated successfully!',
      updated_count: rules.length
    });
  } catch (error) {
    console.error('Error updating scoring rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CALCULATE points for an episode
router.post('/league/:leagueId/calculate', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { actions, episode_number, update_teams } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        error: 'Actions must be an array of { player_id, action_type } objects'
      });
    }

    // Calculate points
    const playerPoints = await calculatePoints(leagueId, actions);

    // Get player names for display
    const playerIds = Object.keys(playerPoints).map(id => parseInt(id));
    const playerNames = await getPlayerNames(playerIds);

    // Format results for display
    const results = Object.entries(playerPoints).map(([playerId, points]) => ({
      player_id: parseInt(playerId),
      player_name: playerNames[playerId] || 'Unknown',
      points_earned: points
    }));

    // Optionally update team points in database
    if (update_teams) {
      await updateTeamPoints(leagueId, playerPoints);
    }

    res.json({
      success: true,
      league_id: leagueId,
      episode_number: episode_number || 'Unknown',
      actions_processed: actions.length,
      players_affected: results.length,
      results: results.sort((a, b) => b.points_earned - a.points_earned),
      teams_updated: update_teams || false
    });
  } catch (error) {
    console.error('Error calculating points:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;