import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface AdditionalChargeData {
  id?: number;
  amenityId?: number;
  serviceName?: string;
  categoryId?: number;
  categoryName?: string;
  type?: string;
  chargeType?: string;
  chargeAmount?: number;
}

export interface AllotmentData {
  id?: number;
  tenantId: number;
  propertyId: number;
  buildingId: number;
  unitId: number;
  charges: number;
  securityAmount?: number;
  date: string;
  allotmentFrom: string;
  allotmentTo: string;
  remarks?: string | null;
  status?: string;
  additionalCharges?: AdditionalChargeData[];
}

export interface AllotmentFilterParams {
  tenantId?: number | string;
  propertyId?: number | string;
  buildingId?: number | string;
  unitId?: number | string;
  status?: string;
}

export async function getAllotmentsList(
  filters: AllotmentFilterParams = {},
): Promise<any[]> {
  let query = `
    SELECT 
      a.id,
      a.tenant_id AS tenantId,
      COALESCE(t.name, '') AS tenantName,
      a.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      a.building_id AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      a.unit_id AS unitId,
      COALESCE(u.unit_no, '') AS unitNo,
      a.charges,
      COALESCE(a.security_amount, 0.00) AS securityAmount,
      DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(a.allotment_from, '%Y-%m-%d') AS allotmentFrom,
      DATE_FORMAT(a.allotment_to, '%Y-%m-%d') AS allotmentTo,
      COALESCE(a.remarks, '') AS remarks,
      a.status
    FROM allotments a
    LEFT JOIN tenants t ON a.tenant_id = t.id
    LEFT JOIN properties p ON a.property_id = p.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN units u ON a.unit_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.tenantId) {
    query += ` AND a.tenant_id = ?`;
    params.push(Number(filters.tenantId));
  }
  if (filters.propertyId) {
    query += ` AND a.property_id = ?`;
    params.push(Number(filters.propertyId));
  }
  if (filters.buildingId) {
    query += ` AND a.building_id = ?`;
    params.push(Number(filters.buildingId));
  }
  if (filters.unitId) {
    query += ` AND a.unit_id = ?`;
    params.push(Number(filters.unitId));
  }
  if (filters.status && filters.status !== "All") {
    query += ` AND a.status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY a.id DESC;`;

  const [allotments] = await pool.query<RowDataPacket[]>(query, params);

  if (allotments.length === 0) {
    return [];
  }

  const allotmentIds = allotments.map((allotment) => allotment.id);
  const placeholders = allotmentIds.map(() => "?").join(",");
  const [chargesRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id AS recordId,
       allotment_id AS allotmentId,
       COALESCE(amenity_id, id) AS id,
       amenity_id AS amenityId,
       service_name AS serviceName,
       category_id AS categoryId,
       category_name AS categoryName,
       type,
       charge_type AS chargeType,
       charge_amount AS chargeAmount
     FROM allotment_service_charges
     WHERE allotment_id IN (${placeholders})`,
    allotmentIds,
  );

  const chargesByAllotment: { [key: number]: any[] } = {};
  for (const chargeItem of chargesRows) {
    if (!chargesByAllotment[chargeItem.allotmentId]) {
      chargesByAllotment[chargeItem.allotmentId] = [];
    }
    chargesByAllotment[chargeItem.allotmentId].push(chargeItem);
  }

  const receivedByAllotment = await fetchReceivedByAllotments(allotmentIds);

  return allotments.map((allotment) =>
    formatAllotmentFinancials(
      allotment,
      chargesByAllotment[allotment.id] || [],
      receivedByAllotment[allotment.id] || {},
    ),
  );
}

export async function getAllotmentById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      a.id,
      a.tenant_id AS tenantId,
      COALESCE(t.name, '') AS tenantName,
      a.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      a.building_id AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      a.unit_id AS unitId,
      COALESCE(u.unit_no, '') AS unitNo,
      a.charges,
      COALESCE(a.security_amount, 0.00) AS securityAmount,
      DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(a.allotment_from, '%Y-%m-%d') AS allotmentFrom,
      DATE_FORMAT(a.allotment_to, '%Y-%m-%d') AS allotmentTo,
      COALESCE(a.remarks, '') AS remarks,
      a.status
    FROM allotments a
    LEFT JOIN tenants t ON a.tenant_id = t.id
    LEFT JOIN properties p ON a.property_id = p.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN units u ON a.unit_id = u.id
    WHERE a.id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  const allotment = rows[0];

  const [charges] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id AS recordId,
       allotment_id AS allotmentId,
       COALESCE(amenity_id, id) AS id,
       amenity_id AS amenityId,
       service_name AS serviceName,
       category_id AS categoryId,
       category_name AS categoryName,
       type,
       charge_type AS chargeType,
       charge_amount AS chargeAmount
     FROM allotment_service_charges
     WHERE allotment_id = ?`,
    [id],
  );

  const [receiptRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS receiptCount FROM rent_receipts WHERE allotment_id = ?`,
    [id],
  );
  const hasReceipts = (receiptRows[0]?.receiptCount ?? 0) > 0;

  const receivedByAllotment = await fetchReceivedByAllotments([id]);

  return {
    ...formatAllotmentFinancials(
      allotment,
      charges || [],
      receivedByAllotment[id] || {},
    ),
    hasReceipts,
  };
}

async function fetchReceivedByAllotments(
  allotmentIds: number[],
): Promise<{ [allotmentId: number]: { [serviceKey: string]: number } }> {
  if (!allotmentIds.length) {
    return {};
  }
  const placeholders = allotmentIds.map(() => "?").join(",");

  const [receiptDetailsRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       r.allotment_id AS allotmentId,
       LOWER(TRIM(d.service_name)) AS serviceKey,
       SUM(COALESCE(d.received_amount, 0)) AS totalReceived
     FROM rent_receipt_details d
     JOIN rent_receipts r ON d.receipt_id = r.id
     WHERE r.allotment_id IN (${placeholders})
     GROUP BY r.allotment_id, LOWER(TRIM(d.service_name))`,
    allotmentIds,
  );

  const [fallbackReceiptRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       r.allotment_id AS allotmentId,
       SUM(COALESCE(r.received_amount, 0)) AS totalReceived
     FROM rent_receipts r
     WHERE r.allotment_id IN (${placeholders})
       AND NOT EXISTS (SELECT 1 FROM rent_receipt_details d WHERE d.receipt_id = r.id)
      GROUP BY r.allotment_id`,
    allotmentIds,
  );

  const receivedByAllotment: {
    [allotmentId: number]: { [serviceKey: string]: number };
  } = {};

  for (const row of receiptDetailsRows) {
    const allotmentId = Number(row.allotmentId);
    const serviceKey = String(row.serviceKey || "")
      .trim()
      .toLowerCase();
    if (!receivedByAllotment[allotmentId]) {
      receivedByAllotment[allotmentId] = {};
    }
    receivedByAllotment[allotmentId][serviceKey] =
      (receivedByAllotment[allotmentId][serviceKey] || 0) +
      Number(row.totalReceived || 0);
  }

  for (const row of fallbackReceiptRows) {
    const allotmentId = Number(row.allotmentId);
    if (!receivedByAllotment[allotmentId]) {
      receivedByAllotment[allotmentId] = {};
    }
    receivedByAllotment[allotmentId]["rent"] =
      (receivedByAllotment[allotmentId]["rent"] || 0) +
      Number(row.totalReceived || 0);
  }

  return receivedByAllotment;
}

function formatAllotmentFinancials(
  allotment: any,
  charges: any[],
  receivedMap: { [serviceKey: string]: number } = {},
) {
  const rentReceived = Number((receivedMap["rent"] || 0).toFixed(2));
  const securityReceived = Number((receivedMap["security"] || 0).toFixed(2));

  const additionalCharges = (charges || []).map((chargeItem) => {
    const chargeKey = String(chargeItem.serviceName || "")
      .trim()
      .toLowerCase();
    return {
      ...chargeItem,
      receivedAmount: Number((receivedMap[chargeKey] || 0).toFixed(2)),
    };
  });

  let totalReceived = rentReceived + securityReceived;
  for (const [serviceKey, amount] of Object.entries(receivedMap)) {
    if (serviceKey !== "rent" && serviceKey !== "security") {
      totalReceived += amount;
    }
  }

  return {
    ...allotment,
    serviceName: "Rent",
    categoryName: "Rent",
    rentReceived,
    securityReceived,
    totalReceivedAmount: Number(totalReceived.toFixed(2)),
    receivedByServiceHead: receivedMap,
    additionalCharges,
  };
}

export async function createAllotment(data: AllotmentData): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const allotmentQuery = `
      INSERT INTO allotments (
        tenant_id, property_id, building_id, unit_id,
        charges, security_amount, date, allotment_from, allotment_to, remarks, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const allotmentValues = [
      data.tenantId,
      data.propertyId,
      data.buildingId,
      data.unitId,
      data.charges || 0,
      data.securityAmount !== undefined
        ? Number(data.securityAmount) || 0
        : Number(data.charges) || 0,
      data.date,
      data.allotmentFrom,
      data.allotmentTo,
      data.remarks ?? null,
      data.status || "Active",
    ];

    const [result] = await connection.query<ResultSetHeader>(
      allotmentQuery,
      allotmentValues,
    );
    const allotmentId = result.insertId;

    if (
      Array.isArray(data.additionalCharges) &&
      data.additionalCharges.length > 0
    ) {
      const chargeQuery = `
        INSERT INTO allotment_service_charges (
          allotment_id, amenity_id, service_name, category_id,
          category_name, type, charge_type, charge_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;
      for (const charge of data.additionalCharges) {
        const amenityId = charge.amenityId || charge.id || null;
        const serviceName = charge.serviceName;
        const categoryId = charge.categoryId || null;
        const categoryName = charge.categoryName || null;
        const type = charge.type || "Monthly";
        const chargeType = charge.chargeType || "Fixed";
        const chargeAmount = Number(charge.chargeAmount) || 0;

        await connection.query(chargeQuery, [
          allotmentId,
          amenityId,
          serviceName,
          categoryId,
          categoryName,
          type,
          chargeType,
          chargeAmount,
        ]);
      }
    }

    await connection.query(
      `UPDATE units SET status = 'Occupied' WHERE id = ?`,
      [data.unitId],
    );

    await connection.commit();
    return allotmentId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateAllotment(
  id: number,
  data: AllotmentData,
): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows]: any = await connection.query(
      `SELECT unit_id FROM allotments WHERE id = ?`,
      [id],
    );
    if (!existingRows || existingRows.length === 0) {
      await connection.rollback();
      return false;
    }
    const previousUnitId = existingRows[0].unit_id;

    const updateQuery = `
      UPDATE allotments
      SET 
        tenant_id = ?,
        property_id = ?,
        building_id = ?,
        unit_id = ?,
        charges = ?,
        security_amount = ?,
        date = ?,
        allotment_from = ?,
        allotment_to = ?,
        remarks = ?,
        status = ?
      WHERE id = ?;
    `;
    const updateValues = [
      data.tenantId,
      data.propertyId,
      data.buildingId,
      data.unitId,
      data.charges || 0,
      data.securityAmount !== undefined ? Number(data.securityAmount) || 0 : 0,
      data.date,
      data.allotmentFrom,
      data.allotmentTo,
      data.remarks ?? null,
      data.status || "Active",
      id,
    ];

    await connection.query(updateQuery, updateValues);

    await connection.query(
      `DELETE FROM allotment_service_charges WHERE allotment_id = ?`,
      [id],
    );

    if (
      Array.isArray(data.additionalCharges) &&
      data.additionalCharges.length > 0
    ) {
      const chargeQuery = `
        INSERT INTO allotment_service_charges (
          allotment_id, amenity_id, service_name, category_id,
          category_name, type, charge_type, charge_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `;
      for (const charge of data.additionalCharges) {
        const amenityId = charge.amenityId || charge.id || null;
        const serviceName = charge.serviceName;
        const categoryId = charge.categoryId || null;
        const categoryName = charge.categoryName || null;
        const type = charge.type || "Monthly";
        const chargeType = charge.chargeType || "Fixed";
        const chargeAmount = Number(charge.chargeAmount) || 0;

        await connection.query(chargeQuery, [
          id,
          amenityId,
          serviceName,
          categoryId,
          categoryName,
          type,
          chargeType,
          chargeAmount,
        ]);
      }
    }

    if (previousUnitId !== data.unitId) {
      const [otherAllotments]: any = await connection.query(
        `SELECT 1 FROM allotments WHERE unit_id = ? AND id != ? AND status = 'Active' LIMIT 1`,
        [previousUnitId, id],
      );
      if (!otherAllotments || otherAllotments.length === 0) {
        await connection.query(
          `UPDATE units SET status = 'Available' WHERE id = ?`,
          [previousUnitId],
        );
      }

      await connection.query(
        `UPDATE units SET status = 'Occupied' WHERE id = ?`,
        [data.unitId],
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkAllotmentInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = ["rent_receipts", "release_rooms"];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE allotment_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function deleteAllotment(id: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `SELECT unit_id FROM allotments WHERE id = ?`,
      [id],
    );
    if (!rows || rows.length === 0) {
      await connection.rollback();
      return false;
    }
    const unitId = rows[0].unit_id;

    await connection.query(
      `DELETE FROM allotment_service_charges WHERE allotment_id = ?`,
      [id],
    );
    await connection.query(`DELETE FROM allotments WHERE id = ?`, [id]);

    const [otherAllotments]: any = await connection.query(
      `SELECT 1 FROM allotments WHERE unit_id = ? AND status = 'Active' LIMIT 1`,
      [unitId],
    );
    if (!otherAllotments || otherAllotments.length === 0) {
      await connection.query(
        `UPDATE units SET status = 'Available' WHERE id = ?`,
        [unitId],
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
