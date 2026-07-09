/**
 * testConnection.js
 *
 * Run from your project root:
 *   node testConnection.js
 *
 * This will:
 *   1. Try to connect to Postgres using DATABASE_URL from .env
 *   2. List existing tables (if any)
 *   3. Tell you exactly what's wrong if connection fails
 */

require("dotenv").config();
const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config();
const url = process.env.DATABASE_URL;

console.log("\n── ShortNote Postgres Connection Test ──────────────\n");

if (!url) {
    console.error("❌  DATABASE_URL is not set in your .env file.");
    console.error("    Add this line to .env:");
    console.error("    DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/shortnote\n");
    process.exit(1);
}

// Mask password for safe logging
const masked = url.replace(/:([^@]+)@/, ":****@");
console.log("DATABASE_URL:", masked);

const pool = new Pool({ connectionString: url });

async function test() {
    let client;

    try {
        client = await pool.connect();
        console.log("\n✅  Connected to Postgres successfully!\n");

        // Check which tables already exist
        const { rows } = await client.query(`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename
        `);

        if (rows.length === 0) {
            console.log("⚠️   No tables found in the database.");
            console.log("    Open pgAdmin → Query Tool on your 'shortnote' database");
            console.log("    and run db/schema.sql followed by db/migration_syllabus.sql\n");
        } else {
            console.log("Tables found in database:");
            rows.forEach(r => console.log("  ✓", r.tablename));

            // Check if the required tables are there
            const required = [
                "exams", "subjects", "chapters",
                "question_papers", "questions",
                "weightage_stats", "ml_features",
                "predictions", "exam_syllabi"
            ];
            const existing = rows.map(r => r.tablename);
            const missing  = required.filter(t => !existing.includes(t));

            if (missing.length > 0) {
                console.log("\n⚠️   Missing tables:", missing.join(", "));
                console.log("    Run db/schema.sql in pgAdmin Query Tool.\n");
            } else {
                console.log("\n✅  All required tables exist. Database is ready!\n");
            }
        }

    } catch (err) {
        console.error("\n❌  Connection failed:", err.message);

        if (err.message.includes("password authentication")) {
            console.error("\n    Fix: Wrong password in DATABASE_URL.");
            console.error("    In pgAdmin → right-click your login role → Properties");
            console.error("    → Definition → reset password → update .env\n");
        } else if (err.message.includes("does not exist")) {
            console.error("\n    Fix: Database 'shortnote' doesn't exist.");
            console.error("    In pgAdmin → right-click Databases → Create → Database");
            console.error("    → name it 'shortnote' → Save\n");
        } else if (err.message.includes("ECONNREFUSED")) {
            console.error("\n    Fix: Postgres is not running or wrong host/port.");
            console.error("    Check pgAdmin — is the server started (green icon)?");
            console.error("    Check your port — pgAdmin server Properties → Connection\n");
        } else {
            console.error("\n    Check your DATABASE_URL format:");
            console.error("    postgresql://username:password@host:port/dbname\n");
        }

        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

test();