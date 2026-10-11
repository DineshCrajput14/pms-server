// import mysql from "mysql2/promise";
// import { env } from "./env.config";

// const sslConfig = env.DB.SSL ? { ssl: { rejectUnauthorized: true } } : {};

// export const pool = mysql.createPool({
//   host: env.DB.HOST,
//   port: env.DB.PORT,
//   user: env.DB.USER,
//   password: env.DB.PASSWORD,
//   database: env.DB.NAME,
//   waitForConnections: true,
//   connectionLimit: env.DB.CONNECTION_LIMIT,
//   queueLimit: 0,
//   enableKeepAlive: true,
//   keepAliveInitialDelay: 10000,
//   dateStrings: true,
//   ...sslConfig,
// });

// export const dbRootConnection = mysql.createPool({
//   host: env.DB.HOST,
//   port: env.DB.PORT,
//   user: env.DB.USER,
//   password: env.DB.PASSWORD,
//   waitForConnections: true,
//   connectionLimit: 5,
//   ...sslConfig,
// });


import mysql from "mysql2/promise";
import { Pool as PgPool } from "pg";
import { env } from "./env.config";

const isPostgres = env.DB.TYPE === "postgres";

const sslConfig = env.DB.SSL
  ? { ssl: { rejectUnauthorized: true } }
  : {};

// PostgreSQL connection
const pgPool = new PgPool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  database: env.DB.NAME,
  max: env.DB.CONNECTION_LIMIT,
  ssl: env.DB.SSL ? { rejectUnauthorized: true } : undefined,
});

// MySQL connection
const mysqlPool = mysql.createPool({
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  database: env.DB.NAME,
  waitForConnections: true,
  connectionLimit: env.DB.CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  dateStrings: true,
  ...sslConfig,
});

// Selected database pool
// export const pool = (isPostgres ? pgPool : mysqlPool) as any;
export const pool = (isPostgres ? pgPool : mysqlPool) as unknown as mysql.Pool;

// Root connection (MySQL behavior preserved)
export const dbRootConnection = isPostgres
  ? pgPool
  : mysql.createPool({
      host: env.DB.HOST,
      port: env.DB.PORT,
      user: env.DB.USER,
      password: env.DB.PASSWORD,
      waitForConnections: true,
      connectionLimit: 5,
      ...sslConfig,
    });

    // Test PostgreSQL connection
if (isPostgres) {
  pgPool
    .query("SELECT current_database() AS database, NOW() AS server_time")
    .then((result) => {
      console.log("PostgreSQL Connected Successfully");
      console.log("Database:", result.rows[0].database);
      console.log("Server Time:", result.rows[0].server_time);
    })
    .catch((err) => {
      console.error("PostgreSQL Connection Failed:", err.message);
    });
}