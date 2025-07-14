const { mkdirSync, writeFileSync } = require('fs');
const { spawnSync } = require('child_process');
const { createHash } = require('crypto');
const path = require('path');

const { registry } = require('./package.json');
const BASE_URL = 'http://games.gamely.com.br'
const DIST_DIR = './dist';

async function download(url) {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

function hash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

async function processGame(game, index) {
  console.log(`[${index + 1}] Processing ${game.url}`);
  
  const data = await download(game.url);
  const gameHash = hash(data);
  const gameDir = path.join(DIST_DIR, gameHash);
  
  mkdirSync(gameDir, { recursive: true });
  writeFileSync(path.join(gameDir, 'game.lua'), data);
  
  const { stdout } = spawnSync('npx', ['gly-cli', 'meta', path.join(gameDir, 'game.lua'), '--format', '{{& dump.meta.json }}'], { 
    encoding: 'utf-8' 
  });
  
  return {...JSON.parse(stdout), game_url: `${BASE_URL}/${gameHash}/game.lua`};
}

(async () => {
  const results = [];
  
  for (const [i, game] of registry.entries()) {
    try {
      results.push(await processGame(game, i));
    } catch (err) {
      console.error(`❌ Failed ${game.url || i}:`, err.message);
      process.exit(1);
    }
  }
  
  writeFileSync(
    path.join(DIST_DIR, 'games.json'),
    JSON.stringify({ count: results.length, games: results }, null, 2)
  );
  
  console.log(`✅ Done! Processed ${results.length} games`);
})();
