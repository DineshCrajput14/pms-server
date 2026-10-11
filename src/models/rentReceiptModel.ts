import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getNextReceiptNumberAndIncrement } from "./settingsModel";

export interface RentReceiptDetailData {
  id?: number;
  receiptId?: number;
  dueDate: string;
  serviceName: string;
  dueAmount: number;
  receivedAmount: number;
}

export interface RentReceiptData {
  id?: number;
  receiptNo?: string;
  receiptDate: string;
  tenantId: number;
  allotmentId?: number | null;
  propertyId?: number | null;
  unitId?: number | null;
  receiptMode: string;
  totalReceivable: number;
  receivedAmount: number;
  balance: number;
  remarks?: string | null;
  chequeDraftNo?: string | null;
  chequeDraftDate?: string | null;
  details?: RentReceiptDetailData[];
}

export interface RentReceiptFilterParams {
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

export async function getNextReceiptNumber(
  connection?: any,
  usedNumber?: number | string,
): Promise<string> {
  return await getNextReceiptNumberAndIncrement(connection, usedNumber);
}

export async function getAllRentReceipts(
  filters: RentReceiptFilterParams = {},
): Promise<any[]> {
  let query = `
    SELECT 
      r.id,
      r.receipt_no AS receiptNo,
      DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS receiptDate,
      r.tenant_id AS tenantId,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(t.reg_no, '') AS regNo,
      COALESCE(t.mobile_no, '') AS mobileNo,
      r.allotment_id AS allotmentId,
      r.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      COALESCE(a.building_id, u.building_id) AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      r.unit_id AS unitId,
      COALESCE(u.unit_no, '') AS unitNo,
      r.receipt_mode AS receiptMode,
      r.total_receivable AS totalReceivable,
      r.received_amount AS receivedAmount,
      r.balance,
      COALESCE(r.remarks, '') AS remarks,
      COALESCE(r.cheque_no, '') AS chequeDraftNo,
      DATE_FORMAT(r.cheque_date, '%Y-%m-%d') AS chequeDraftDate
    FROM rent_receipts r
    LEFT JOIN tenants t ON r.tenant_id = t.id
    LEFT JOIN properties p ON r.property_id = p.id
    LEFT JOIN allotments a ON r.allotment_id = a.id
    LEFT JOIN units u ON r.unit_id = u.id
    LEFT JOIN buildings b ON (a.building_id = b.id OR u.building_id = b.id)
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
    query += ` AND (a.building_id = ? OR u.building_id = ?)`;
    params.push(Number(filters.buildingId), Number(filters.buildingId));
  }
  if (filters.unitId) {
    query += ` AND r.unit_id = ?`;
    params.push(Number(filters.unitId));
  }
  if (filters.fromDate) {
    query += ` AND DATE(r.receipt_date) >= ?`;
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    query += ` AND DATE(r.receipt_date) <= ?`;
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

  const [receipts] = await pool.query<RowDataPacket[]>(query, params);

  if (receipts.length === 0) {
    return [];
  }

  const receiptIds = receipts.map((receipt) => receipt.id);
  const placeholders = receiptIds.map(() => "?").join(",");
  const [detailsRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id,
       receipt_id AS receiptId,
       DATE_FORMAT(due_date, '%Y-%m-%d') AS dueDate,
       service_name AS serviceName,
       due_amount AS dueAmount,
       received_amount AS receivedAmount
     FROM rent_receipt_details
     WHERE receipt_id IN (${placeholders})`,
    receiptIds,
  );

  const detailsByReceipt: { [key: number]: any[] } = {};
  for (const detail of detailsRows) {
    if (!detailsByReceipt[detail.receiptId]) {
      detailsByReceipt[detail.receiptId] = [];
    }
    detailsByReceipt[detail.receiptId].push(detail);
  }

  return receipts.map((receipt) => ({
    ...receipt,
    details: detailsByReceipt[receipt.id] || [],
  }));
}

export async function getRentReceiptById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      r.id,
      r.receipt_no AS receiptNo,
      DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS receiptDate,
      r.tenant_id AS tenantId,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(t.reg_no, '') AS regNo,
      COALESCE(t.mobile_no, '') AS mobileNo,
      r.allotment_id AS allotmentId,
      r.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      COALESCE(a.building_id, u.building_id) AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      r.unit_id AS unitId,
      COALESCE(u.unit_no, '') AS unitNo,
      r.receipt_mode AS receiptMode,
      r.total_receivable AS totalReceivable,
      r.received_amount AS receivedAmount,
      r.balance,
      COALESCE(r.remarks, '') AS remarks,
      COALESCE(r.cheque_no, '') AS chequeDraftNo,
      DATE_FORMAT(r.cheque_date, '%Y-%m-%d') AS chequeDraftDate
    FROM rent_receipts r
    LEFT JOIN tenants t ON r.tenant_id = t.id
    LEFT JOIN properties p ON r.property_id = p.id
    LEFT JOIN allotments a ON r.allotment_id = a.id
    LEFT JOIN units u ON r.unit_id = u.id
    LEFT JOIN buildings b ON (a.building_id = b.id OR u.building_id = b.id)
    WHERE r.id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  const receipt = rows[0];

  const [details] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id,
       receipt_id AS receiptId,
       DATE_FORMAT(due_date, '%Y-%m-%d') AS dueDate,
       service_name AS serviceName,
       due_amount AS dueAmount,
       received_amount AS receivedAmount
     FROM rent_receipt_details
     WHERE receipt_id = ?`,
    [id],
  );

  let detailsList: any[] = (details as any[]) || [];

  if (
    detailsList.length === 0 &&
    receipt.tenantId &&
    Number(receipt.totalReceivable) > 0
  ) {
    let serviceName = "";
    if (receipt.allotmentId) {
      const [charges] = await pool.query<RowDataPacket[]>(
        `SELECT service_name FROM allotment_service_charges WHERE allotment_id = ? LIMIT 1`,
        [receipt.allotmentId],
      );
      if (charges && charges.length > 0 && charges[0].service_name) {
        serviceName = charges[0].service_name;
      }
    }
    if (!serviceName) {
      serviceName = "Rent";
    }
    const dueAmt = Number(receipt.totalReceivable) || 0;
    const recAmt = Number(receipt.receivedAmount) || 0;
    const dueDate =
      receipt.receiptDate || new Date().toISOString().split("T")[0];

    try {
      const [insertRes] = await pool.query<ResultSetHeader>(
        `INSERT INTO rent_receipt_details (receipt_id, due_date, service_name, due_amount, received_amount) VALUES (?, ?, ?, ?, ?)`,
        [id, dueDate, serviceName, dueAmt, recAmt],
      );
      detailsList = [
        {
          id: insertRes.insertId,
          receiptId: id,
          dueDate,
          serviceName,
          dueAmount: dueAmt,
          receivedAmount: recAmt,
        },
      ];
    } catch (e) {
      detailsList = [
        {
          id: 1,
          receiptId: id,
          dueDate,
          serviceName,
          dueAmount: dueAmt,
          receivedAmount: recAmt,
        },
      ];
    }
  }

  return {
    ...receipt,
    details: detailsList,
  };
}

export async function updateRentReceipt(
  id: number,
  data: Partial<RentReceiptData>,
): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.receiptDate !== undefined) {
      updateFields.push("receipt_date = ?");
      values.push(data.receiptDate);
    }
    if (data.receiptMode !== undefined) {
      updateFields.push("receipt_mode = ?");
      values.push(data.receiptMode);
    }
    if (data.totalReceivable !== undefined) {
      updateFields.push("total_receivable = ?");
      values.push(data.totalReceivable);
    }
    if (data.receivedAmount !== undefined) {
      updateFields.push("received_amount = ?");
      values.push(data.receivedAmount);
    }
    if (data.balance !== undefined) {
      updateFields.push("balance = ?");
      values.push(data.balance);
    }
    if (data.remarks !== undefined) {
      updateFields.push("remarks = ?");
      values.push(data.remarks);
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

    if (updateFields.length > 0) {
      values.push(id);
      await connection.query(
        `UPDATE rent_receipts SET ${updateFields.join(", ")} WHERE id = ?`,
        values,
      );
    }

    if (data.details && Array.isArray(data.details)) {
      await connection.query(
        `DELETE FROM rent_receipt_details WHERE receipt_id = ?`,
        [id],
      );
      for (const detail of data.details) {
        const dueDate = detail.dueDate;
        const serviceName = detail.serviceName;
        const dueAmount = Number(detail.dueAmount) || 0;
        const receivedAmount = Number(detail.receivedAmount) || 0;

        await connection.query(
          `INSERT INTO rent_receipt_details (
            receipt_id, due_date, service_name, due_amount, received_amount
          ) VALUES (?, ?, ?, ?, ?);`,
          [id, dueDate, serviceName, dueAmount, receivedAmount],
        );
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

export async function createRentReceipt(
  data: RentReceiptData,
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const receiptNo =
      data.receiptNo || (await getNextReceiptNumber(connection));
    const chkNo = data.chequeDraftNo;
    const chkDate = data.chequeDraftDate;

    const receiptQuery = `
      INSERT INTO rent_receipts (
        receipt_no, receipt_date, tenant_id, allotment_id,
        property_id, unit_id, receipt_mode, total_receivable,
        received_amount, balance, remarks, cheque_no, cheque_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const receiptValues = [
      receiptNo,
      data.receiptDate,
      data.tenantId,
      data.allotmentId ?? null,
      data.propertyId ?? null,
      data.unitId ?? null,
      data.receiptMode || "Cash",
      data.totalReceivable || 0,
      data.receivedAmount || 0,
      data.balance || 0,
      data.remarks ?? null,
      chkNo ? String(chkNo).trim() : null,
      chkDate ? String(chkDate).trim() : null,
    ];

    const [result] = await connection.query<ResultSetHeader>(
      receiptQuery,
      receiptValues,
    );
    const receiptId = result.insertId;

    if (Array.isArray(data.details) && data.details.length > 0) {
      const detailQuery = `
        INSERT INTO rent_receipt_details (
          receipt_id, due_date, service_name, due_amount, received_amount
        ) VALUES (?, ?, ?, ?, ?);
      `;
      for (const item of data.details) {
        const dueDate = item.dueDate;
        const serviceName = item.serviceName;
        const dueAmount = Number(item.dueAmount) || 0;
        const receivedAmount = Number(item.receivedAmount) || 0;

        await connection.query(detailQuery, [
          receiptId,
          dueDate,
          serviceName,
          dueAmount,
          receivedAmount,
        ]);
      }
    }

    await connection.commit();
    return receiptId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkRentReceiptInUse(
  id: number,
): Promise<{ inUse: boolean; reason?: string }> {
  const [matchingRefunds] = await pool.query<RowDataPacket[]>(
    `SELECT rr.id, rr.receipt_no AS receiptNo
     FROM release_rooms rr
     JOIN release_room_details rrd ON rr.id = rrd.release_room_id
     JOIN rent_receipt_details rd ON rd.due_date = rrd.due_date AND rd.service_name = rrd.service_name
     JOIN rent_receipts r ON r.id = rd.receipt_id AND r.allotment_id = rr.allotment_id
     WHERE rd.receipt_id = ? AND rrd.refund_amount > 0
     LIMIT 1`,
    [id],
  );

  if (matchingRefunds && matchingRefunds.length > 0) {
    return {
      inUse: true,
      reason: "This rent receipt is in use. Cannot be deleted.",
    };
  }

  return { inUse: false };
}

export async function deleteRentReceipt(id: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const usageCheck = await checkRentReceiptInUse(id);
    if (usageCheck.inUse) {
      throw new Error(usageCheck.reason);
    }

    await connection.query(
      `DELETE FROM rent_receipt_details WHERE receipt_id = ?`,
      [id],
    );
    const [result] = await connection.query<ResultSetHeader>(
      `DELETE FROM rent_receipts WHERE id = ?`,
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

export interface PendingDueItem {
  id: number;
  dueDate: string;
  amount: number;
  monthIndex?: number;
  selected?: boolean;
  heads?: PendingReceiptDetailItem[];
}

export interface PendingReceiptDetailItem {
  dueDate: string;
  serviceName: string;
  dueAmount: number;
  receivedAmount: number;
}

export interface PendingDuesResult {
  hasAllotment: boolean;
  allotment: any | null;
  dueRentSummary: PendingDueItem[];
  receiptDetails: PendingReceiptDetailItem[];
  isFullyPaid: boolean;
  monthlyTotal: number;
}

export async function getPendingDuesForTenantOrAllotment(
  tenantId?: number,
  allotmentId?: number,
  excludeReceiptId?: number,
): Promise<PendingDuesResult> {
  let query = `
    SELECT 
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

  if (allotmentId) {
    query += ` AND a.id = ?`;
    params.push(allotmentId);
  } else if (tenantId) {
    query += ` AND a.tenant_id = ? ORDER BY a.status = 'Active' DESC, a.id DESC LIMIT 1`;
    params.push(tenantId);
  } else {
    return {
      hasAllotment: false,
      allotment: null,
      dueRentSummary: [],
      receiptDetails: [],
      isFullyPaid: false,
      monthlyTotal: 0,
    };
  }

  const [allotmentRows] = await pool.query<RowDataPacket[]>(query, params);
  if (!allotmentRows || allotmentRows.length === 0) {
    return {
      hasAllotment: false,
      allotment: null,
      dueRentSummary: [],
      receiptDetails: [],
      isFullyPaid: false,
      monthlyTotal: 0,
    };
  }

  const allotment = allotmentRows[0];

  const [chargesRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id AS recordId,
       allotment_id AS allotmentId,
       service_name AS serviceName,
       type,
       charge_type AS chargeType,
       charge_amount AS chargeAmount
     FROM allotment_service_charges
     WHERE allotment_id = ?`,
    [allotment.id],
  );

  const baseRent = Number(allotment.charges) || 0;
  const additionalCharges = chargesRows.map((chargeRow) => ({
    serviceName: chargeRow.serviceName,
    type: chargeRow.type,
    amount: Number(chargeRow.chargeAmount) || 0,
  }));

  const validAdditional = additionalCharges.filter(
    (chargeItem) => chargeItem.amount > 0,
  );
  let monthlyAdditional = 0;
  let oneTimeAdditional = 0;
  for (const chargeItem of validAdditional) {
    if (chargeItem.type === "Monthly") {
      monthlyAdditional += chargeItem.amount;
    } else if (chargeItem.type === "One Time") {
      oneTimeAdditional += chargeItem.amount;
    }
  }

  const monthlyTotal = baseRent + monthlyAdditional;

  const startDateStr =
    allotment.allotmentFrom ||
    allotment.date ||
    new Date().toISOString().split("T")[0];
  const endDateStr = allotment.allotmentTo;

  const startParts = startDateStr
    .split("-")
    .map((part: string) => parseInt(part, 10));
  const startYear = startParts[0] || new Date().getFullYear();
  const startMonth = (startParts[1] || 1) - 1;
  const startDay = startParts[2] || 1;

  let totalMonths = 12;
  if (endDateStr) {
    const endParts = endDateStr
      .split("-")
      .map((part: string) => parseInt(part, 10));
    const endYear = endParts[0] || startYear;
    const endMonth = (endParts[1] || 1) - 1;
    totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    if (totalMonths <= 0) totalMonths = 1;
    totalMonths = Math.min(totalMonths, 120);
  }

  const scheduledDueDates: {
    dueDate: string;
    monthIndex: number;
    totalDue: number;
  }[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const curYear = startYear + Math.floor((startMonth + i) / 12);
    const curMonth = (startMonth + i) % 12;
    const maxDays = new Date(curYear, curMonth + 1, 0).getDate();
    const targetDay = Math.min(startDay, maxDays);
    const yyyy = curYear;
    const mm = String(curMonth + 1).padStart(2, "0");
    const dd = String(targetDay).padStart(2, "0");
    const dueDate = `${yyyy}-${mm}-${dd}`;

    if (!endDateStr || dueDate <= endDateStr) {
      const monthDue =
        i === 0 ? monthlyTotal + oneTimeAdditional : monthlyTotal;
      scheduledDueDates.push({ dueDate, monthIndex: i, totalDue: monthDue });
    }
  }

  let paidQuery = `
    SELECT 
      DATE_FORMAT(d.due_date, '%Y-%m-%d') AS dueDate,
      COALESCE(NULLIF(TRIM(d.service_name), ''), 'Rent') AS serviceName,
      SUM(d.received_amount) AS totalReceived
    FROM rent_receipt_details d
    JOIN rent_receipts r ON d.receipt_id = r.id
    WHERE r.allotment_id = ?
  `;
  const paidParams: any[] = [allotment.id];
  if (excludeReceiptId) {
    paidQuery += ` AND r.id != ?`;
    paidParams.push(excludeReceiptId);
  }
  paidQuery += ` GROUP BY DATE_FORMAT(d.due_date, '%Y-%m-%d'), COALESCE(NULLIF(TRIM(d.service_name), ''), 'Rent')`;

  const [paidRows] = await pool.query<RowDataPacket[]>(paidQuery, paidParams);
  const paidHeadMap = new Map<string, number>();
  for (const row of paidRows) {
    const headKey = `${row.dueDate}_${String(row.serviceName || "")
      .trim()
      .toLowerCase()}`;
    paidHeadMap.set(headKey, Number(row.totalReceived) || 0);
  }

  const dueRentSummary: PendingDueItem[] = [];
  const pendingDetails: PendingReceiptDetailItem[] = [];

  let idx = 1;
  for (const item of scheduledDueDates) {
    const datePendingHeads: PendingReceiptDetailItem[] = [];

    if (baseRent > 0) {
      const rentHeadName = "Rent";
      const rentKey = `${item.dueDate}_${rentHeadName.toLowerCase()}`;
      const rentPaid = paidHeadMap.get(rentKey) || 0;
      const rentRemaining = Number(Math.max(0, baseRent - rentPaid).toFixed(2));
      if (rentRemaining > 0.01) {
        datePendingHeads.push({
          dueDate: item.dueDate,
          serviceName: rentHeadName,
          dueAmount: rentRemaining,
          receivedAmount: rentRemaining,
        });
      }
    }

    const securityAmount = Number(allotment.securityAmount) || 0;
    if (securityAmount > 0 && item.monthIndex === 0) {
      const secHeadName = "Security";
      const secKey = `${item.dueDate}_${secHeadName.toLowerCase()}`;
      const secPaid = paidHeadMap.get(secKey) || 0;
      const secRemaining = Number(
        Math.max(0, securityAmount - secPaid).toFixed(2),
      );
      if (secRemaining > 0.01) {
        datePendingHeads.push({
          dueDate: item.dueDate,
          serviceName: secHeadName,
          dueAmount: secRemaining,
          receivedAmount: secRemaining,
        });
      }
    }

    for (const chargeItem of validAdditional) {
      const isApplicable =
        chargeItem.type === "Monthly" ||
        (chargeItem.type === "One Time" && item.monthIndex === 0);

      if (isApplicable) {
        const headKey = `${item.dueDate}_${chargeItem.serviceName.trim().toLowerCase()}`;
        const headPaid = paidHeadMap.get(headKey) || 0;
        const headRemaining = Number(
          Math.max(0, chargeItem.amount - headPaid).toFixed(2),
        );
        if (headRemaining > 0.01) {
          datePendingHeads.push({
            dueDate: item.dueDate,
            serviceName: chargeItem.serviceName,
            dueAmount: headRemaining,
            receivedAmount: headRemaining,
          });
        }
      }
    }

    const dateTotalRemaining = Number(
      datePendingHeads
        .reduce((sum, head) => sum + head.dueAmount, 0)
        .toFixed(2),
    );

    if (dateTotalRemaining > 0.01) {
      const isFirst = dueRentSummary.length === 0;
      dueRentSummary.push({
        id: idx++,
        dueDate: item.dueDate,
        amount: dateTotalRemaining,
        monthIndex: item.monthIndex,
        selected: isFirst,
        heads: datePendingHeads,
      });

      if (isFirst) {
        pendingDetails.push(...datePendingHeads);
      }
    }
  }

  const isFullyPaid =
    scheduledDueDates.length > 0 && dueRentSummary.length === 0;

  return {
    hasAllotment: true,
    allotment: {
      ...allotment,
      serviceName: "Rent",
      categoryName: "Rent",
      securityAmount: Number(allotment.securityAmount) || 0,
      additionalCharges: chargesRows,
    },
    dueRentSummary,
    receiptDetails: pendingDetails,
    isFullyPaid,
    monthlyTotal,
  };
}

export async function getTenantDetailForReceipt(
  receiptId: number,
  registrationNumber: string,
  receiptDate?: string,
) {
  if (!registrationNumber) {
    return null;
  }
  const cleanRegNo = String(registrationNumber).trim();
  const [tenants] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, reg_no AS regNo, mobile_no AS mobileNo FROM tenants WHERE reg_no = ? LIMIT 1`,
    [cleanRegNo],
  );
  if (!tenants || tenants.length === 0) {
    return null;
  }
  const tenant = tenants[0];

  const duesResult = await getPendingDuesForTenantOrAllotment(
    tenant.id,
    undefined,
    receiptId > 0 ? receiptId : undefined,
  );

  return {
    tenantDetail: {
      id: tenant.id,
      name: tenant.name,
      regNo: tenant.regNo,
      mobileNo: tenant.mobileNo,
      allotment: duesResult.allotment,
    },
    dueRentSummary: duesResult.dueRentSummary,
    receiptDetails: duesResult.receiptDetails,
    isFullyPaid: duesResult.isFullyPaid,
    monthlyTotal: duesResult.monthlyTotal,
  };
}
