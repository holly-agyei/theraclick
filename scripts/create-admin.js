// Script to create the first admin account
// Run: node scripts/create-admin.js

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: ".env.local" });

async function main() {
  try {
    let credential;

    // Try service account key file first (if provided)
    const serviceAccountPath = process.env.SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, "../serviceAccountKey.json");
    
    if (fs.existsSync(serviceAccountPath)) {
      console.log("📁 Using service account key file...");
      const serviceAccount = require(serviceAccountPath);
      credential = cert(serviceAccount);
    } else {
      // Fallback to environment variables
      console.log("🔑 Using environment variables...");
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (!projectId || !clientEmail || !privateKey) {
        console.error("❌ Missing Firebase Admin credentials!");
        console.error("   Either provide SERVICE_ACCOUNT_KEY_PATH or set:");
        console.error("   - FIREBASE_ADMIN_PROJECT_ID");
        console.error("   - FIREBASE_ADMIN_CLIENT_EMAIL");
        console.error("   - FIREBASE_ADMIN_PRIVATE_KEY");
        process.exit(1);
      }

      credential = cert({ projectId, clientEmail, privateKey });
    }

    initializeApp({ credential });
    const db = getFirestore();

    // Create admin from .env.local (never commit real values)
    const username = (process.env.ADMIN_SEED_USERNAME || "").trim().toLowerCase();
    const password = process.env.ADMIN_SEED_PASSWORD || "";
    const email = (process.env.ADMIN_SEED_EMAIL || "").trim();

    if (!username || !password) {
      console.error("\n❌ Set ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD in .env.local");
      console.error("   Example (then run this script again):");
      console.error('   ADMIN_SEED_USERNAME=youradmin');
      console.error("   ADMIN_SEED_PASSWORD='a-long-random-password'");
      console.error("   ADMIN_SEED_EMAIL=you@example.com   # optional\n");
      process.exit(1);
    }

    console.log("\n🔐 Creating Admin Account...");
    console.log(`Username: ${username}`);

    // Check if admin exists
    const existing = await db.collection("admins").where("username", "==", username.toLowerCase()).limit(1).get();
    if (!existing.empty) {
      console.log("⚠️  Admin already exists. Updating password...");
      const adminDoc = existing.docs[0];
      const passwordHash = await bcrypt.hash(password, 10);
      await db.collection("admins").doc(adminDoc.id).update({
        passwordHash,
        updatedAt: new Date(),
      });
      console.log("✅ Admin password updated!");
    } else {
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create admin
      await db.collection("admins").add({
        username: username.toLowerCase(),
        passwordHash,
        email: email.trim() || "",
        createdAt: new Date(),
      });

      console.log("✅ Admin account created successfully!");
    }

    console.log(`\n🎉 You can now login at: http://localhost:3000/admin/login`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
  } catch (e) {
    console.error("❌ Error:", e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
