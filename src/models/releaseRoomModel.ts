import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface ReleaseRoomDetailItem {
  id?: number;
  releaseRoomId?: number;
  dueDate: string;
  serviceName: string;
  dueAmount: number;
  receivedAmount: number;
  refundAmount: number;
}

export interface ReleaseRoomData {
  id?: number;
  receiptNo?: string;
  date: string;
  tenantId: number;
  allotmentId?: number | null;
  propertyId?: number | null;
  buildingId?: number | null;
  unitId?: number | null;
  receiptMode: string | number;
  chequeDraftNo?: string | null;
  chequeDraftDate?: string | null;
  totalAmount: number;
  refundAmount: number;
  balance: number;
  isReleaseDate?: boolean;
  releaseDate?: string | null;
  deleteDues?: boolean;
  deleteDuesFromDate?: string | null;
  remarks?: string | null;
  details?: ReleaseRoomDetailItem[];
}

export interface ReleaseRoomFilterParams {
  tenantId?: number | string;
  allotmentId?: number | string;
  propertyId?: number | string;
  buildingId?: number | string;
  unitId?: number | string;
  fromDate?: string;
  toDate?: string;
  searchField?: string;
  keyword?: string;
}

const RECEIPT_MODES_LIST = [
  { id: 1, name: "Cash" },
  { id: 2, name: "Cheque" },
  { id: 3, name: "Online" },
  { id: 4, name: "Bank Transfer" },
];

export function resolveReceiptModeName(mode: any): string {
  if (mode === undefined || mode === null || mode === "") {
    return "Cash";
  }
  if (
    typeof mode === "number" ||
    (!isNaN(Number(mode)) && typeof mode === "string" && mode.trim() !== "")
  ) {
    const found = RECEIPT_MODES_LIST.find(
      (modeItem) => modeItem.id === Number(mode),
    );
    if (found) return found.name;
  }
  return String(mode);
}

export function resolveReceiptModeId(mode: any): number {
  if (typeof mode === "number") return mode;
  if (!isNaN(Number(mode)) && typeof mode === "string" && mode.trim() !== "") {
    return Number(mode);
  }
  const found = RECEIPT_MODES_LIST.find(
    (modeItem) => modeItem.name.toLowerCase() === String(mode).toLowerCase(),
  );
  return found ? found.id : 1;
}

export async function getNextReleaseRoomReceiptNumber(
  connection?: any,
): Promise<string> {
  const db = connection || pool;
  const [rows]: any = await db.query(
    `SELECT receipt_no FROM release_rooms WHERE receipt_no LIKE 'RR-%' ORDER BY id DESC LIMIT 1`,
  );

  let nextSeq = 1;
  if (rows && rows.length > 0 && rows[0].receipt_no) {
    const matched = rows[0].receipt_no.match(/RR-(\d+)/);
    if (matched && matched[1]) {
      const parsed = parseInt(matched[1], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  const padded = String(nextSeq).padStart(4, "0");
  return `RR-${padded}`;
}

export async function getAllReleaseRooms(
  filters: ReleaseRoomFilterParams = {},
): Promise<any[]> {
  let query = `
    SELECT 
      r.id,
      r.receipt_no AS receiptNo,
      DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(r.release_date, '%Y-%m-%d') AS releaseDate,
      r.is_release_date AS isReleaseDate,
      r.delete_dues AS deleteDues,
      DATE_FORMAT(r.delete_dues_from_date, '%Y-%m-%d') AS deleteDuesFromDate,
      r.tenant_id AS tenantId,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(t.reg_no, '') AS regNo,
      COALESCE(t.mobile_no, '') AS mobileNo,
      r.allotment_id AS allotmentId,
      r.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      r.building_id AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      r.unit_id AS unitId,
      COALESCE(u.unit_no, '') AS unitNo,
      COALESCE(fl.name, '') AS floorName,
      r.receipt_mode AS receiptMode,
      r.total_amount AS totalAmount,
      r.refund_amount AS refundAmount,
      r.balance,
      COALESCE(r.remarks, '') AS remarks,
      COALESCE(r.cheque_no, '') AS chequeDraftNo,
      DATE_FORMAT(r.cheque_date, '%Y-%m-%d') AS chequeDraftDate
    FROM release_rooms r
    LEFT JOIN tenants t ON r.tenant_id = t.id
    LEFT JOIN properties p ON r.property_id = p.id
    LEFT JOIN buildings b ON r.building_id = b.id
    LEFT JOIN units u ON r.unit_id = u.id
    LEFT JOIN floors fl ON u.floor_id = fl.id
    LEFT JOIN allotments a ON r.allotment_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.tenantId) {
    query += ` AND r.tenant_id = ?`;
    params.push(Number(filters.tenantId));
  }
  if (filters.allotmentId) {
    query += ` AND r.allotment_id = ?`;
    params.push(Number(filters.allotmentId));
  }
  if (filters.propertyId) {
    query += ` AND r.property_id = ?`;
    params.push(Number(filters.propertyId));
  }
  if (filters.buildingId) {
    query += ` AND r.building_id = ?`;
    params.push(Number(filters.buildingId));
  }
  if (filters.unitId) {
    query += ` AND r.unit_id = ?`;
    params.push(Number(filters.unitId));
  }
  if (filters.fromDate) {
    query += ` AND DATE(r.date) >= ?`;
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    query += ` AND DATE(r.date) <= ?`;
    params.push(filters.toDate);
  }
  if (filters.keyword && filters.keyword.trim()) {
    const kw = `%${filters.keyword.trim()}%`;
    if (filters.searchField === "tenantName") {
      query += ` AND t.name LIKE ?`;
      params.push(kw);
    } else if (filters.searchField === "receiptNo") {
      query += ` AND r.receipt_no LIKE ?`;
      params.push(kw);
    } else if (filters.searchField === "regNo") {
      query += ` AND t.reg_no LIKE ?`;
      params.push(kw);
    } else {
      query += ` AND (t.name LIKE ? OR r.receipt_no LIKE ? OR t.reg_no LIKE ?)`;
      params.push(kw, kw, kw);
    }
  }

  query += ` ORDER BY r.id DESC;`;

  const [releaseRooms] = await pool.query<RowDataPacket[]>(query, params);
  if (releaseRooms.length === 0) {
    return [];
  }

  const roomIds = releaseRooms.map((room) => room.id);
  const placeholders = roomIds.map(() => "?").join(",");
  const [detailsRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id,
       release_room_id AS releaseRoomId,
       DATE_FORMAT(due_date, '%Y-%m-%d') AS dueDate,
       service_name AS serviceName,
       due_amount AS dueAmount,
       received_amount AS receivedAmount,
       refund_amount AS refundAmount
     FROM release_room_details
     WHERE release_room_id IN (${placeholders})`,
    roomIds,
  );

  const detailsByRoom: { [key: number]: any[] } = {};
  for (const detail of detailsRows) {
    if (!detailsByRoom[detail.releaseRoomId]) {
      detailsByRoom[detail.releaseRoomId] = [];
    }
    detailsByRoom[detail.releaseRoomId].push({
      ...detail,
      dueAmount: Number(detail.dueAmount) || 0,
      receivedAmount: Number(detail.receivedAmount) || 0,
      refundAmount: Number(detail.refundAmount) || 0,
    });
  }

  return releaseRooms.map((room) => ({
    ...room,
    isReleaseDate: Boolean(room.isReleaseDate),
    deleteDues: Boolean(room.deleteDues),
    totalAmount: Number(room.totalAmount) || 0,
    refundAmount: Number(room.refundAmount) || 0,
    balance: Number(room.balance) || 0,
    receiptModeId: resolveReceiptModeId(room.receiptMode),
    details: detailsByRoom[room.id] || [],
  }));
}

export async function getReleaseRoomById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      r.id,
      r.receipt_no AS receiptNo,
      DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(r.release_date, '%Y-%m-%d') AS releaseDate,
      r.is_release_date AS isReleaseDate,
      r.delete_dues AS deleteDues,
      DATE_FORMAT(r.delete_dues_from_date, '%Y-%m-%d') AS deleteDuesFromDate,
      r.tenant_id AS tenantId,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(t.reg_no, '') AS regNo,
      COALESCE(t.mobile_no, '') AS mobileNo,
      r.allotment_id AS allotmentId,
      r.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      r.building_id AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      r.unit_id AS unitId,
      COALESCE(u.unit_no, '') AS unitNo,
      COALESCE(fl.name, '') AS floorName,
      r.receipt_mode AS receiptMode,
      r.total_amount AS totalAmount,
      r.refund_amount AS refundAmount,
      r.balance,
      COALESCE(r.remarks, '') AS remarks,
      COALESCE(r.cheque_no, '') AS chequeDraftNo,
      DATE_FORMAT(r.cheque_date, '%Y-%m-%d') AS chequeDraftDate
    FROM release_rooms r
    LEFT JOIN tenants t ON r.tenant_id = t.id
    LEFT JOIN properties p ON r.property_id = p.id
    LEFT JOIN buildings b ON r.building_id = b.id
    LEFT JOIN units u ON r.unit_id = u.id
    LEFT JOIN floors fl ON u.floor_id = fl.id
    LEFT JOIN allotments a ON r.allotment_id = a.id
    WHERE r.id = ?;
  `;

  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  const room = rows[0];

  const [details] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id,
       release_room_id AS releaseRoomId,
       DATE_FORMAT(due_date, '%Y-%m-%d') AS dueDate,
       service_name AS serviceName,
       due_amount AS dueAmount,
       received_amount AS receivedAmount,
       refund_amount AS refundAmount
     FROM release_room_details
     WHERE release_room_id = ?`,
    [id],
  );

  const detailsList = (details || []).map((detail: any) => ({
    ...detail,
    dueAmount: Number(detail.dueAmount) || 0,
    receivedAmount: Number(detail.receivedAmount) || 0,
    refundAmount: Number(detail.refundAmount) || 0,
  }));

  return {
    ...room,
    isReleaseDate: Boolean(room.isReleaseDate),
    deleteDues: Boolean(room.deleteDues),
    totalAmount: Number(room.totalAmount) || 0,
    refundAmount: Number(room.refundAmount) || 0,
    balance: Number(room.balance) || 0,
    receiptModeId: resolveReceiptModeId(room.receiptMode),
    details: detailsList,
  };
}

export async function createReleaseRoom(
  data: ReleaseRoomData,
): Promise<{ id: number; receiptNo: string }> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const receiptNo =
      data.receiptNo && data.receiptNo.trim() !== ""
        ? data.receiptNo.trim()
        : await getNextReleaseRoomReceiptNumber(connection);

    const modeName = resolveReceiptModeName(data.receiptMode);
    const isRelDateFlag = data.isReleaseDate ? 1 : 0;
    const isDelDues = data.deleteDues ? 1 : 0;
    const chequeDraftNo = data.chequeDraftNo;
    const chequeDraftDate = data.chequeDraftDate;

    const query = `
      INSERT INTO release_rooms (
        receipt_no, date, tenant_id, allotment_id,
        property_id, building_id, unit_id, receipt_mode,
        cheque_no, cheque_date, total_amount, refund_amount,
        balance, is_release_date, release_date,
        delete_dues, delete_dues_from_date, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const values = [
      receiptNo,
      data.date,
      data.tenantId,
      data.allotmentId ?? null,
      data.propertyId ?? null,
      data.buildingId ?? null,
      data.unitId ?? null,
      modeName,
      chequeDraftNo ? String(chequeDraftNo).trim() : null,
      chequeDraftDate ? String(chequeDraftDate).trim() : null,
      Number(data.totalAmount) || 0,
      Number(data.refundAmount) || 0,
      Number(data.balance) || 0,
      isRelDateFlag,
      data.releaseDate ? String(data.releaseDate).trim() : null,
      isDelDues,
      data.deleteDuesFromDate ? String(data.deleteDuesFromDate).trim() : null,
      data.remarks ?? null,
    ];

    const [result] = await connection.query<ResultSetHeader>(query, values);
    const releaseRoomId = result.insertId;

    if (Array.isArray(data.details) && data.details.length > 0) {
      const detailQuery = `
        INSERT INTO release_room_details (
          release_room_id, due_date, service_name, due_amount,
          received_amount, refund_amount
        ) VALUES (?, ?, ?, ?, ?, ?);
      `;
      for (const item of data.details) {
        const dueAmount = Number(item.dueAmount) || 0;
        const receivedAmount = Number(item.receivedAmount) || 0;
        const refundAmount = Number(item.refundAmount) || 0;

        await connection.query(detailQuery, [
          releaseRoomId,
          item.dueDate,
          item.serviceName,
          dueAmount,
          receivedAmount,
          refundAmount,
        ]);
      }
    }

    if (data.isReleaseDate || data.releaseDate) {
      if (data.unitId) {
        await connection.query(
          `UPDATE units SET status = 'Available' WHERE id = ?`,
          [data.unitId],
        );
      }
      if (data.allotmentId) {
        let updateAllotmentSql = `UPDATE allotments SET status = 'Terminated'`;
        const allotmentParams: any[] = [];
        if (data.deleteDues && data.deleteDuesFromDate) {
          updateAllotmentSql += `, allotment_to = LEAST(allotment_to, ?)`;
          allotmentParams.push(data.deleteDuesFromDate);
        }
        updateAllotmentSql += ` WHERE id = ?`;
        allotmentParams.push(data.allotmentId);
        await connection.query(updateAllotmentSql, allotmentParams);
      }
    }

    await connection.commit();
    return { id: releaseRoomId, receiptNo };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateReleaseRoom(
  id: number,
  data: Partial<ReleaseRoomData>,
): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.date !== undefined) {
      updateFields.push("date = ?");
      values.push(data.date);
    }
    if (data.receiptMode !== undefined) {
      updateFields.push("receipt_mode = ?");
      values.push(resolveReceiptModeName(data.receiptMode));
    }
    if (data.chequeDraftNo !== undefined) {
      updateFields.push("cheque_no = ?");
      values.push(
        data.chequeDraftNo ? String(data.chequeDraftNo).trim() : null,
      );
    }
    if (data.chequeDraftDate !== undefined) {
      updateFields.push("cheque_date = ?");
      values.push(
        data.chequeDraftDate ? String(data.chequeDraftDate).trim() : null,
      );
    }
    if (data.totalAmount !== undefined) {
      updateFields.push("total_amount = ?");
      values.push(Number(data.totalAmount) || 0);
    }
    if (data.refundAmount !== undefined) {
      updateFields.push("refund_amount = ?");
      values.push(Number(data.refundAmount) || 0);
    }
    if (data.balance !== undefined) {
      updateFields.push("balance = ?");
      values.push(Number(data.balance) || 0);
    }
    if (data.isReleaseDate !== undefined) {
      updateFields.push("is_release_date = ?");
      values.push(data.isReleaseDate ? 1 : 0);
    }
    if (data.releaseDate !== undefined) {
      updateFields.push("release_date = ?");
      values.push(data.releaseDate ? String(data.releaseDate).trim() : null);
    }
    if (data.deleteDues !== undefined) {
      updateFields.push("delete_dues = ?");
      values.push(data.deleteDues ? 1 : 0);
    }
    if (data.deleteDuesFromDate !== undefined) {
      updateFields.push("delete_dues_from_date = ?");
      values.push(
        data.deleteDuesFromDate ? String(data.deleteDuesFromDate).trim() : null,
      );
    }
    if (data.remarks !== undefined) {
      updateFields.push("remarks = ?");
      values.push(data.remarks ?? null);
    }

    if (updateFields.length > 0) {
      values.push(id);
      await connection.query(
        `UPDATE release_rooms SET ${updateFields.join(", ")} WHERE id = ?`,
        values,
      );
    }

    if (Array.isArray(data.details)) {
      await connection.query(
        `DELETE FROM release_room_details WHERE release_room_id = ?`,
        [id],
      );
      if (data.details.length > 0) {
        const detailQuery = `
          INSERT INTO release_room_details (
            release_room_id, due_date, service_name, due_amount,
            received_amount, refund_amount
          ) VALUES (?, ?, ?, ?, ?, ?);
        `;
        for (const item of data.details) {
          const dueAmount = Number(item.dueAmount) || 0;
          const receivedAmount = Number(item.receivedAmount) || 0;
          const refundAmount = Number(item.refundAmount) || 0;

          await connection.query(detailQuery, [
            id,
            item.dueDate,
            item.serviceName,
            dueAmount,
            receivedAmount,
            refundAmount,
          ]);
        }
      }
    }

    if (data.isReleaseDate || data.releaseDate) {
      const [existing]: any = await connection.query(
        `SELECT unit_id, allotment_id FROM release_rooms WHERE id = ?`,
        [id],
      );
      if (existing && existing.length > 0) {
        const uId = existing[0].unit_id;
        const aId = existing[0].allotment_id;
        if (uId) {
          await connection.query(
            `UPDATE units SET status = 'Available' WHERE id = ?`,
            [uId],
          );
        }
        if (aId) {
          await connection.query(
            `UPDATE allotments SET status = 'Terminated' WHERE id = ?`,
            [aId],
          );
        }
      }
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

export async function deleteReleaseRoom(id: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows]: any = await connection.query(
      `SELECT unit_id, allotment_id FROM release_rooms WHERE id = ?`,
      [id],
    );
    if (!rows || rows.length === 0) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      `DELETE FROM release_room_details WHERE release_room_id = ?`,
      [id],
    );
    const [result] = await connection.query<ResultSetHeader>(
      `DELETE FROM release_rooms WHERE id = ?`,
      [id],
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getTenantDetailForReleaseRoom(
  registrationNumber: string,
  receiptDate?: string,
  deleteDues?: boolean,
  deleteDuesFromDate?: string,
) {
  if (!registrationNumber || !registrationNumber.trim()) {
    return null;
  }
  const cleanRegNo = String(registrationNumber).trim();
  const effectiveReceiptDate =
    receiptDate && receiptDate.trim() !== ""
      ? receiptDate.trim()
      : new Date().toISOString().split("T")[0];
  const isDeleteDues = Boolean(deleteDues);

  const [tenants] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, reg_no AS regNo, mobile_no AS mobileNo FROM tenants WHERE reg_no = ? LIMIT 1`,
    [cleanRegNo],
  );
  if (!tenants || tenants.length === 0) {
    return null;
  }
  const tenant = tenants[0];

  const [allotments] = await pool.query<RowDataPacket[]>(
    `SELECT 
       a.id,
       a.tenant_id AS tenantId,
       COALESCE(t.name, '') AS tenantName,
       COALESCE(t.reg_no, '') AS regNo,
       COALESCE(t.mobile_no, '') AS mobileNo,
       a.property_id AS propertyId,
       COALESCE(p.name, '') AS propertyName,
       a.building_id AS buildingId,
       COALESCE(b.name, '') AS buildingName,
       a.unit_id AS unitId,
       COALESCE(u.unit_no, '') AS unitNo,
       COALESCE(fl.name, '') AS floorName,
       a.charges,
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
     LEFT JOIN floors fl ON u.floor_id = fl.id
     WHERE a.tenant_id = ?
     ORDER BY a.status = 'Active' DESC, a.id DESC
     LIMIT 1`,
    [tenant.id],
  );

  const allotment = allotments && allotments.length > 0 ? allotments[0] : null;
  if (!allotment) {
    return {
      tenantDetail: {
        id: tenant.id,
        name: tenant.name,
        regNo: tenant.regNo,
        mobileNo: tenant.mobileNo,
        allotment: null,
      },
      dueRentSummary: [],
      receiptDetails: [],
      isFullyPaid: false,
      monthlyTotal: 0,
    };
  }

  const [chargesRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id AS recordId,
       allotment_id AS allotmentId,
       service_name AS serviceName,
       charge_amount AS chargeAmount
     FROM allotment_service_charges
     WHERE allotment_id = ?`,
    [allotment.id],
  );

  const baseRent = Number(allotment.charges) || 0;
  const additionalCharges = (chargesRows || []).map((chargeRow) => ({
    serviceName: chargeRow.serviceName,
    amount: Number(chargeRow.chargeAmount) || 0,
  }));
  const validAdditional = additionalCharges.filter(
    (chargeItem) => chargeItem.amount > 0,
  );
  const monthlyTotal =
    baseRent +
    (validAdditional.length > 0
      ? validAdditional.reduce((sum, chargeItem) => sum + chargeItem.amount, 0)
      : 0);

  const [paidDetails] = await pool.query<RowDataPacket[]>(
    `SELECT 
       d.id,
       r.receipt_no AS receiptNo,
       DATE_FORMAT(d.due_date, '%Y-%m-%d') AS dueDate,
       d.service_name AS serviceName,
       d.due_amount AS dueAmount,
       d.received_amount AS receivedAmount
     FROM rent_receipt_details d
     JOIN rent_receipts r ON d.receipt_id = r.id
     WHERE r.allotment_id = ? AND d.received_amount > 0
     ORDER BY d.due_date ASC, d.id ASC`,
    [allotment.id],
  );

  const [refundRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       DATE_FORMAT(d.due_date, '%Y-%m-%d') AS dueDate,
       d.service_name AS serviceName,
       COALESCE(SUM(d.refund_amount), 0) AS totalRefunded
     FROM release_room_details d
     JOIN release_rooms rr ON d.release_room_id = rr.id
     WHERE rr.allotment_id = ?
     GROUP BY d.due_date, d.service_name`,
    [allotment.id],
  );

  const refundMap = new Map<string, number>();
  for (const refundRow of refundRows || []) {
    refundMap.set(
      `${refundRow.dueDate}_${refundRow.serviceName}`,
      Number(refundRow.totalRefunded) || 0,
    );
  }

  const eligibleDetails: any[] = [];
  for (const paidDetailItem of paidDetails || []) {
    const key = `${paidDetailItem.dueDate}_${paidDetailItem.serviceName}`;
    const alreadyRefunded = refundMap.get(key) || 0;
    const remainingToRefund = Math.max(
      0,
      (Number(paidDetailItem.receivedAmount) || 0) - alreadyRefunded,
    );
    if (alreadyRefunded > 0) {
      refundMap.set(
        key,
        Math.max(
          0,
          alreadyRefunded - (Number(paidDetailItem.receivedAmount) || 0),
        ),
      );
    }
    if (remainingToRefund > 0) {
      eligibleDetails.push({
        id: paidDetailItem.id,
        receiptNo: paidDetailItem.receiptNo,
        dueDate: paidDetailItem.dueDate,
        serviceName: paidDetailItem.serviceName,
        dueAmount: Number(paidDetailItem.dueAmount) || 0,
        receivedAmount: remainingToRefund,
      });
    }
  }

  const dueRentSummary: any[] = [];
  const receiptDetails: any[] = [];

  if (eligibleDetails.length > 0) {
    const dateSumMap = new Map<
      string,
      { amount: number; receiptNos: Set<string> }
    >();
    for (const detailItem of eligibleDetails) {
      const cur = dateSumMap.get(detailItem.dueDate) || {
        amount: 0,
        receiptNos: new Set<string>(),
      };
      cur.amount += Number(detailItem.receivedAmount) || 0;
      if (detailItem.receiptNo) {
        cur.receiptNos.add(String(detailItem.receiptNo));
      }
      dateSumMap.set(detailItem.dueDate, cur);
    }

    let summaryIdx = 1;
    dateSumMap.forEach((dateSummary, dueDate) => {
      dueRentSummary.push({
        id: summaryIdx++,
        dueDate,
        receiptNo: Array.from(dateSummary.receiptNos).join(", "),
        amount: Number(dateSummary.amount.toFixed(2)),
        selected: true,
      });
    });

    eligibleDetails.forEach((detailItem) => {
      receiptDetails.push({
        id: detailItem.id,
        receiptNo: detailItem.receiptNo,
        dueDate: detailItem.dueDate,
        serviceName: detailItem.serviceName,
        dueAmount: detailItem.dueAmount,
        receivedAmount: detailItem.receivedAmount,
      });
    });
  }

  return {
    tenantDetail: {
      id: tenant.id,
      name: tenant.name,
      regNo: tenant.regNo,
      mobileNo: tenant.mobileNo,
      allotment: {
        ...allotment,
        additionalCharges: chargesRows,
      },
    },
    dueRentSummary,
    receiptDetails,
    isFullyPaid: false,
    monthlyTotal,
  };
}
