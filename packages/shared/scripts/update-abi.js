/**
 * Script to copy ABI from compiled contracts to shared package
 * Run this after compiling contracts: pnpm --filter shared update-abi
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_PATH = path.join(
  __dirname,
  '../../contracts/artifacts/contracts/Achievements.sol/Achievements.json'
);

const DEST_PATH = path.join(__dirname, '../src/abi/Achievements.json');

try {
  console.log('📋 Copying ABI from contracts artifacts...');

  // Read the full artifact
  const artifact = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));

  // Extract just the ABI
  const abi = artifact.abi;

  // Write to shared package
  fs.writeFileSync(DEST_PATH, JSON.stringify(abi, null, 2));

  console.log('✅ ABI updated successfully!');
  console.log(`   Source: ${SOURCE_PATH}`);
  console.log(`   Destination: ${DEST_PATH}`);
} catch (error) {
  console.error('❌ Error updating ABI:', error.message);
  console.log('\nMake sure to compile contracts first:');
  console.log('  pnpm --filter contracts compile');
  process.exit(1);
}
