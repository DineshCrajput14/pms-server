// import dotenv from "dotenv";
// import path from "path";

// dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// const envPath = path.resolve(process.cwd(), ".env");

// console.log("Current Folder:", process.cwd());
// console.log("ENV Path:", envPath);

// const result = dotenv.config({ path: envPath });

// console.log("ENV Loaded:", result.error ? result.error.message : "YES");
// console.log("DB_PASSWORD EXISTS:", !!process.env.DB_PASSWORD);


// export const env = {
//   NODE_ENV: process.env.NODE_ENV || "development",
//   PORT: Number(process.env.PORT) || 5000,
//   DB: {
//     HOST: process.env.DB_HOST || "localhost",
//     PORT: Number(process.env.DB_PORT) || 3306,
//     USER: process.env.DB_USER || "root",
//     PASSWORD: process.env.DB_PASSWORD || "",
//     NAME: process.env.DB_NAME || "pms_db",
//     CONNECTION_LIMIT: Number(process.env.DB_CONNECTION_LIMIT) || 10,
//     SSL: process.env.DB_SSL === "true",
//  },
//   JWT: {
//     SECRET: process.env.JWT_SECRET!,
//     EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
//   },
// };

import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const result = dotenv.config({ path: envPath });

console.log("Current Folder:", process.cwd());
console.log("ENV Path:", envPath);
console.log("ENV Loaded:", result.error ? result.error.message : "YES");
console.log("DB_PASSWORD EXISTS:", !!process.env.DB_PASSWORD);

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT) || 5000,

  DB: {
    TYPE: (process.env.DB_TYPE || "mysql").toLowerCase(),

    HOST: process.env.DB_HOST || "localhost",

    PORT:
      Number(process.env.DB_PORT) ||
      ((process.env.DB_TYPE || "mysql").toLowerCase() === "postgres"
        ? 5432
        : 3306),

    USER: process.env.DB_USER || "root",

    PASSWORD: process.env.DB_PASSWORD || "",

    NAME: process.env.DB_NAME || "pms_db",

    CONNECTION_LIMIT: Number(process.env.DB_CONNECTION_LIMIT) || 10,

    SSL: process.env.DB_SSL === "true",
  },

  JWT: {
    SECRET: process.env.JWT_SECRET!,

    EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
  },
};