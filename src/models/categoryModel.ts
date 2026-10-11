import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface CategoryData {
  id?: number;
  name: string;
}

export async function getCategoriesList(): Promise<any[]> {
  const query = `
    SELECT 
      id,
      name
    FROM categories
    ORDER BY name ASC;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query);
  return rows;
}

export async function getCategoryById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      id,
      name
    FROM categories
    WHERE id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function checkDuplicateCategoryName(
  name: string,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))`;
  const params: any[] = [name.trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkCategoryInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = ["amenities", "allotment_service_charges"];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE category_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function createCategory(data: CategoryData): Promise<number> {
  const query = `
    INSERT INTO categories (name)
    VALUES (?);
  `;
  const [result] = await pool.query<ResultSetHeader>(query, [data.name]);
  return result.insertId;
}

export async function updateCategory(
  id: number,
  data: CategoryData,
): Promise<boolean> {
  const query = `
    UPDATE categories
    SET name = ?
    WHERE id = ?;
  `;
  const [result] = await pool.query<ResultSetHeader>(query, [data.name, id]);
  return result.affectedRows > 0;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const query = `DELETE FROM categories WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}
