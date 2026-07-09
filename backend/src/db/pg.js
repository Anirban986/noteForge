const { Pool } = require("pg");
const dotenv   = require("dotenv");

dotenv.config();

// ─────────────────────────────────────────────────────────
//  Single shared Postgres pool used across all services.
//  Import this wherever you need to query Postgres:
//
//    const pg = require("../db/pg");
//    const { rows } = await pg.query("SELECT ...", [...]);
//
//  Connection is lazy — no socket opened until first query.
// ─────────────────────────────────────────────────────────

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Reasonable defaults for a small Node service.
    // Tune max based on your Postgres plan limits.
    max:             10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Log connection errors so they don't silently swallow
pool.on("error", (err) => {
    console.error("[Postgres] Unexpected pool error:", err.message);
});

// Optional: verify connection on startup
pool.connect()
    .then(client => {
        console.log("[Postgres] Connected successfully");
        client.release();
    })
    .catch(err => {
        console.error("[Postgres] Connection failed:", err.message);
        console.error("  Check DATABASE_URL in your .env file");
    });

module.exports = pool;