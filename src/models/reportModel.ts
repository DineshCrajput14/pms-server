import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";

export interface TenantRegisterQueryParams {
  propertyId?: string | number;
  buildingId?: string | number;
  unitId?: string | number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  searchField?: string;
  keyword?: string;
}

export interface TenantRegisterRow {
  id: number;
  regNo: string;
  registrationDate: string;
  tenantName: string;
  agreementDate: string;
  propertyName: string;
  buildingName: string;
  unitNo: string;
  floorName: string;
  status: string;
}

export async function getTenantRegisterReport(
  params: TenantRegisterQueryParams = {},
): Promise<TenantRegisterRow[]> {
  let query = `
    SELECT 
      t.id,
      t.reg_no AS regNo,
      DATE_FORMAT(t.reg_date, '%Y-%m-%d') AS registrationDate,
      t.name AS tenantName,
      COALESCE(DATE_FORMAT(a.allotment_to, '%Y-%m-%d'), '') AS agreementDate,
      COALESCE(p.name, '') AS propertyName,
      COALESCE(b.name, '') AS buildingName,
      COALESCE(u.unit_no, '') AS unitNo,
      COALESCE(f.name, '') AS floorName,
      CASE 
        WHEN LOWER(COALESCE(t.status, '')) IN ('inactive', 'in-active') THEN 'In-Active'
        ELSE 'Active'
      END AS status
    FROM tenants t
    LEFT JOIN (
      SELECT a1.*
      FROM allotments a1
      INNER JOIN (
        SELECT tenant_id, MAX(id) AS max_id
        FROM allotments
        GROUP BY tenant_id
      ) a_latest ON a1.id = a_latest.max_id
    ) a ON a.tenant_id = t.id
    LEFT JOIN properties p ON a.property_id = p.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN units u ON a.unit_id = u.id
    LEFT JOIN floors f ON u.floor_id = f.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  if (params.fromDate) {
    query += ` AND t.reg_date >= ?`;
    queryParams.push(params.fromDate);
  }

  if (params.toDate) {
    query += ` AND t.reg_date <= ?`;
    queryParams.push(params.toDate);
  }

  if (params.propertyId && params.propertyId !== "ALL") {
    query += ` AND a.property_id = ?`;
    queryParams.push(Number(params.propertyId));
  }

  if (params.buildingId && params.buildingId !== "ALL") {
    query += ` AND a.building_id = ?`;
    queryParams.push(Number(params.buildingId));
  }

  if (params.unitId && params.unitId !== "ALL") {
    query += ` AND a.unit_id = ?`;
    queryParams.push(Number(params.unitId));
  }

  if (params.status && params.status !== "ALL") {
    const statusFilter = String(params.status).trim().toLowerCase();
    if (statusFilter === "active") {
      query += ` AND LOWER(COALESCE(t.status, '')) = 'active'`;
    } else if (statusFilter === "in-active" || statusFilter === "inactive") {
      query += ` AND LOWER(COALESCE(t.status, '')) IN ('inactive', 'in-active')`;
    }
  }

  if (params.keyword && params.keyword.trim()) {
    const keywordFilter = `%${params.keyword.trim()}%`;
    const searchOption = params.searchField || "ALL";

    if (searchOption === "regNo") {
      query += ` AND t.reg_no LIKE ?`;
      queryParams.push(keywordFilter);
    } else if (searchOption === "tenantName") {
      query += ` AND t.name LIKE ?`;
      queryParams.push(keywordFilter);
    } else {
      query += ` AND (t.reg_no LIKE ? OR t.name LIKE ?)`;
      queryParams.push(keywordFilter, keywordFilter);
    }
  }

  query += ` ORDER BY t.reg_date DESC, t.id DESC;`;

  const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);
  return rows as TenantRegisterRow[];
}

export interface RentRegisterQueryParams {
  propertyId?: string | number;
  buildingId?: string | number;
  unitId?: string | number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  searchField?: string;
  keyword?: string;
}

export interface RentRegisterRow {
  id: number;
  rcptNo: string;
  rcptDate: string;
  tenantName: string;
  regNo: string;
  buildingName: string;
  unitNo: string;
  floorName: string;
  rcptAmount: number;
  dueMonth: string;
}

export async function getMonthlyRentRegisterReport(
  params: RentRegisterQueryParams = {},
): Promise<RentRegisterRow[]> {
  let query = `
    SELECT 
      r.id,
      r.receipt_no AS rcptNo,
      DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS rcptDate,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(t.reg_no, '') AS regNo,
      COALESCE(b.name, '') AS buildingName,
      COALESCE(u.unit_no, '') AS unitNo,
      COALESCE(f.name, '') AS floorName,
      r.received_amount AS rcptAmount,
      COALESCE(rd.due_months, DATE_FORMAT(r.receipt_date, '%b-%Y'), '') AS dueMonth
    FROM rent_receipts r
    LEFT JOIN tenants t ON r.tenant_id = t.id
    LEFT JOIN allotments a ON r.allotment_id = a.id
    LEFT JOIN units u ON r.unit_id = u.id
    LEFT JOIN buildings b ON COALESCE(u.building_id, a.building_id) = b.id
    LEFT JOIN floors f ON u.floor_id = f.id
    LEFT JOIN (
      SELECT 
        receipt_id,
        GROUP_CONCAT(DISTINCT DATE_FORMAT(due_date, '%b-%Y') ORDER BY due_date ASC SEPARATOR ', ') AS due_months
      FROM rent_receipt_details
      GROUP BY receipt_id
    ) rd ON rd.receipt_id = r.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  if (params.fromDate) {
    query += ` AND r.receipt_date >= ?`;
    queryParams.push(params.fromDate);
  }

  if (params.toDate) {
    query += ` AND r.receipt_date <= ?`;
    queryParams.push(params.toDate);
  }

  if (params.propertyId && params.propertyId !== "ALL") {
    query += ` AND (r.property_id = ? OR a.property_id = ?)`;
    queryParams.push(Number(params.propertyId), Number(params.propertyId));
  }

  if (params.buildingId && params.buildingId !== "ALL") {
    query += ` AND (u.building_id = ? OR a.building_id = ?)`;
    queryParams.push(Number(params.buildingId), Number(params.buildingId));
  }

  if (params.unitId && params.unitId !== "ALL") {
    query += ` AND r.unit_id = ?`;
    queryParams.push(Number(params.unitId));
  }

  if (params.status && params.status !== "ALL") {
    const statusFilter = String(params.status).trim().toLowerCase();
    if (statusFilter === "active") {
      query += ` AND LOWER(COALESCE(t.status, '')) = 'active'`;
    } else if (statusFilter === "in-active" || statusFilter === "inactive") {
      query += ` AND LOWER(COALESCE(t.status, '')) IN ('inactive', 'in-active')`;
    }
  }

  if (params.keyword && params.keyword.trim()) {
    const keywordFilter = `%${params.keyword.trim()}%`;
    const searchOption = params.searchField || "ALL";

    if (searchOption === "rcptNo") {
      query += ` AND r.receipt_no LIKE ?`;
      queryParams.push(keywordFilter);
    } else if (searchOption === "tenantName") {
      query += ` AND t.name LIKE ?`;
      queryParams.push(keywordFilter);
    } else if (searchOption === "regNo") {
      query += ` AND t.reg_no LIKE ?`;
      queryParams.push(keywordFilter);
    } else {
      query += ` AND (r.receipt_no LIKE ? OR t.name LIKE ? OR t.reg_no LIKE ?)`;
      queryParams.push(keywordFilter, keywordFilter, keywordFilter);
    }
  }

  query += ` ORDER BY r.receipt_date DESC, r.id DESC;`;

  const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);
  return rows as RentRegisterRow[];
}

export interface RefundRegisterQueryParams {
  propertyId?: string | number;
  buildingId?: string | number;
  unitId?: string | number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  searchField?: string;
  keyword?: string;
}

export interface RefundRegisterRow {
  id: number;
  rcptNo: string;
  rcptDate: string;
  tenantName: string;
  regNo: string;
  buildingName: string;
  unitNo: string;
  floorName: string;
  refundAmount: number;
}

export async function getMonthlyRefundRegisterReport(
  params: RefundRegisterQueryParams = {},
): Promise<RefundRegisterRow[]> {
  let query = `
    SELECT 
      rr.id,
      rr.receipt_no AS rcptNo,
      DATE_FORMAT(rr.date, '%Y-%m-%d') AS rcptDate,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(t.reg_no, '') AS regNo,
      COALESCE(b.name, '') AS buildingName,
      COALESCE(u.unit_no, '') AS unitNo,
      COALESCE(f.name, '') AS floorName,
      rr.refund_amount AS refundAmount
    FROM release_rooms rr
    LEFT JOIN tenants t ON rr.tenant_id = t.id
    LEFT JOIN allotments a ON rr.allotment_id = a.id
    LEFT JOIN units u ON rr.unit_id = u.id
    LEFT JOIN buildings b ON COALESCE(rr.building_id, u.building_id, a.building_id) = b.id
    LEFT JOIN floors f ON u.floor_id = f.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  if (params.fromDate) {
    query += ` AND rr.date >= ?`;
    queryParams.push(params.fromDate);
  }

  if (params.toDate) {
    query += ` AND rr.date <= ?`;
    queryParams.push(params.toDate);
  }

  if (params.propertyId && params.propertyId !== "ALL") {
    query += ` AND (rr.property_id = ? OR a.property_id = ?)`;
    queryParams.push(Number(params.propertyId), Number(params.propertyId));
  }

  if (params.buildingId && params.buildingId !== "ALL") {
    query += ` AND (rr.building_id = ? OR u.building_id = ? OR a.building_id = ?)`;
    queryParams.push(
      Number(params.buildingId),
      Number(params.buildingId),
      Number(params.buildingId),
    );
  }

  if (params.unitId && params.unitId !== "ALL") {
    query += ` AND rr.unit_id = ?`;
    queryParams.push(Number(params.unitId));
  }

  if (params.status && params.status !== "ALL") {
    const statusFilter = String(params.status).trim().toLowerCase();
    if (statusFilter === "active") {
      query += ` AND LOWER(COALESCE(t.status, '')) = 'active'`;
    } else if (statusFilter === "in-active" || statusFilter === "inactive") {
      query += ` AND LOWER(COALESCE(t.status, '')) IN ('inactive', 'in-active')`;
    }
  }

  if (params.keyword && params.keyword.trim()) {
    const keywordFilter = `%${params.keyword.trim()}%`;
    const searchOption = params.searchField || "ALL";

    if (searchOption === "rcptNo") {
      query += ` AND rr.receipt_no LIKE ?`;
      queryParams.push(keywordFilter);
    } else if (searchOption === "tenantName") {
      query += ` AND t.name LIKE ?`;
      queryParams.push(keywordFilter);
    } else if (searchOption === "regNo") {
      query += ` AND t.reg_no LIKE ?`;
      queryParams.push(keywordFilter);
    } else {
      query += ` AND (rr.receipt_no LIKE ? OR t.name LIKE ? OR t.reg_no LIKE ?)`;
      queryParams.push(keywordFilter, keywordFilter, keywordFilter);
    }
  }

  query += ` ORDER BY rr.date DESC, rr.id DESC;`;

  const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);
  return rows as RefundRegisterRow[];
}

export interface OutstandingRegisterQueryParams {
  propertyId?: string | number;
  buildingId?: string | number;
  unitId?: string | number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  searchField?: string;
  keyword?: string;
  monthwise?: string;
}

export interface MonthColumnInfo {
  monthKey: string;
  monthLabel: string;
}

export interface OutstandingRegisterRow {
  id: number;
  regNo: string;
  tenantName: string;
  propertyName: string;
  buildingName: string;
  unitNo: string;
  floorName: string;
  openingAmount: number;
  dueAmount: number;
  rcptAmount: number;
  balanceAmount: number;
  monthlyDues?: { [monthKey: string]: number };
  monthlyReceipts?: { [monthKey: string]: number };
  monthlyStatus?: { [monthKey: string]: string };
  [key: string]: any;
}

export interface OutstandingRegisterResult {
  report: OutstandingRegisterRow[];
  months: MonthColumnInfo[];
}

export async function getOutstandingRegisterReport(
  params: OutstandingRegisterQueryParams = {},
): Promise<OutstandingRegisterResult> {
  const fromDate = params.fromDate ? params.fromDate.trim() : "2000-01-01";
  const toDate = params.toDate ? params.toDate.trim() : "2099-12-31";

  const monthAbbreviations = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const isMonthwise = params.monthwise === "Y";
  const monthsList: MonthColumnInfo[] = [];

  if (isMonthwise) {
    const fromParts = fromDate.split("-").map((part) => parseInt(part, 10));
    const toParts = toDate.split("-").map((part) => parseInt(part, 10));

    let startYear = fromParts[0] || 2021;
    let startMonth = (fromParts[1] || 1) - 1;
    const endYear = toParts[0] || startYear;
    const endMonth = (toParts[1] || 1) - 1;

    let totalMonthsCount =
      (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    if (totalMonthsCount <= 0) totalMonthsCount = 1;
    totalMonthsCount = Math.min(totalMonthsCount, 240);

    for (let i = 0; i < totalMonthsCount; i++) {
      const curYear = startYear + Math.floor((startMonth + i) / 12);
      const curMonth = (startMonth + i) % 12;
      const mm = String(curMonth + 1).padStart(2, "0");
      const yyyy = String(curYear);
      const yy = yyyy.slice(-2);
      const monthKey = `${mm}-${yyyy}`;
      const monthLabel = `${monthAbbreviations[curMonth]}-${yy}`;
      monthsList.push({ monthKey, monthLabel });
    }
  }

  let query = `
    SELECT 
      a.id,
      a.tenant_id,
      t.reg_no AS regNo,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(p.name, '') AS propertyName,
      COALESCE(b.name, '') AS buildingName,
      COALESCE(u.unit_no, '') AS unitNo,
      COALESCE(f.name, '') AS floorName,
      a.charges AS baseRent,
      DATE_FORMAT(a.allotment_from, '%Y-%m-%d') AS allotmentFrom,
      DATE_FORMAT(a.allotment_to, '%Y-%m-%d') AS allotmentTo,
      DATE_FORMAT(a.date, '%Y-%m-%d') AS allotmentDate,
      a.status AS allotmentStatus,
      t.status AS tenantStatus
    FROM allotments a
    JOIN tenants t ON a.tenant_id = t.id
    LEFT JOIN properties p ON a.property_id = p.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN units u ON a.unit_id = u.id
    LEFT JOIN floors f ON u.floor_id = f.id
    WHERE 1=1
  `;
  const queryParams: any[] = [];

  if (params.propertyId && params.propertyId !== "ALL") {
    query += ` AND a.property_id = ?`;
    queryParams.push(Number(params.propertyId));
  }

  if (params.buildingId && params.buildingId !== "ALL") {
    query += ` AND a.building_id = ?`;
    queryParams.push(Number(params.buildingId));
  }

  if (params.unitId && params.unitId !== "ALL") {
    query += ` AND a.unit_id = ?`;
    queryParams.push(Number(params.unitId));
  }

  if (params.status && params.status !== "ALL") {
    const statusFilter = String(params.status).trim().toLowerCase();
    if (statusFilter === "active") {
      query += ` AND LOWER(COALESCE(a.status, '')) = 'active' AND LOWER(COALESCE(t.status, '')) = 'active'`;
    } else if (statusFilter === "in-active" || statusFilter === "inactive") {
      query += ` AND (LOWER(COALESCE(a.status, '')) IN ('inactive', 'in-active', 'terminated', 'expired') OR LOWER(COALESCE(t.status, '')) IN ('inactive', 'in-active'))`;
    }
  }

  if (params.keyword && params.keyword.trim()) {
    const keywordFilter = `%${params.keyword.trim()}%`;
    const searchOption = params.searchField || "ALL";

    if (searchOption === "regNo") {
      query += ` AND t.reg_no LIKE ?`;
      queryParams.push(keywordFilter);
    } else if (searchOption === "tenantName") {
      query += ` AND t.name LIKE ?`;
      queryParams.push(keywordFilter);
    } else {
      query += ` AND (t.reg_no LIKE ? OR t.name LIKE ?)`;
      queryParams.push(keywordFilter, keywordFilter);
    }
  }

  query += ` ORDER BY t.reg_no ASC, a.id DESC;`;

  const [allotments] = await pool.query<RowDataPacket[]>(query, queryParams);
  if (!allotments || allotments.length === 0) {
    return { report: [], months: monthsList };
  }

  const allotmentIds = allotments.map((allotment) => allotment.id);
  const placeholders = allotmentIds.map(() => "?").join(",");

  const [receiptRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id, 
       allotment_id AS allotmentId,
       DATE_FORMAT(receipt_date, '%Y-%m-%d') AS receiptDate,
       total_receivable, 
       received_amount, 
       balance
     FROM rent_receipts 
     WHERE allotment_id IN (${placeholders})`,
    allotmentIds,
  );

  const receiptsByAllotment = new Map<number, any[]>();
  for (const receiptRow of receiptRows) {
    if (!receiptsByAllotment.has(receiptRow.allotmentId)) {
      receiptsByAllotment.set(receiptRow.allotmentId, []);
    }
    receiptsByAllotment.get(receiptRow.allotmentId)!.push(receiptRow);
  }

  const [billedRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       r.allotment_id AS allotmentId,
       DATE_FORMAT(rd.due_date, '%Y-%m-%d') AS dueDate,
       SUM(rd.due_amount) AS totalDue,
       SUM(rd.received_amount) AS totalReceived
     FROM rent_receipt_details rd
     JOIN rent_receipts r ON rd.receipt_id = r.id
     WHERE r.allotment_id IN (${placeholders})
     GROUP BY r.allotment_id, DATE_FORMAT(rd.due_date, '%Y-%m-%d')`,
    allotmentIds,
  );

  const billedByAllotment = new Map<
    number,
    Map<string, { totalDue: number; totalReceived: number }>
  >();
  for (const billedRow of billedRows) {
    if (!billedByAllotment.has(billedRow.allotmentId)) {
      billedByAllotment.set(billedRow.allotmentId, new Map());
    }
    billedByAllotment.get(billedRow.allotmentId)!.set(billedRow.dueDate, {
      totalDue: Number(billedRow.totalDue) || 0,
      totalReceived: Number(billedRow.totalReceived) || 0,
    });
  }

  const [chargeRows] = await pool.query<RowDataPacket[]>(
    `SELECT allotment_id AS allotmentId, service_name, type, charge_amount 
     FROM allotment_service_charges 
     WHERE allotment_id IN (${placeholders})`,
    allotmentIds,
  );

  const chargesByAllotment = new Map<number, any[]>();
  for (const chargeRow of chargeRows) {
    if (!chargesByAllotment.has(chargeRow.allotmentId)) {
      chargesByAllotment.set(chargeRow.allotmentId, []);
    }
    chargesByAllotment.get(chargeRow.allotmentId)!.push(chargeRow);
  }

  const reportRows: OutstandingRegisterRow[] = [];

  for (const allotment of allotments) {
    const receipts = receiptsByAllotment.get(allotment.id) || [];
    const billedMap = billedByAllotment.get(allotment.id) || new Map();
    const charges = chargesByAllotment.get(allotment.id) || [];

    let monthlyAdditional = 0;
    let oneTimeAdditional = 0;
    for (const chargeItem of charges) {
      const chargeAmount = Number(chargeItem.charge_amount) || 0;
      if (chargeItem.type === "Monthly") monthlyAdditional += chargeAmount;
      else if (chargeItem.type === "One Time")
        oneTimeAdditional += chargeAmount;
    }
    const monthlyTotal = (Number(allotment.baseRent) || 0) + monthlyAdditional;

    const startStr = allotment.allotmentFrom || allotment.allotmentDate;
    const endStr = allotment.allotmentTo;
    const unbilledDues: { dueDate: string; amount: number }[] = [];

    if (startStr && endStr) {
      const startParts = startStr.split("-").map(Number);
      const endParts = endStr.split("-").map(Number);
      const totalMonths = Math.min(
        120,
        Math.max(
          1,
          (endParts[0] - startParts[0]) * 12 +
            (endParts[1] - startParts[1]) +
            1,
        ),
      );
      for (let i = 0; i < totalMonths; i++) {
        const curYear =
          startParts[0] + Math.floor((startParts[1] - 1 + i) / 12);
        const curMonth = (startParts[1] - 1 + i) % 12;
        const maxDays = new Date(curYear, curMonth + 1, 0).getDate();
        const dueDateStr = `${curYear}-${String(curMonth + 1).padStart(2, "0")}-${String(Math.min(startParts[2] || 1, maxDays)).padStart(2, "0")}`;
        if (dueDateStr <= endStr && !billedMap.has(dueDateStr)) {
          const dueAmountForMonth =
            i === 0 ? monthlyTotal + oneTimeAdditional : monthlyTotal;
          unbilledDues.push({ dueDate: dueDateStr, amount: dueAmountForMonth });
        }
      }
    }

    const monthlyDues: { [monthKey: string]: number } = {};
    const monthlyReceipts: { [monthKey: string]: number } = {};
    const monthlyStatus: { [monthKey: string]: string } = {};

    if (isMonthwise) {
      for (const monthColumn of monthsList) {
        monthlyDues[monthColumn.monthKey] = 0;
        monthlyReceipts[monthColumn.monthKey] = 0;
        monthlyStatus[monthColumn.monthKey] = "";
      }
    }

    let openingDue = 0;
    let openingRcpt = 0;
    let periodDue = 0;
    let periodRcpt = 0;

    for (const receiptItem of receipts) {
      const receivedAmount = Number(receiptItem.received_amount) || 0;
      if (receiptItem.receiptDate < fromDate) {
        openingRcpt += receivedAmount;
      } else if (receiptItem.receiptDate <= toDate) {
        periodRcpt += receivedAmount;
      }
    }

    for (const [dueDateStr, billedData] of billedMap.entries()) {
      if (dueDateStr < fromDate) {
        openingDue += billedData.totalDue;
      } else if (dueDateStr <= toDate) {
        periodDue += billedData.totalDue;
        if (isMonthwise) {
          const dateParts = dueDateStr.split("-");
          const monthKey = `${dateParts[1]}-${dateParts[0]}`;
          monthlyDues[monthKey] =
            (monthlyDues[monthKey] || 0) + billedData.totalDue;
          monthlyReceipts[monthKey] =
            (monthlyReceipts[monthKey] || 0) + billedData.totalReceived;
        }
      }
    }

    for (const unbilledDue of unbilledDues) {
      if (unbilledDue.dueDate < fromDate) {
        openingDue += unbilledDue.amount;
      } else if (unbilledDue.dueDate <= toDate) {
        periodDue += unbilledDue.amount;
        if (isMonthwise) {
          const dateParts = unbilledDue.dueDate.split("-");
          const monthKey = `${dateParts[1]}-${dateParts[0]}`;
          monthlyDues[monthKey] =
            (monthlyDues[monthKey] || 0) + unbilledDue.amount;
        }
      }
    }

    if (isMonthwise) {
      let totalDetailRcpt = 0;
      for (const monthColumn of monthsList) {
        totalDetailRcpt += monthlyReceipts[monthColumn.monthKey] || 0;
      }

      let unallocatedRcpt = Math.max(0, periodRcpt - totalDetailRcpt);
      if (unallocatedRcpt > 0) {
        for (const monthColumn of monthsList) {
          const due = monthlyDues[monthColumn.monthKey] || 0;
          const alreadyPaid = monthlyReceipts[monthColumn.monthKey] || 0;
          const shortage = due - alreadyPaid;
          if (shortage > 0) {
            const toApply = Math.min(shortage, unallocatedRcpt);
            monthlyReceipts[monthColumn.monthKey] = Number(
              (alreadyPaid + toApply).toFixed(2),
            );
            unallocatedRcpt = Number((unallocatedRcpt - toApply).toFixed(2));
            if (unallocatedRcpt <= 0) break;
          }
        }
      }

      for (const monthColumn of monthsList) {
        const due = Number((monthlyDues[monthColumn.monthKey] || 0).toFixed(2));
        const rcpt = Number(
          (monthlyReceipts[monthColumn.monthKey] || 0).toFixed(2),
        );
        if (due <= 0) {
          monthlyStatus[monthColumn.monthKey] = "";
        } else if (rcpt >= due - 0.01) {
          monthlyStatus[monthColumn.monthKey] = "PAID";
        } else if (rcpt > 0.01) {
          monthlyStatus[monthColumn.monthKey] = "PARTIAL";
        } else {
          monthlyStatus[monthColumn.monthKey] = "UNPAID";
        }
      }
    }

    const openingAmount = Number((openingDue - openingRcpt).toFixed(2));
    const dueAmount = Number(periodDue.toFixed(2));
    const rcptAmount = Number(periodRcpt.toFixed(2));
    const balanceAmount = Number(
      (openingAmount + dueAmount - rcptAmount).toFixed(2),
    );

    const rowItem: OutstandingRegisterRow = {
      id: allotment.id,
      regNo: allotment.regNo,
      tenantName: allotment.tenantName,
      propertyName: allotment.propertyName,
      buildingName: allotment.buildingName,
      unitNo: allotment.unitNo,
      floorName: allotment.floorName,
      openingAmount,
      dueAmount,
      rcptAmount,
      balanceAmount,
    };

    if (isMonthwise) {
      rowItem.monthlyDues = monthlyDues;
      rowItem.monthlyReceipts = monthlyReceipts;
      rowItem.monthlyStatus = monthlyStatus;
    }

    reportRows.push(rowItem);
  }

  return { report: reportRows, months: monthsList };
}

export interface OccupancyReportQueryParams {
  propertyId?: string | number;
  buildingId?: string | number;
  unitId?: string | number;
  status?: string;
}

export interface OccupancyReportUnitRow {
  id: number;
  unitNo: string;
  status: string;
  rentAmount: number;
  propertyId: number;
  propertyName: string;
  buildingId: number;
  buildingName: string;
  floorId: number;
  floorName: string;
  tenantName: string;
  allotmentFromDate: string | null;
  allotmentToDate: string | null;
}

export async function getOccupancyReportData(
  params: OccupancyReportQueryParams = {},
): Promise<OccupancyReportUnitRow[]> {
  let query = `
    SELECT 
      u.id,
      u.unit_no AS unitNo,
      CASE 
        WHEN a.id IS NOT NULL THEN 'Occupied'
        WHEN LOWER(COALESCE(u.status, '')) IN ('vacant', 'available') THEN 'Vacant'
        WHEN LOWER(COALESCE(u.status, '')) LIKE '%maintenance%' THEN 'Maintenance'
        WHEN LOWER(COALESCE(u.status, '')) = 'occupied' THEN 'Occupied'
        ELSE 'Vacant'
      END AS status,
      COALESCE(u.charges, 0) AS rentAmount,
      u.property_id AS propertyId,
      COALESCE(p.name, '') AS propertyName,
      u.building_id AS buildingId,
      COALESCE(b.name, '') AS buildingName,
      u.floor_id AS floorId,
      COALESCE(f.name, '') AS floorName,
      COALESCE(t.name, '') AS tenantName,
      DATE_FORMAT(a.allotment_from, '%d-%m-%Y') AS allotmentFromDate,
      DATE_FORMAT(a.allotment_to, '%d-%m-%Y') AS allotmentToDate
    FROM units u
    LEFT JOIN properties p ON u.property_id = p.id
    LEFT JOIN buildings b ON u.building_id = b.id
    LEFT JOIN floors f ON u.floor_id = f.id
    LEFT JOIN (
      SELECT a2.unit_id, MAX(a2.id) AS max_allotment_id
      FROM allotments a2
      WHERE LOWER(COALESCE(a2.status, '')) = 'active'
      GROUP BY a2.unit_id
    ) latest_allotment ON latest_allotment.unit_id = u.id
    LEFT JOIN allotments a ON a.id = latest_allotment.max_allotment_id
    LEFT JOIN tenants t ON a.tenant_id = t.id
    WHERE 1=1
  `;

  const queryParams: any[] = [];

  if (params.propertyId && params.propertyId !== "ALL") {
    query += ` AND u.property_id = ?`;
    queryParams.push(Number(params.propertyId));
  }

  if (params.buildingId && params.buildingId !== "ALL") {
    query += ` AND u.building_id = ?`;
    queryParams.push(Number(params.buildingId));
  }

  if (params.unitId && params.unitId !== "ALL") {
    query += ` AND u.id = ?`;
    queryParams.push(Number(params.unitId));
  }

  if (params.status && params.status !== "ALL") {
    const statusFilter = String(params.status).toUpperCase();
    if (statusFilter === "OCCUPIED") {
      query += ` AND (a.id IS NOT NULL OR LOWER(COALESCE(u.status, '')) = 'occupied')`;
    } else if (statusFilter === "VACANT") {
      query += ` AND a.id IS NULL AND LOWER(COALESCE(u.status, '')) IN ('vacant', 'available')`;
    } else if (statusFilter === "MAINTENANCE") {
      query += ` AND a.id IS NULL AND LOWER(COALESCE(u.status, '')) LIKE '%maintenance%'`;
    }
  }

  query += ` ORDER BY p.name ASC, b.name ASC, f.id ASC, CAST(u.unit_no AS UNSIGNED) ASC, u.unit_no ASC;`;

  const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);
  return rows as OccupancyReportUnitRow[];
}

export interface AgreementExpiryQueryParams {
  propertyId?: string | number;
  buildingId?: string | number;
  unitId?: string | number;
  status?: string;
  fromDate?: string;
  toDate?: string;
  searchField?: string;
  keyword?: string;
}

export interface AgreementExpiryRow {
  id: number;
  propertyName: string;
  buildingName: string;
  unitNo: string;
  tenantName: string;
  agreementDate: string;
  agreementExpiry: string;
  status: string;
}

export async function getAgreementExpiryReportData(
  params: AgreementExpiryQueryParams = {},
): Promise<AgreementExpiryRow[]> {
  let query = `
    SELECT 
      a.id,
      COALESCE(p.name, '') AS propertyName,
      COALESCE(b.name, '') AS buildingName,
      COALESCE(u.unit_no, '') AS unitNo,
      COALESCE(t.name, '') AS tenantName,
      COALESCE(DATE_FORMAT(a.allotment_from, '%Y-%m-%d'), DATE_FORMAT(a.date, '%Y-%m-%d'), '') AS agreementDate,
      COALESCE(DATE_FORMAT(a.allotment_to, '%Y-%m-%d'), '') AS agreementExpiry,
      CASE 
        WHEN LOWER(COALESCE(a.status, '')) IN ('inactive', 'in-active', 'terminated', 'expired') THEN 'In-Active'
        ELSE 'Active'
      END AS status
    FROM allotments a
    JOIN tenants t ON a.tenant_id = t.id
    LEFT JOIN properties p ON a.property_id = p.id
    LEFT JOIN buildings b ON a.building_id = b.id
    LEFT JOIN units u ON a.unit_id = u.id
    WHERE 1=1
  `;

  const queryParams: any[] = [];

  if (params.propertyId && params.propertyId !== "ALL") {
    query += ` AND a.property_id = ?`;
    queryParams.push(Number(params.propertyId));
  }

  if (params.buildingId && params.buildingId !== "ALL") {
    query += ` AND a.building_id = ?`;
    queryParams.push(Number(params.buildingId));
  }

  if (params.unitId && params.unitId !== "ALL") {
    query += ` AND a.unit_id = ?`;
    queryParams.push(Number(params.unitId));
  }

  if (params.status && params.status !== "ALL") {
    const statusFilter = String(params.status).toLowerCase();
    if (statusFilter === "active") {
      query += ` AND LOWER(COALESCE(a.status, '')) NOT IN ('inactive', 'in-active', 'terminated', 'expired')`;
    } else if (statusFilter === "in-active" || statusFilter === "inactive") {
      query += ` AND LOWER(COALESCE(a.status, '')) IN ('inactive', 'in-active', 'terminated', 'expired')`;
    } else {
      query += ` AND a.status = ?`;
      queryParams.push(params.status);
    }
  }

  if (params.fromDate) {
    query += ` AND a.allotment_to >= ?`;
    queryParams.push(params.fromDate);
  }

  if (params.toDate) {
    query += ` AND a.allotment_to <= ?`;
    queryParams.push(params.toDate);
  }

  if (params.keyword && params.keyword.trim()) {
    const keywordFilter = `%${params.keyword.trim()}%`;
    if (params.searchField === "unitNo") {
      query += ` AND u.unit_no LIKE ?`;
      queryParams.push(keywordFilter);
    } else if (params.searchField === "tenantName") {
      query += ` AND t.name LIKE ?`;
      queryParams.push(keywordFilter);
    } else {
      query += ` AND (u.unit_no LIKE ? OR t.name LIKE ? OR p.name LIKE ? OR b.name LIKE ?)`;
      queryParams.push(
        keywordFilter,
        keywordFilter,
        keywordFilter,
        keywordFilter,
      );
    }
  }

  query += ` ORDER BY (CASE WHEN a.allotment_to IS NULL THEN 1 ELSE 0 END), a.allotment_to ASC, a.id DESC;`;

  const [rows] = await pool.query<RowDataPacket[]>(query, queryParams);
  return rows as AgreementExpiryRow[];
}
