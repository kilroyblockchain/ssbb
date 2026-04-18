import { webSearch, isSearchConfigured } from '../services/search.js';

async function main() {
  console.log('--- SEARCH DIAGNOSTICS ---');
  console.log('Is search configured?', isSearchConfigured());
  
  try {
    console.log('Testing webSearch("Screaming Smoldering Butt Bitches")...');
    const results = await webSearch('Screaming Smoldering Butt Bitches');
    console.log(`Success! Found ${results.length} results.`);
    results.forEach((r, i) => {
      console.log(`${i+1}. ${r.title} (${r.url})`);
    });
  } catch (error: any) {
    console.error('webSearch failed:', error.message);
  }
}

main();
