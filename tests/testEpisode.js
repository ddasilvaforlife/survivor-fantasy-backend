const pool = require('../database/connection');
const { calculatePoints, getPlayerNames } = require('../utils/calculatePoints');

async function simulateEpisode() {
  console.log('🏝️  SIMULATING SURVIVOR EPISODE\n');
  console.log('League: David\'s Epic Survivor League (ID: 3)');
  console.log('Season: 47, Episode: 5');
  console.log('=' .repeat(60));
  
  const leagueId = 3;
  
  // Episode actions
  const actions = [
    { player_id: 21, action_type: 'individual_immunity_win' },
    { player_id: 21, action_type: 'reward_win' },
    { player_id: 21, action_type: 'correct_vote' },
    
    { player_id: 22, action_type: 'found_idol' },
    { player_id: 22, action_type: 'correct_vote' },
    
    { player_id: 23, action_type: 'correct_vote' },
    { player_id: 24, action_type: 'correct_vote' },
    { player_id: 25, action_type: 'correct_vote' },
    
    { player_id: 26, action_type: 'sit_out_challenge' },
    
    { player_id: 27, action_type: 'correct_vote' }
  ];
  
  console.log('\n📺 EPISODE ACTIONS:');
  actions.forEach((action, i) => {
    console.log(`   ${i + 1}. Player ${action.player_id}: ${action.action_type}`);
  });
  
  // Calculate points
  console.log('\n⚙️  Calculating points...\n');
  const playerPoints = await calculatePoints(leagueId, actions);
  
  // Get player names
  const playerIds = Object.keys(playerPoints).map(id => parseInt(id));
  const playerNames = await getPlayerNames(playerIds);
  
  // Display results
  console.log('📊 EPISODE RESULTS:');
  console.log('=' .repeat(60));
  
  const sortedResults = Object.entries(playerPoints)
    .sort(([, a], [, b]) => b - a)
    .map(([playerId, points]) => ({
      name: playerNames[playerId] || `Player ${playerId}`,
      points: points
    }));
  
  sortedResults.forEach((result, index) => {
    const sign = result.points >= 0 ? '+' : '';
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    console.log(`   ${medal} ${result.name.padEnd(25)} ${sign}${result.points} pts`);
  });
  
  console.log('\n✅ Episode simulation complete!\n');
  process.exit(0);
}

simulateEpisode().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});