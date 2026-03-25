const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { createDefaultScoringRules, createPlacementBonuses } = require('../database/defaultScoringRules');

// CREATE - Create a new league
router.post('/', async (req, res) => {
  try {
    const { name, commissioner_id, season, max_teams, cast_size } = req.body;

    // Validate required fields
    if (!name || !commissioner_id || !season) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, commissioner_id, and season are required'
      });
    }

    // Create the league
    const result = await pool.query(
      `INSERT INTO leagues (name, commissioner_id, season, max_teams, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, commissioner_id, season, max_teams || 10, 'pending']
    );

    const league = result.rows[0];

    // Create default scoring rules for this league
    await createDefaultScoringRules(league.id);
    
    // Create placement bonuses based on cast size (default 18)
    const leagueCastSize = cast_size || 18;
    await createPlacementBonuses(league.id, leagueCastSize);

    res.json({
      success: true,
      message: 'League created successfully with default scoring rules!',
      league: league
    });
  } catch (error) {
    console.error('Error creating league:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Get all leagues for a user (as commissioner or participant)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get leagues where user is commissioner
    const commissionerLeagues = await pool.query(
      `SELECT l.*, 
              (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
       FROM leagues l
       WHERE l.commissioner_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );

    // Get leagues where user is a participant
    const participantLeagues = await pool.query(
      `SELECT l.*, t.team_name, t.total_points,
              (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
       FROM leagues l
       JOIN teams t ON t.league_id = l.id
       WHERE t.user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      commissioner_leagues: commissionerLeagues.rows,
      participant_leagues: participantLeagues.rows
    });
  } catch (error) {
    console.error('Error fetching user leagues:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// READ - Get one league by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get league info
    const leagueResult = await pool.query(
      `SELECT l.*, u.username as commissioner_username,
              (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
       FROM leagues l
       JOIN users u ON u.id = l.commissioner_id
       WHERE l.id = $1`,
      [id]
    );

    if (leagueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    const league = leagueResult.rows[0];

    // Get all teams in this league
    const teamsResult = await pool.query(
      `SELECT t.*, u.username
       FROM teams t
       JOIN users u ON u.id = t.user_id
       WHERE t.league_id = $1
       ORDER BY t.total_points DESC`,
      [id]
    );

    // Get scoring rules for this league
    const rulesResult = await pool.query(
      `SELECT * FROM scoring_rules 
       WHERE league_id = $1 
       ORDER BY points DESC`,
      [id]
    );

    res.json({
      success: true,
      league: league,
      teams: teamsResult.rows,
      scoring_rules: rulesResult.rows
    });
  } catch (error) {
    console.error('Error fetching league:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// UPDATE - Update a league
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, season, max_teams, draft_date, status } = req.body;

    // Check if league exists
    const checkResult = await pool.query(
      'SELECT * FROM leagues WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Update the league
    const result = await pool.query(
      `UPDATE leagues 
       SET name = COALESCE($1, name),
           season = COALESCE($2, season),
           max_teams = COALESCE($3, max_teams),
           draft_date = COALESCE($4, draft_date),
           status = COALESCE($5, status)
       WHERE id = $6
       RETURNING *`,
      [name, season, max_teams, draft_date, status, id]
    );

    res.json({
      success: true,
      message: 'League updated successfully!',
      league: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating league:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE - Delete a league
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if league exists
    const checkResult = await pool.query(
      'SELECT * FROM leagues WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Delete the league (CASCADE will delete related teams, scoring_rules, draft_picks)
    await pool.query('DELETE FROM leagues WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'League deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;