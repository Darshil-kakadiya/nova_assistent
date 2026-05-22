import JARVIS from './core/jarvis.js';

const jarvis = new JARVIS();

async function main() {
  try {
    await jarvis.initialize();
  } catch (err) {
    console.error('❌ JARVIS failed to start:', err.message);
    process.exit(1);
  }
}

main();

process.on('SIGINT', async () => {
  console.log('\n');
  await jarvis.shutdown();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});
