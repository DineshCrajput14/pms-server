import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface BuildingData {
  id?: number;
  propertyId: number;
  name: string;
  propertyTypeId: number;
  totalFloors?: number;
  description?: string;
}

export async function getPropertyTypesList(): Promise<any[]> {
  const query = `SELECT id, name FROM property_types ORDER BY name ASC;`;
  const [rows] = await pool.query<RowDataPacket[]>(query);
  return rows;
}

export async function getBuildingsList(propertyId?: number): Promise<any[]> {
  let query = `
    SELECT 
      b.id,
      b.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      b.name,
      b.property_type_id AS propertyTypeId,
      COALESCE(pt.name, '') AS propertyTypeName,
      b.total_floors AS totalFloors,
      b.description
    FROM buildings b
    LEFT JOIN properties p ON b.property_id = p.id
    LEFT JOIN property_types pt ON b.property_type_id = pt.id
  `;
  const params: any[] = [];
  if (propertyId) {
    query += ` WHERE b.property_id = ?`;
    params.push(propertyId);
  }
  query += ` ORDER BY b.id DESC;`;
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows;
}

export async function getBuildingById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      b.id,
      b.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      b.name,
      b.property_type_id AS propertyTypeId,
      COALESCE(pt.name, '') AS propertyTypeName,
      b.total_floors AS totalFloors,
      b.description
    FROM buildings b
    LEFT JOIN properties p ON b.property_id = p.id
    LEFT JOIN property_types pt ON b.property_type_id = pt.id
    WHERE b.id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function checkDuplicateBuildingName(
  name: string,
  propertyId: number,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM buildings WHERE property_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?))`;
  const params: any[] = [propertyId, name.trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkBuildingInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = [
    "units",
    "floors",
    "allotments",
    "tenants",
    "release_rooms",
  ];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE building_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function createBuilding(data: BuildingData): Promise<number> {
  const query = `
    INSERT INTO buildings (property_id, name, property_type_id, total_floors, description)
    VALUES (?, ?, ?, ?, ?);
  `;
  const values = [
    data.propertyId,
    data.name,
    data.propertyTypeId,
    data.totalFloors !== undefined && data.totalFloors !== null
      ? data.totalFloors
      : 0,
    data.description ?? null,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.insertId;
}

export async function updateBuilding(
  id: number,
  data: BuildingData,
): Promise<boolean> {
  const query = `
    UPDATE buildings
    SET 
      property_id = ?,
      name = ?,
      property_type_id = ?,
      total_floors = ?,
      description = ?
    WHERE id = ?;
  `;
  const values = [
    data.propertyId,
    data.name,
    data.propertyTypeId,
    data.totalFloors !== undefined && data.totalFloors !== null
      ? data.totalFloors
      : 0,
    data.description ?? null,
    id,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function deleteBuilding(id: number): Promise<boolean> {
  const query = `DELETE FROM buildings WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}
