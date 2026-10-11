import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface UnitData {
  id?: number;
  propertyId: number;
  buildingId: number;
  floorId: number;
  unitNo: string;
  status: string;
  charges: number;
  description?: string;
}

export async function getUnitsList(
  buildingId?: number,
  propertyId?: number,
): Promise<any[]> {
  let query = `
    SELECT 
      u.id,
      u.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      u.building_id AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      u.floor_id AS floorId,
      COALESCE(f.name, '') AS floorName,
      u.unit_no AS unitNo,
      u.status,
      u.charges,
      u.description
    FROM units u
    LEFT JOIN properties p ON u.property_id = p.id
    LEFT JOIN buildings b ON u.building_id = b.id
    LEFT JOIN floors f ON u.floor_id = f.id
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (buildingId) {
    conditions.push(`u.building_id = ?`);
    params.push(buildingId);
  }
  if (propertyId) {
    conditions.push(`u.property_id = ?`);
    params.push(propertyId);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(` AND `);
  }

  query += ` ORDER BY u.id DESC;`;
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows;
}

export async function getUnitById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      u.id,
      u.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      u.building_id AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      u.floor_id AS floorId,
      COALESCE(f.name, '') AS floorName,
      u.unit_no AS unitNo,
      u.status,
      u.charges,
      u.description
    FROM units u
    LEFT JOIN properties p ON u.property_id = p.id
    LEFT JOIN buildings b ON u.building_id = b.id
    LEFT JOIN floors f ON u.floor_id = f.id
    WHERE u.id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  return rows[0];
}

export async function checkDuplicateUnitNo(
  unitNo: string,
  buildingId: number,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM units WHERE building_id = ? AND LOWER(TRIM(unit_no)) = LOWER(TRIM(?))`;
  const params: any[] = [buildingId, unitNo.trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkUnitInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = [
    "allotments",
    "tenants",
    "rent_receipts",
    "release_rooms",
  ];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE unit_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function checkUnitStatusEditable(
  id: number,
): Promise<{ canEditStatus: boolean; reason?: string }> {
  const [activeAllotments]: any = await pool.query(
    `SELECT a.id, t.name AS tenantName 
     FROM allotments a 
     LEFT JOIN tenants t ON a.tenant_id = t.id
     WHERE a.unit_id = ? AND a.status = 'Active' LIMIT 1`,
    [id],
  );

  if (activeAllotments && activeAllotments.length > 0) {
    const tenantName = activeAllotments[0].tenantName || "a tenant";
    return {
      canEditStatus: false,
      reason: `Unit is currently occupied by ${tenantName}. Status cannot be changed.`,
    };
  }

  const [unitRows]: any = await pool.query(
    `SELECT status FROM units WHERE id = ? LIMIT 1`,
    [id],
  );
  if (unitRows && unitRows.length > 0 && unitRows[0].status === "Occupied") {
    return {
      canEditStatus: false,
      reason: "Unit is marked as Occupied. Status cannot be changed.",
    };
  }

  return { canEditStatus: true };
}

export async function createUnit(data: UnitData): Promise<number> {
  const query = `
    INSERT INTO units (property_id, building_id, floor_id, unit_no, status, charges, description)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  const values = [
    data.propertyId,
    data.buildingId,
    data.floorId,
    data.unitNo,
    data.status || "Available",
    data.charges !== undefined && data.charges !== null ? data.charges : 0,
    data.description ?? null,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.insertId;
}

export async function updateUnit(id: number, data: UnitData): Promise<boolean> {
  const query = `
    UPDATE units
    SET 
      property_id = ?,
      building_id = ?,
      floor_id = ?,
      unit_no = ?,
      status = ?,
      charges = ?,
      description = ?
    WHERE id = ?;
  `;
  const values = [
    data.propertyId,
    data.buildingId,
    data.floorId,
    data.unitNo,
    data.status || "Available",
    data.charges !== undefined && data.charges !== null ? data.charges : 0,
    data.description ?? null,
    id,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function deleteUnit(id: number): Promise<boolean> {
  const query = `DELETE FROM units WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}
