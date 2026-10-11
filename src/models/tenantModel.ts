import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { resolveReceiptModeName } from "./releaseRoomModel";

export interface TenantData {
  id?: number;
  regNo: string;
  regDate: string;
  name: string;
  address?: string | null;
  mobileNo?: string | null;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  identityProof?: string | null;
  identityProofNumber?: string | null;
  status?: string | null;
  inactiveDate?: string | null;
  nextOfKinName?: string | null;
  nextOfKinMobileNo?: string | null;
  nextOfKinAddress?: string | null;
}

export interface TenantFilterParams {
  propertyId?: number | string;
  buildingId?: number | string;
  unitId?: number | string;
  status?: string;
  searchField?: string;
  keyword?: string;
}

export async function getAllTenants(
  filters: TenantFilterParams = {},
): Promise<any[]> {
  let query = `
    SELECT 
      t.id,
      t.reg_no AS regNo,
      DATE_FORMAT(t.reg_date, '%Y-%m-%d') AS regDate,
      t.name,
      t.address,
      t.mobile_no AS mobileNo,
      t.country_id AS countryId,
      t.state_id AS stateId,
      t.city_id AS cityId,
      COALESCE(c.name, '') AS cityName,
      COALESCE(s.name, '') AS stateName,
      COALESCE(co.name, '') AS countryName,
      t.identity_proof AS identityProof,
      t.identity_proof_number AS identityProofNumber,
      t.status,
      DATE_FORMAT(t.inactive_date, '%Y-%m-%d') AS inactiveDate,
      t.next_of_kin_name AS nextOfKinName,
      t.next_of_kin_mobile_no AS nextOfKinMobileNo,
      t.next_of_kin_address AS nextOfKinAddress
    FROM tenants t
    LEFT JOIN cities c ON t.city_id = c.id
    LEFT JOIN states s ON t.state_id = s.id
    LEFT JOIN countries co ON t.country_id = co.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.status && filters.status !== "All") {
    query += ` AND t.status = ?`;
    params.push(filters.status);
  }

  if (filters.keyword && filters.keyword.trim()) {
    const kw = `%${filters.keyword.trim()}%`;
    if (filters.searchField === "name") {
      query += ` AND t.name LIKE ?`;
      params.push(kw);
    } else if (filters.searchField === "regNo") {
      query += ` AND t.reg_no = ?`;
      params.push(filters.keyword.trim());
    } else if (filters.searchField === "mobileNo") {
      query += ` AND t.mobile_no LIKE ?`;
      params.push(kw);
    } else if (filters.searchField === "identityProofNumber") {
      query += ` AND t.identity_proof_number LIKE ?`;
      params.push(kw);
    } else {
      query += ` AND (t.name LIKE ? OR t.reg_no LIKE ? OR t.mobile_no LIKE ? OR t.identity_proof_number LIKE ?)`;
      params.push(kw, kw, kw, kw);
    }
  }

  if (filters.unitId) {
    query += ` AND EXISTS (SELECT 1 FROM allotments a WHERE a.tenant_id = t.id AND a.unit_id = ?)`;
    params.push(Number(filters.unitId));
  } else if (filters.buildingId) {
    query += ` AND EXISTS (SELECT 1 FROM allotments a JOIN units u ON a.unit_id = u.id WHERE a.tenant_id = t.id AND u.building_id = ?)`;
    params.push(Number(filters.buildingId));
  } else if (filters.propertyId) {
    query += ` AND EXISTS (SELECT 1 FROM allotments a JOIN units u ON a.unit_id = u.id WHERE a.tenant_id = t.id AND u.property_id = ?)`;
    params.push(Number(filters.propertyId));
  }

  query += ` ORDER BY t.id DESC;`;

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows;
}

export async function getTenantById(id: number): Promise<any | null> {
  const query = `
    SELECT 
      t.id,
      t.reg_no AS regNo,
      DATE_FORMAT(t.reg_date, '%Y-%m-%d') AS regDate,
      t.name,
      t.address,
      t.mobile_no AS mobileNo,
      t.country_id AS countryId,
      t.state_id AS stateId,
      t.city_id AS cityId,
      COALESCE(c.name, '') AS cityName,
      COALESCE(s.name, '') AS stateName,
      COALESCE(co.name, '') AS countryName,
      t.identity_proof AS identityProof,
      t.identity_proof_number AS identityProofNumber,
      t.status,
      DATE_FORMAT(t.inactive_date, '%Y-%m-%d') AS inactiveDate,
      t.next_of_kin_name AS nextOfKinName,
      t.next_of_kin_mobile_no AS nextOfKinMobileNo,
      t.next_of_kin_address AS nextOfKinAddress
    FROM tenants t
    LEFT JOIN cities c ON t.city_id = c.id
    LEFT JOIN states s ON t.state_id = s.id
    LEFT JOIN countries co ON t.country_id = co.id
    WHERE t.id = ?;
  `;
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
  if (!rows || rows.length === 0) {
    return null;
  }
  const tenant = rows[0];

  let allotment: any = null;
  try {
    const [allotmentRows]: any = await pool.query(
      `SELECT 
         a.id,
         a.tenant_id AS tenantId,
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
       LEFT JOIN units u ON a.unit_id = u.id
       LEFT JOIN properties p ON a.property_id = p.id
       LEFT JOIN buildings b ON a.building_id = b.id
       WHERE a.tenant_id = ?
       ORDER BY a.id DESC LIMIT 1`,
      [id],
    );
    if (allotmentRows && allotmentRows.length > 0) {
      allotment = allotmentRows[0];
    }
  } catch (e) {}

  return {
    ...tenant,
    allotment,
    ledger: [],
    securityLedger: [],
  };
}

export async function checkDuplicateRegNo(
  regNo: string,
  excludeId?: number,
): Promise<boolean> {
  let query = `SELECT id FROM tenants WHERE LOWER(TRIM(reg_no)) = LOWER(TRIM(?))`;
  const params: any[] = [regNo.trim()];
  if (excludeId) {
    query += ` AND id != ?`;
    params.push(excludeId);
  }
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows.length > 0;
}

export async function checkTenantInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = ["allotments", "rent_receipts", "payments"];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE tenant_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function createTenant(data: TenantData): Promise<number> {
  const query = `
    INSERT INTO tenants (
      reg_no, reg_date, name, address, mobile_no,
      country_id, state_id, city_id,
      identity_proof, identity_proof_number,
      status, inactive_date, next_of_kin_name, next_of_kin_mobile_no, next_of_kin_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  const values = [
    data.regNo,
    data.regDate,
    data.name,
    data.address ?? null,
    data.mobileNo ? data.mobileNo.trim() : null,
    data.countryId ?? null,
    data.stateId ?? null,
    data.cityId ?? null,
    data.identityProof ?? "Driving License",
    data.identityProofNumber ?? null,
    data.status ?? "Active",
    data.status === "Inactive" && data.inactiveDate ? data.inactiveDate : null,
    data.nextOfKinName ?? null,
    data.nextOfKinMobileNo ?? null,
    data.nextOfKinAddress ?? null,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.insertId;
}

export async function updateTenant(
  id: number,
  data: TenantData,
): Promise<boolean> {
  const query = `
    UPDATE tenants
    SET 
      reg_no = ?,
      reg_date = ?,
      name = ?,
      address = ?,
      mobile_no = ?,
      country_id = ?,
      state_id = ?,
      city_id = ?,
      identity_proof = ?,
      identity_proof_number = ?,
      status = ?,
      inactive_date = ?,
      next_of_kin_name = ?,
      next_of_kin_mobile_no = ?,
      next_of_kin_address = ?
    WHERE id = ?;
  `;
  const values = [
    data.regNo,
    data.regDate,
    data.name,
    data.address ?? null,
    data.mobileNo ? data.mobileNo.trim() : null,
    data.countryId ?? null,
    data.stateId ?? null,
    data.cityId ?? null,
    data.identityProof ?? "Driving License",
    data.identityProofNumber ?? null,
    data.status ?? "Active",
    data.status === "Inactive" && data.inactiveDate ? data.inactiveDate : null,
    data.nextOfKinName ?? null,
    data.nextOfKinMobileNo ?? null,
    data.nextOfKinAddress ?? null,
    id,
  ];
  const [result] = await pool.query<ResultSetHeader>(query, values);
  return result.affectedRows > 0;
}

export async function deleteTenant(id: number): Promise<boolean> {
  const query = `DELETE FROM tenants WHERE id = ?;`;
  const [result] = await pool.query<ResultSetHeader>(query, [id]);
  return result.affectedRows > 0;
}

export interface TenantLedgerItem {
  date: string;
  particulars: string;
  receiptNo: string | null;
  dueAmount: number;
  receiptAmount: number;
  mode: string | null;
  sortOrder?: number;
}

export interface TenantLedgerResult {
  openingAmount: number;
  ledger: TenantLedgerItem[];
}

export async function getTenantLedgerData(
  tenantId: number,
  fromDate?: string,
  toDate?: string,
): Promise<TenantLedgerResult> {
  const start = fromDate ? fromDate.trim() : "2000-01-01";
  const end = toDate ? toDate.trim() : "2099-12-31";

  let openingDue = 0;
  let openingReceipt = 0;
  const ledgerItems: TenantLedgerItem[] = [];

  const [allotmentRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id, 
       charges, 
       DATE_FORMAT(date, '%Y-%m-%d') AS date,
       DATE_FORMAT(allotment_from, '%Y-%m-%d') AS allotmentFrom,
       DATE_FORMAT(allotment_to, '%Y-%m-%d') AS allotmentTo,
       status
     FROM allotments
     WHERE tenant_id = ?
     ORDER BY allotment_from ASC, id ASC`,
    [tenantId],
  );

  for (const allotment of allotmentRows) {
    const [chargesRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         service_name AS serviceName,
         type,
         charge_amount AS chargeAmount
       FROM allotment_service_charges
       WHERE allotment_id = ?`,
      [allotment.id],
    );

    let monthlyAdditional = 0;
    let oneTimeAdditional = 0;
    for (const chargeItem of chargesRows) {
      const chargeAmount = Number(chargeItem.chargeAmount) || 0;
      if (chargeItem.type === "Monthly") {
        monthlyAdditional += chargeAmount;
      } else if (chargeItem.type === "One Time") {
        oneTimeAdditional += chargeAmount;
      }
    }

    const baseRent = Number(allotment.charges) || 0;
    const monthlyTotal = baseRent + monthlyAdditional;

    const fromDateStr = allotment.allotmentFrom || allotment.date;
    const toDateStr = allotment.allotmentTo;

    if (fromDateStr && toDateStr) {
      const fromParts = fromDateStr
        .split("-")
        .map((part: string) => parseInt(part, 10));
      const toParts = toDateStr
        .split("-")
        .map((part: string) => parseInt(part, 10));

      const startYear = fromParts[0];
      const startMonth = fromParts[1] - 1;
      const startDay = fromParts[2] || 1;
      const endYear = toParts[0];
      const endMonth = toParts[1] - 1;

      let totalMonths =
        (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      if (totalMonths <= 0) totalMonths = 1;
      totalMonths = Math.min(totalMonths, 120);

      for (let i = 0; i < totalMonths; i++) {
        const curYear = startYear + Math.floor((startMonth + i) / 12);
        const curMonth = (startMonth + i) % 12;
        const maxDays = new Date(curYear, curMonth + 1, 0).getDate();
        const targetDay = Math.min(startDay, maxDays);
        const yyyy = curYear;
        const mm = String(curMonth + 1).padStart(2, "0");
        const dd = String(targetDay).padStart(2, "0");
        const dueDate = `${yyyy}-${mm}-${dd}`;

        if (toDateStr && dueDate > toDateStr) {
          break;
        }

        let dueAmt = monthlyTotal;
        if (i === 0) {
          dueAmt += oneTimeAdditional;
        }

        if (dueAmt > 0) {
          if (dueDate < start) {
            openingDue += dueAmt;
          } else if (dueDate >= start && dueDate <= end) {
            ledgerItems.push({
              date: dueDate,
              particulars: "Due Amt.",
              receiptNo: null,
              dueAmount: Number(dueAmt.toFixed(2)),
              receiptAmount: 0,
              mode: null,
              sortOrder: 1,
            });
          }
        }
      }
    }
  }

  const [receiptRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       r.id,
       r.receipt_no AS receiptNo,
       DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS receiptDate,
       COALESCE(r.receipt_mode, 'Cash') AS receiptMode,
       r.received_amount AS totalReceivedAmount,
       COUNT(d.id) AS detailCount,
       COALESCE(SUM(CASE WHEN LOWER(TRIM(d.service_name)) != 'security' THEN d.received_amount ELSE 0 END), 0) AS regularReceived,
       COALESCE(SUM(CASE WHEN LOWER(TRIM(d.service_name)) = 'security' THEN d.received_amount ELSE 0 END), 0) AS securityReceived
     FROM rent_receipts r
     LEFT JOIN rent_receipt_details d ON r.id = d.receipt_id
     WHERE r.tenant_id = ?
     GROUP BY r.id, r.receipt_no, r.receipt_date, r.receipt_mode, r.received_amount
     ORDER BY r.receipt_date ASC, r.id ASC`,
    [tenantId],
  );

  for (const receiptRow of receiptRows) {
    const rcptDate = receiptRow.receiptDate;
    let rcptAmt = 0;
    if (Number(receiptRow.detailCount) > 0) {
      rcptAmt = Number(Number(receiptRow.regularReceived).toFixed(2));
    } else {
      rcptAmt = Number(Number(receiptRow.totalReceivedAmount).toFixed(2));
    }
    const rcptNo = receiptRow.receiptNo
      ? String(receiptRow.receiptNo).toLowerCase().startsWith("rcpt")
        ? String(receiptRow.receiptNo)
        : `Rcpt No. ${receiptRow.receiptNo}`
      : "";

    if (rcptAmt > 0) {
      if (rcptDate < start) {
        openingReceipt += rcptAmt;
      } else if (rcptDate >= start && rcptDate <= end) {
        ledgerItems.push({
          date: rcptDate,
          particulars: "Rcvd Amt.",
          receiptNo: rcptNo,
          dueAmount: 0,
          receiptAmount: rcptAmt,
          mode: receiptRow.receiptMode,
          sortOrder: 2,
        });
      }
    }
  }

  const openingAmount = Number((openingDue - openingReceipt).toFixed(2));

  ledgerItems.sort((firstItem, secondItem) => {
    if (firstItem.date !== secondItem.date) {
      return firstItem.date.localeCompare(secondItem.date);
    }
    return (firstItem.sortOrder || 1) - (secondItem.sortOrder || 2);
  });

  return {
    openingAmount,
    ledger: ledgerItems,
  };
}

export interface TenantSecurityLedgerItem {
  date: string | null;
  particulars: string;
  refundNo: string | null;
  dueAmount: number;
  receivedAmount: number;
  refundAmount: number;
  mode: string | null;
  sortOrder?: number;
}

export interface TenantSecurityLedgerResult {
  openingAmount: number;
  ledger: TenantSecurityLedgerItem[];
}

export async function getTenantSecurityLedgerData(
  tenantId: number,
  fromDate?: string,
  toDate?: string,
): Promise<TenantSecurityLedgerResult> {
  const start = fromDate ? fromDate.trim() : "2000-01-01";
  const end = toDate ? toDate.trim() : "2099-12-31";

  let openingDue = 0;
  let openingReceived = 0;
  let openingRefund = 0;
  const ledgerItems: TenantSecurityLedgerItem[] = [];

  const [allotmentRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       id, 
       COALESCE(security_amount, 0.00) AS securityAmount,
       DATE_FORMAT(date, '%Y-%m-%d') AS date,
       DATE_FORMAT(allotment_from, '%Y-%m-%d') AS allotmentFrom,
       DATE_FORMAT(allotment_to, '%Y-%m-%d') AS allotmentTo,
       status
     FROM allotments
     WHERE tenant_id = ?
     ORDER BY COALESCE(allotment_from, date) ASC, id ASC`,
    [tenantId],
  );

  for (const allotment of allotmentRows) {
    const secDue = Number(allotment.securityAmount) || 0;
    if (secDue > 0) {
      const allotDate = allotment.allotmentFrom || allotment.date;
      if (allotDate) {
        if (allotDate < start) {
          openingDue += secDue;
        } else if (allotDate >= start && allotDate <= end) {
          ledgerItems.push({
            date: allotDate,
            particulars: "Due Amt.",
            refundNo: null,
            dueAmount: Number(secDue.toFixed(2)),
            receivedAmount: 0,
            refundAmount: 0,
            mode: null,
            sortOrder: 1,
          });
        }
      }
    }
  }

  const [securityReceiptRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       r.id,
       r.receipt_no AS receiptNo,
       DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS receiptDate,
       COALESCE(r.receipt_mode, 'Cash') AS receiptMode,
       SUM(COALESCE(d.received_amount, 0)) AS securityReceived
     FROM rent_receipts r
     JOIN rent_receipt_details d ON r.id = d.receipt_id
     WHERE r.tenant_id = ?
       AND LOWER(TRIM(d.service_name)) = 'security'
       AND d.received_amount > 0
     GROUP BY r.id, r.receipt_no, r.receipt_date, r.receipt_mode
     ORDER BY r.receipt_date ASC, r.id ASC`,
    [tenantId],
  );

  for (const row of securityReceiptRows) {
    const rcptAmt = Number(row.securityReceived) || 0;
    if (rcptAmt > 0) {
      const rcptDate = row.receiptDate;
      const rcptNo = row.receiptNo
        ? String(row.receiptNo).toLowerCase().startsWith("rcpt")
          ? String(row.receiptNo)
          : `Rcpt No. ${row.receiptNo}`
        : "";

      if (rcptDate < start) {
        openingReceived += rcptAmt;
      } else if (rcptDate >= start && rcptDate <= end) {
        ledgerItems.push({
          date: rcptDate,
          particulars: "Rcvd Amt.",
          refundNo: rcptNo,
          dueAmount: 0,
          receivedAmount: Number(rcptAmt.toFixed(2)),
          refundAmount: 0,
          mode: resolveReceiptModeName(row.receiptMode),
          sortOrder: 2,
        });
      }
    }
  }

  const [refundRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       rr.id,
       rr.receipt_no AS refundNo,
       DATE_FORMAT(rr.date, '%Y-%m-%d') AS refundDate,
       rr.receipt_mode AS receiptMode,
       rr.refund_amount AS totalRefundAmount,
       COUNT(d.id) AS totalDetailCount,
       SUM(CASE WHEN LOWER(TRIM(d.service_name)) = 'security' THEN d.refund_amount ELSE 0 END) AS securityDetailRefund
     FROM release_rooms rr
     LEFT JOIN release_room_details d ON rr.id = d.release_room_id
     WHERE rr.tenant_id = ?
     GROUP BY rr.id, rr.receipt_no, rr.date, rr.receipt_mode, rr.refund_amount
     ORDER BY rr.date ASC, rr.id ASC`,
    [tenantId],
  );

  for (const row of refundRows) {
    let refAmt = 0;
    if (row.totalDetailCount > 0) {
      refAmt = Number(row.securityDetailRefund) || 0;
    } else {
      refAmt = Number(row.totalRefundAmount) || 0;
    }

    if (refAmt > 0) {
      const refDate = row.refundDate;
      const refNo = row.refundNo
        ? String(row.refundNo).toLowerCase().startsWith("rr-") ||
          String(row.refundNo).toLowerCase().startsWith("ref")
          ? String(row.refundNo)
          : `Ref No. ${row.refundNo}`
        : "";

      if (refDate < start) {
        openingRefund += refAmt;
      } else if (refDate >= start && refDate <= end) {
        ledgerItems.push({
          date: refDate,
          particulars: "Refund",
          refundNo: refNo,
          dueAmount: 0,
          receivedAmount: 0,
          refundAmount: Number(refAmt.toFixed(2)),
          mode: resolveReceiptModeName(row.receiptMode),
          sortOrder: 3,
        });
      }
    }
  }

  const openingAmount = Number(
    (openingDue - openingReceived + openingRefund).toFixed(2),
  );

  ledgerItems.sort((firstItem, secondItem) => {
    if (firstItem.date !== secondItem.date) {
      return (firstItem.date || "").localeCompare(secondItem.date || "");
    }
    return (firstItem.sortOrder || 1) - (secondItem.sortOrder || 2);
  });

  return {
    openingAmount,
    ledger: ledgerItems,
  };
}
