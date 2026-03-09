import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash:password -- <plain-password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
const envSafeHash = hash.replaceAll("$", "\\$");

console.log("Hash:", hash);
console.log("ENV value:", envSafeHash);
