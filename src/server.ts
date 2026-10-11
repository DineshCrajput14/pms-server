import { Server } from "http";
import app from "./app";
import { pool, dbRootConnection } from "./config/database";
import { env } from "./config/env.config";

let server: Server;

async function startServer() {

  server = app.listen(env.PORT, () => {
    console.log(`PMS Backend running on port ${env.PORT}`);
    const isLocal = env.DB.HOST === "localhost" || env.DB.HOST === "127.0.0.1";
    // 
     console.log(
    `Database: Connected to ${isLocal ? "LOCAL" : "REMOTE"} ${env.DB.TYPE.toUpperCase()}`
  );
  });
}

async function gracefulShutdown(signal: string) {
  if (server) {
    server.close(async () => {
      try {
        await pool.end();
        await dbRootConnection.end();
        process.exit(0);
      } catch (err) {
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
