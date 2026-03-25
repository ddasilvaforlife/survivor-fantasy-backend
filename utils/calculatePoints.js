const pool = require('../database/connection');

/**
 * Calculate points for players based on their actions in an episode
 * 
 * @param {number} leagueId - The league ID
 * @param {Array} actions - Array of action objects: 
 *   [{ player_id: 1, action_type: 'immunity_win' }, ...]
 * @returns {Object} - Points earned by each player: { player_id: points }
 */
async function calculatePoints(leagueId, actions) {
  try {
    // Get scoring rules for this league
    const rulesResult = await pool.query(
      `SELECT action_type, points FROM scoring_rules 
       WHERE league_id = $1`,
      [leagueId]
    );

    // Create a map of action_type -> points
    const scoringRules = {};
    rulesResult.rows.forEach(rule => {
      scoringRules[rule.action_type] = parseFloat(rule.points);
    });

    // Calculate points for each player
    const playerPoints = {};

    for (const action of actions) {
      const { player_id, action_type } = action;
      
      // Check if this action has a point value
      if (scoringRules[action_type] !== undefined) {
        // Initialize player's points if not already
        if (!playerPoints[player_id]) {
          playerPoints[player_id] = 0;
        }
        
        // Add the points
        playerPoints[player_id] += scoringRules[action_type];
      } else {
        console.warn(`Warning: No scoring rule found for action '${action_type}' in league ${leagueId}`);
      }
    }

    return playerPoints;
  } catch (error) {
    console.error('Error calculating points:', error);
    throw error;
  }
}

/**
 * Get player names for display
 * @param {Array} playerIds - Array of player IDs
 * @returns {Object} - Map of player_id -> player_name
 */
async function getPlayerNames(playerIds) {
  try {
    const result = await pool.query(
      `SELECT id, name FROM players WHERE id = ANY($1)`,
      [playerIds]
    );
    
    const names = {};
    result.rows.forEach(player => {
      names[player.id] = player.name;
    });
    
    return names;
  } catch (error) {
    console.error('Error getting player names:', error);
    throw error;
  }
}

/**
 * Update team points in the database
 * @param {number} leagueId - League ID
 * @param {Object} playerPoints - Map of player_id -> points earned
 */
async function updateTeamPoints(leagueId, playerPoints) {
  try {
    for (const [playerId, points] of Object.entries(playerPoints)) {
      // Find teams that have this player
      await pool.query(
        `UPDATE teams 
         SET total_points = total_points + $1
         FROM draft_picks
         WHERE teams.id = draft_picks.team_id
           AND draft_picks.player_id = $2
           AND teams.league_id = $3`,
        [points, playerId, leagueId]
      );
    }
    console.log('✅ Team points updated');
  } catch (error) {
    console.error('Error updating team points:', error);
    throw error;
  }
}

module.exports = {
  calculatePoints,
  getPlayerNames,
  updateTeamPoints
};