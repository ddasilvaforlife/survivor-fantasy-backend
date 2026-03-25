const pool = require('./connection');

/**
 * Creates default scoring rules for a league using my scoring system
 * Philosophy: Reward players who play the game "hard" - taking risks, finding idols, 
 * going all out in challenges rather than sitting back and waiting
 * 
 * @param {number} leagueId - The league ID to create rules for
 */
async function createDefaultScoringRules(leagueId) {
  const defaultRules = [
    // Challenge Performance
    { action_type: 'individual_immunity_win', points: 7, description: 'Win individual immunity challenge' },
    { action_type: 'team_immunity_win', points: 2, description: 'Win team immunity challenge (pre-merge only)' },
    { action_type: 'reward_win', points: 2, description: 'Win reward challenge' },
    { action_type: 'sit_out_challenge', points: -2, description: 'Sit out of a challenge' },
    
    // Idols & Advantages
    { action_type: 'found_idol', points: 7, description: 'Find hidden immunity idol' },
    { action_type: 'found_advantage', points: 3, description: 'Find non-idol advantage' },
    { action_type: 'played_idol_successfully', points: 10, description: 'Successfully play immunity idol' },
    { action_type: 'shot_in_dark', points: 12, description: 'Successfully play Shot in the Dark' },
    
    // Game Milestones
    { action_type: 'made_merge', points: 1, description: 'Make it to the merge' },
    { action_type: 'fire_making_win', points: 3, description: 'Win fire-making challenge at final 4' },
    { action_type: 'correct_vote', points: 0.5, description: 'Vote for the person who gets eliminated' },
    { action_type: 'exile_edge', points: 0, description: 'Go to Exile Island or Edge of Extinction' }
  ];

  try {
    for (const rule of defaultRules) {
      await pool.query(
        `INSERT INTO scoring_rules (league_id, action_type, points, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (league_id, action_type) DO NOTHING`,
        [leagueId, rule.action_type, rule.points, rule.description]
      );
    }
    console.log(`✅ Created ${defaultRules.length} default scoring rules for league ${leagueId}`);
    return true;
  } catch (error) {
    console.error('Error creating default scoring rules:', error);
    throw error;
  }
}

/**
 * Creates placement bonus rules based on season cast size
 * @param {number} leagueId - The league ID
 * @param {number} castSize - Number of players (18, 20, or 24)
 */
async function createPlacementBonuses(leagueId, castSize = 18) {
  const placementSystems = {
    18: [
      { placement: 1, points: 30 },
      { placement: 2, points: 24 },
      { placement: 3, points: 20 },
      { placement: 4, points: 17 },
      { placement: 5, points: 14 },
      { placement: 6, points: 12 },
      { placement: 7, points: 10 },
      { placement: 8, points: 8 },
      { placement: 9, points: 6 },
      { placement: 10, points: 5 },
      { placement: 11, points: 4 },
      { placement: 12, points: 3 },
      { placement: 13, points: 2 },
      { placement: 14, points: 1 },
      { placement: 15, points: 0 },
      { placement: 16, points: -1 },
      { placement: 17, points: -2 },
      { placement: 18, points: -3 }
    ],
    20: [
      { placement: 1, points: 32 },
      { placement: 2, points: 27 },
      { placement: 3, points: 23 },
      { placement: 4, points: 19 },
      { placement: 5, points: 17 },
      { placement: 6, points: 15 },
      { placement: 7, points: 13 },
      { placement: 8, points: 11 },
      { placement: 9, points: 10 },
      { placement: 10, points: 8 },
      { placement: 11, points: 6 },
      { placement: 12, points: 5 },
      { placement: 13, points: 4 },
      { placement: 14, points: 3 },
      { placement: 15, points: 2 },
      { placement: 16, points: 1 },
      { placement: 17, points: 0 },
      { placement: 18, points: -1 },
      { placement: 19, points: -2 },
      { placement: 20, points: -3 }
    ],
    24: [
      { placement: 1, points: 35 },
      { placement: 2, points: 29 },
      { placement: 3, points: 24 },
      { placement: 4, points: 20 },
      { placement: 5, points: 18 },
      { placement: 6, points: 16 },
      { placement: 7, points: 15 },
      { placement: 8, points: 14 },
      { placement: 9, points: 13 },
      { placement: 10, points: 12 },
      { placement: 11, points: 10 },
      { placement: 12, points: 9 },
      { placement: 13, points: 8 },
      { placement: 14, points: 7 },
      { placement: 15, points: 6 },
      { placement: 16, points: 5 },
      { placement: 17, points: 4 },
      { placement: 18, points: 3 },
      { placement: 19, points: 2 },
      { placement: 20, points: 1 },
      { placement: 21, points: 0 },
      { placement: 22, points: -1 },
      { placement: 23, points: -2 },
      { placement: 24, points: -3 }
    ]
  };

  const placements = placementSystems[castSize];
  
  if (!placements) {
    throw new Error(`Invalid cast size: ${castSize}. Must be 18, 20, or 24.`);
  }

  try {
    for (const p of placements) {
      await pool.query(
        `INSERT INTO scoring_rules (league_id, action_type, points, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (league_id, action_type) DO NOTHING`,
        [leagueId, `placement_${p.placement}`, p.points, `Final placement: ${p.placement}${getOrdinalSuffix(p.placement)}`]
      );
    }
    console.log(`✅ Created ${placements.length} placement bonuses for ${castSize}-person season`);
    return true;
  } catch (error) {
    console.error('Error creating placement bonuses:', error);
    throw error;
  }
}

// Helper function for ordinal suffixes (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

// Test function
async function testDefaultRules() {
  console.log('Testing my scoring system...\n');
  
  // Create a test league
  const leagueResult = await pool.query(
    `INSERT INTO leagues (name, commissioner_id, season)
     VALUES ($1, $2, $3)
     RETURNING id`,
    ['Test League - My System', 1, 47]
  );
  
  const leagueId = leagueResult.rows[0].id;
  console.log(`Created test league with ID: ${leagueId}\n`);
  
  // Add default action rules
  await createDefaultScoringRules(leagueId);
  
  // Add placement bonuses for 18-person season
  console.log('\nAdding placement bonuses for 18-person season...');
  await createPlacementBonuses(leagueId, 18);
  
  // Verify
  const rulesResult = await pool.query(
    'SELECT * FROM scoring_rules WHERE league_id = $1 ORDER BY points DESC',
    [leagueId]
  );
  
  console.log(`\n📋 My Scoring System for League ${leagueId}:`);
  console.log('=' .repeat(80));
  console.log('\n🎯 ACTION-BASED SCORING:');
  rulesResult.rows
    .filter(r => !r.action_type.startsWith('placement_'))
    .forEach(rule => {
      const sign = rule.points >= 0 ? '+' : '';
      console.log(`   ${rule.action_type.padEnd(30)} ${sign}${rule.points} pts - ${rule.description}`);
    });
  
  console.log('\n🏆 PLACEMENT BONUSES:');
  rulesResult.rows
    .filter(r => r.action_type.startsWith('placement_'))
    .slice(0, 10)  // Show top 10
    .forEach(rule => {
      const sign = rule.points >= 0 ? '+' : '';
      console.log(`   ${rule.description.padEnd(30)} ${sign}${rule.points} pts`);
    });
  console.log('   ... (8 more placements with bonuses)');
  
  console.log('\n💡 SCORING PHILOSOPHY:');
  console.log('   "Reward players who play hard - taking risks, finding idols,');
  console.log('    going all out in challenges rather than sitting back and waiting."');

  
  process.exit(0);
}

// Run test if this file is executed directly
if (require.main === module) {
  testDefaultRules();
}

module.exports = { 
  createDefaultScoringRules, 
  createPlacementBonuses 
};