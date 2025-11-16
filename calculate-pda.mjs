import { PublicKey } from '@solana/web3.js';

// 你的Program ID
const programId = new PublicKey("6LonwXhpVy4feWGj1pc1ucKTkpmpbzYUsx46NExdMXdg");

// 计算Achievement State PDA
const [achievementStatePda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("achievement_state")],
  programId
);

console.log("=".repeat(60));
console.log("📍 PDA Addresses");
console.log("=".repeat(60));
console.log("\nProgram ID:");
console.log(programId.toString());
console.log("\nAchievement State PDA:");
console.log(achievementStatePda.toString());
console.log("\nBump:", bump);
console.log("\n" + "=".repeat(60));
