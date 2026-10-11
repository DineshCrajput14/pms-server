import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface AmenityData {
  id?: number;
  name: string;
  categoryId: number;
  type: string;
  chargeType: string;
  defaultCharges: number;
  description?: string;
}

export async function getAmenitiesList(): Promise<any[]> {
  const query = `
    SELECT 
      a.id,
      a.name,
      a.category_id AS categoryId,
      COALESCE(c.name, '') AS categoryName,
      a.type,
      a.charge_type AS chargeType,
      a.default_charges AS defaultCharges,
      a.description
    FROM amenities a
    LEFT JOIN categories c ON a.category_id = c.id
    ORDER BY a.name ASC;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query);
  return rows;
}

export async function getAmenityById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      a.id,
      a.name,
      a.category_id AS categoryId,
      COALESCE(c.name, '') AS categoryName,
      a.type,
      a.charge_type AS chargeType,
      a.default_charges AS defaultCharges,
      a.description
    FROM amenities a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function checkDuplicateAmenityName(
  name: string,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM amenities WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))`;
  const params: any[] = [name.trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkAmenityInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  try {
    const [ascRows]: any = await pool.query(
      `SELECT 1 FROM allotment_service_charges WHERE amenity_id = ? LIMIT 1`,
      [id],
    );
    if (ascRows && ascRows.length > 0) {
      return { inUse: true, table: "allotment_service_charges" };
    }
  } catch (e) {}

  const amenity = await getAmenityById(id);
  if (amenity && amenity.name) {
    try {
      const [rrdRows]: any = await pool.query(
        `SELECT 1 FROM rent_receipt_details WHERE service_name = ? LIMIT 1`,
        [amenity.name],
      );
      if (rrdRows && rrdRows.length > 0) {
        return { inUse: true, table: "rent_receipt_details" };
      }
    } catch (e) {}

    try {
      const [relRows]: any = await pool.query(
        `SELECT 1 FROM release_room_details WHERE service_name = ? LIMIT 1`,
        [amenity.name],
      );
      if (relRows && relRows.length > 0) {
        return { inUse: true, table: "release_room_details" };
      }
    } catch (e) {}
  }

  return { inUse: false };
}

export async function createAmenity(data: AmenityData): Promise<number> {
  const query = `
    INSERT INTO amenities (name, category_id, type, charge_type, default_charges, description)
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  const values = [
    data.name,
    data.categoryId,
    data.type || "Monthly",
    data.chargeType || "Fixed",
    data.defaultCharges !== undefined && data.defaultCharges !== null
      ? data.defaultCharges
      : 0,
    data.description ?? null,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.insertId;
}

export async function updateAmenity(
  id: number,
  data: AmenityData,
): Promise<boolean> {
  const query = `
    UPDATE amenities
    SET 
      name = ?,
      category_id = ?,
      type = ?,
      charge_type = ?,
      default_charges = ?,
      description = ?
    WHERE id = ?;
  `;
  const values = [
    data.name,
    data.categoryId,
    data.type || "Monthly",
    data.chargeType || "Fixed",
    data.defaultCharges !== undefined && data.defaultCharges !== null
      ? data.defaultCharges
      : 0,
    data.description ?? null,
    id,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function deleteAmenity(id: number): Promise<boolean> {
  const query = `DELETE FROM amenities WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}
