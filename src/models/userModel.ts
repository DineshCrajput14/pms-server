import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";

export interface UserData {
  id?: number;
  name: string;
  email: string;
  username?: string;
  password?: string;
  phone?: string;
  userRoleCode: string;
  status?: string;
}

export async function getUsersList(
  keyword?: string,
  userRoleCode?: string,
): Promise<any[]> {
  let query = `
    SELECT 
      id,
      name,
      username,
      email,
      phone,
      userRoleCode,
      status
    FROM users
  `;

  const params: any[] = [];
  const conditions: string[] = [];

  if (keyword && keyword.trim()) {
    const term = `%${keyword.trim().toLowerCase()}%`;
    conditions.push(
      `(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(username) LIKE ? OR phone LIKE ?)`,
    );
    params.push(term, term, term, term);
  }

  if (userRoleCode && userRoleCode.trim()) {
    conditions.push(`userRoleCode = ?`);
    params.push(userRoleCode.trim());
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(` AND `);
  }

  query += ` ORDER BY id DESC;`;

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows;
}

export async function getUserById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      id,
      name,
      username,
      email,
      phone,
      userRoleCode,
      status,
      COALESCE(plain_password, '') AS password
    FROM users
    WHERE id = ?;
  `;

  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function checkDuplicateUserIdentifier(
  identifier: string,
  excludeId?: number,
): Promise<boolean> {
  const trimmed = identifier.trim().toLowerCase();
  let query = `
    SELECT id FROM users 
    WHERE (LOWER(TRIM(email)) = ? OR LOWER(TRIM(username)) = ?)
  `;
  const params: any[] = [trimmed, trimmed];

  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkUserInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = [
    "properties",
    "allotments",
    "payments",
    "rent_receipts",
  ];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE user_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function createUser(data: UserData): Promise<number> {
  const identifier = data.email.trim();
  const username = identifier;
  const email = identifier;
  const rawPassword =
    data.password && data.password.trim() ? data.password.trim() : "123456";

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const query = `
    INSERT INTO users (name, username, email, password, plain_password, phone, userRoleCode, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const values = [
    data.name.trim(),
    username,
    email,
    hashedPassword,
    rawPassword,
    data.phone ? data.phone.trim() : null,
    data.userRoleCode || "STAFF",
    data.status || "Active",
  ];

  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.insertId;
}

export async function updateUser(id: number, data: UserData): Promise<boolean> {
  const identifier = data.email.trim();
  const username = identifier;
  const email = identifier;

  const fields: string[] = [
    "name = ?",
    "username = ?",
    "email = ?",
    "phone = ?",
    "userRoleCode = ?",
    "status = ?",
  ];

  const values: any[] = [
    data.name.trim(),
    username,
    email,
    data.phone ? data.phone.trim() : null,
    data.userRoleCode || "STAFF",
    data.status || "Active",
  ];

  if (data.password && data.password.trim()) {
    const rawPassword = data.password.trim();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    fields.push("password = ?");
    values.push(hashedPassword);
    fields.push("plain_password = ?");
    values.push(rawPassword);
  }

  values.push(id);

  const query = `
    UPDATE users
    SET ${fields.join(", ")}
    WHERE id = ?;
  `;

  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function deleteUser(id: number): Promise<boolean> {
  const query = `DELETE FROM users WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}
