import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

if (!process.stdin.isTTY) {
  throw new Error("Run this command in a terminal to enter the admin password privately.");
}
let hidden = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!hidden) process.stdout.write(chunk, encoding);
    callback();
  },
});
output.isTTY = true;
output.columns = process.stdout.columns;
const prompt = createInterface({ input: process.stdin, output, terminal: true });

try {
  const name = (await prompt.question("Admin name: ")).trim();
  const email = (await prompt.question("Approved email: ")).trim().toLowerCase();
  const username = (await prompt.question("Username: ")).trim();
  const passwordQuestion = prompt.question("Password (at least 12 characters, hidden): ");
  hidden = true;
  const password = await passwordQuestion;
  hidden = false;
  process.stdout.write("\n");
  if (!name || !email || !username || password.length < 12) {
    throw new Error("Name, email, username, and a password of at least 12 characters are required.");
  }
  const result = spawnSync("bunx", [
    "convex", "run", "provision:createAdmin",
    JSON.stringify({ name, email, username, password }),
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    // Do not echo CLI stderr: it may contain the submitted arguments.
    throw new Error("Account creation failed. Check ADMIN_EMAILS, username availability, and the Convex deployment logs.");
  }
  console.log("Admin account created. You can now sign in at /login.");
} finally {
  hidden = false;
  prompt.close();
}
