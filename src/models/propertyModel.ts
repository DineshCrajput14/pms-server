import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface PropertyData {
  id?: number;
  name: string;
  address?: string;
  countryId?: number;
  stateId?: number;
  cityId?: number;
  ownerName: string;
  description?: string;
}

export async function getAllProperties(): Promise<any[]> {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.address,
      p.country_id AS countryId,
      p.state_id AS stateId,
      p.city_id AS cityId,
      p.owner_name AS ownerName,
      p.description,
      COALESCE(c.name, '') AS cityName,
      COALESCE(s.name, '') AS stateName,
      COALESCE(co.name, '') AS countryName
    FROM properties p
    LEFT JOIN cities c ON p.city_id = c.id
    LEFT JOIN states s ON p.state_id = s.id
    LEFT JOIN countries co ON p.country_id = co.id
    ORDER BY p.id DESC;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query);
  return rows;
}

export async function getPropertyById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.address,
      p.country_id AS countryId,
      p.state_id AS stateId,
      p.city_id AS cityId,
      p.owner_name AS ownerName,
      p.description,
      COALESCE(c.name, '') AS cityName,
      COALESCE(s.name, '') AS stateName,
      COALESCE(co.name, '') AS countryName
    FROM properties p
    LEFT JOIN cities c ON p.city_id = c.id
    LEFT JOIN states s ON p.state_id = s.id
    LEFT JOIN countries co ON p.country_id = co.id
    WHERE p.id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function checkDuplicatePropertyName(
  name: string,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM properties WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))`;
  const params: any[] = [name.trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkPropertyInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = [
    "buildings",
    "units",
    "allotments",
    "tenants",
    "rent_receipts",
    "release_rooms",
  ];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE property_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function createProperty(data: PropertyData): Promise<number> {
  const query = `
    INSERT INTO properties (name, address, country_id, state_id, city_id, owner_name, description)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  const values = [
    data.name,
    data.address ?? null,
    data.countryId ?? null,
    data.stateId ?? null,
    data.cityId ?? null,
    data.ownerName,
    data.description ?? null,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.insertId;
}

export async function updateProperty(
  id: number,
  data: PropertyData,
): Promise<boolean> {
  const query = `
    UPDATE properties
    SET 
      name = ?,
      address = ?,
      country_id = ?,
      state_id = ?,
      city_id = ?,
      owner_name = ?,
      description = ?
    WHERE id = ?;
  `;
  const values = [
    data.name,
    data.address ?? null,
    data.countryId ?? null,
    data.stateId ?? null,
    data.cityId ?? null,
    data.ownerName,
    data.description ?? null,
    id,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function deleteProperty(id: number): Promise<boolean> {
  const query = `DELETE FROM properties WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}
