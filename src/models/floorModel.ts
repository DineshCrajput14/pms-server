import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface FloorData {
  id?: number;
  name: string;
  floorNo: number;
}

export async function getFloorsList(): Promise<any[]> {
  const query = `
    SELECT 
      id,
      name,
      floor_no AS floorNo
    FROM floors
    ORDER BY floor_no ASC, id ASC;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query);
  return rows;
}

export async function getFloorById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      id,
      name,
      floor_no AS floorNo
    FROM floors
    WHERE id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function checkDuplicateFloorName(
  name: string,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM floors WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))`;
  const params: any[] = [name.trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkDuplicateFloorNo(
  floorNo: number,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM floors WHERE floor_no = ?`;
  const params: any[] = [floorNo];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkFloorInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = ["units", "rooms", "tenants"];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE floor_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function createFloor(data: FloorData): Promise<number> {
  const query = `
    INSERT INTO floors (name, floor_no)
    VALUES (?, ?);
  `;
  const values = [data.name, data.floorNo];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.insertId;
}

export async function updateFloor(
  id: number,
  data: FloorData,
): Promise<boolean> {
  const query = `
    UPDATE floors
    SET 
      name = ?,
      floor_no = ?
    WHERE id = ?;
  `;
  const values = [data.name, data.floorNo, id];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function deleteFloor(id: number): Promise<boolean> {
  const query = `DELETE FROM floors WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}
