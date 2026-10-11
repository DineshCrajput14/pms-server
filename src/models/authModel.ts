import { pool } from "../config/database";

export async function findUserByUsernameOrEmail(identifier: string) {
  const [rows]: any = await pool.query(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    [identifier, identifier],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function findUserByEmail(email: string) {
  return findUserByUsernameOrEmail(email);
}

export async function findUserById(id: number) {
  const [rows]: any = await pool.query(
    "SELECT id, name, username, email, phone, userRoleCode FROM users WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createUser(userData: {
  name: string;
  username?: string;
  email: string;
  passwordHash: string;
  phone?: string;
  userRoleCode?: string;
}) {
  const username = userData.username || userData.email.split("@")[0];
  const [result]: any = await pool.query(
    "INSERT INTO users (name, username, email, password, phone, userRoleCode) VALUES (?, ?, ?, ?, ?, ?)",
    [
      userData.name,
      username,
      userData.email,
      userData.passwordHash,
      userData.phone || null,
      userData.userRoleCode,
    ],
  );
  return result.insertId;
}
