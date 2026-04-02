const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { createDefaultScoringRules, createPlacementBonuses } = require('../database/defaultScoringRules');

// CREATE - Create a new league
router.post('/', async (req, res) => {
  try {
    const { name, commissioner_id, season, max_teams, cast_size } = req.body;

    if (!name || !commissioner_id || !season) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, commissioner_id, and season are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO leagues (name, commissioner_id, season, max_teams, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, commissioner_id, season, max_teams || 10, 'pending']
    );

    const league = result.rows[0];

    await createDefaultScoringRules(league.id);
    
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

// JOIN - Join a league with a team name
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, team_name } = req.body;

    if (!user_id || !team_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id and team_name are required'
      });
    }

    // Check if league exists
    const leagueResult = await pool.query(
      'SELECT * FROM leagues WHERE id = $1',
      [id]
    );

    if (leagueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    const league = leagueResult.rows[0];

    // Check if league is full
    const teamCountResult = await pool.query(
      'SELECT COUNT(*) FROM teams WHERE league_id = $1',
      [id]
    );

    const teamCount = parseInt(teamCountResult.rows[0].count);
    if (teamCount >= league.max_teams) {
      return res.status(400).json({
        success: false,
        error: 'League is full'
      });
    }

    // Check if user is already in this league
    const existingTeam = await pool.query(
      'SELECT * FROM teams WHERE league_id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (existingTeam.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have a team in this league'
      });
    }

    // Create the team
    const result = await pool.query(
      `INSERT INTO teams (league_id, user_id, team_name, total_points)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [id, user_id, team_name]
    );

    res.json({
      success: true,
      message: `Team "${team_name}" joined the league successfully!`,
      team: result.rows[0]
    });
  } catch (error) {
    console.error('Error joining league:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET ALL leagues (for browsing)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.username as commissioner_username,
              (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
       FROM leagues l
       JOIN users u ON u.id = l.commissioner_id
       ORDER BY l.created_at DESC`
    );

    res.json({
      success: true,
      leagues: result.rows
    });
  } catch (error) {
    console.error('Error fetching all leagues:', error);
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

    const commissionerLeagues = await pool.query(
      `SELECT l.*, 
              (SELECT COUNT(*) FROM teams WHERE league_id = l.id) as team_count
       FROM leagues l
       WHERE l.commissioner_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );

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

    const teamsResult = await pool.query(
      `SELECT t.*, u.username
       FROM teams t
       JOIN users u ON u.id = t.user_id
       WHERE t.league_id = $1
       ORDER BY t.total_points DESC`,
      [id]
    );

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