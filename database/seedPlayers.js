const pool = require('./connection');

const survivorPlayers = [
  // Season 40 - Winners at War
  { name: 'Tony Vlachos', season: 40, age: 46, tribe: 'Dakal', placement: 1 },
  { name: 'Michele Fitzgerald', season: 40, age: 30, tribe: 'Sele', placement: 3 },
  { name: 'Natalie Anderson', season: 40, age: 34, tribe: 'Sele', placement: 2 },
  { name: 'Denise Stapley', season: 40, age: 49, tribe: 'Sele', placement: 6 },
  { name: 'Ben Driebergen', season: 40, age: 36, tribe: 'Dakal', placement: 5 },
  { name: 'Sarah Lacina', season: 40, age: 35, tribe: 'Dakal', placement: 4 },
  { name: 'Kim Spradlin', season: 40, age: 37, tribe: 'Dakal', placement: 9 },
  { name: 'Sophie Clarke', season: 40, age: 30, tribe: 'Dakal', placement: 10 },
  { name: 'Nick Wilson', season: 40, age: 28, tribe: 'Sele', placement: 7 },
  { name: 'Jeremy Collins', season: 40, age: 42, tribe: 'Sele', placement: 8 },
  { name: 'Tyson Apostol', season: 40, age: 40, tribe: 'Dakal', placement: 11 },
  { name: 'Wendell Holland', season: 40, age: 36, tribe: 'Dakal', placement: 13 },
  { name: 'Yul Kwon', season: 40, age: 44, tribe: 'Dakal', placement: 14 },
  { name: 'Adam Klein', season: 40, age: 29, tribe: 'Sele', placement: 12 },
  { name: 'Parvati Shallow', season: 40, age: 37, tribe: 'Sele', placement: 15 },
  { name: 'Sandra Diaz-Twine', season: 40, age: 45, tribe: 'Dakal', placement: 16 },
  { name: 'Ethan Zohn', season: 40, age: 46, tribe: 'Sele', placement: 18 },
  { name: 'Rob Mariano', season: 40, age: 44, tribe: 'Sele', placement: 17 },
  { name: 'Danni Boatwright', season: 40, age: 44, tribe: 'Sele', placement: 19 },
  { name: 'Amber Mariano', season: 40, age: 41, tribe: 'Dakal', placement: 20 },
  
  // Season 47 - Recent season
  { name: 'Rachel LaMont', season: 47, age: 34, tribe: 'Gata', placement: 1 },
  { name: 'Sam Phalen', season: 47, age: 24, tribe: 'Gata', placement: 2 },
  { name: 'Teeny Chirichillo', season: 47, age: 24, tribe: 'Lavo', placement: 4 },
  { name: 'Sue Smey', season: 47, age: 59, tribe: 'Tuku', placement: 3 },
  { name: 'Caroline Vidmar', season: 47, age: 27, tribe: 'Tuku', placement: 7 },
  { name: 'Genevieve Mushaluk', season: 47, age: 33, tribe: 'Lavo', placement: 5 },
  { name: 'Kyle Ostwald', season: 47, age: 31, tribe: 'Gata', placement: 8 },
  { name: 'Gabe Ortis', season: 47, age: 26, tribe: 'Tuku', placement: 9 },
  { name: 'Andy Rueda', season: 47, age: 31, tribe: 'Gata', placement: 6 },
  { name: 'Sol Yi', season: 47, age: 43, tribe: 'Lavo', placement: 10 }
];

async function seedPlayers() {
  try {
    for (const player of survivorPlayers) {
      await pool.query(
        `INSERT INTO players (name, season, age, tribe, placement)
         VALUES ($1, $2, $3, $4, $5)`,
        [player.name, player.season, player.age, player.tribe, player.placement]
      );
    }
    console.log(`✅ Successfully inserted ${survivorPlayers.length} players!`);
    
    // Verify by counting
    const result = await pool.query('SELECT COUNT(*) FROM players');
    console.log(`📊 Total players in database: ${result.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding players:', error);
    process.exit(1);
  }
}

seedPlayers();