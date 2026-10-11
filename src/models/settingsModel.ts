import { pool } from "../config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export interface ControlPanelSettingsData {
  tenantRegistrationNumberAuto: boolean;
  nextNumberTenant?: number | string;
  nextNumberReceipt?: number | string;
}

export async function getControlPanelSettings(): Promise<{
  controlPanelSetting: { tenantRegistrationNumberAuto: boolean };
  nextNumber: {
    nextNumberTenant: number | string;
    nextNumberReceipt?: number | string;
  };
}> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT tenant_registration_number_auto, next_number_tenant, next_number_receipt FROM control_panel_settings ORDER BY id ASC LIMIT 1",
  );
  if (!rows || rows.length === 0) {
    return {
      controlPanelSetting: { tenantRegistrationNumberAuto: true },
      nextNumber: { nextNumberTenant: 1, nextNumberReceipt: 101 },
    };
  }
  return {
    controlPanelSetting: {
      tenantRegistrationNumberAuto: Boolean(
        rows[0].tenant_registration_number_auto,
      ),
    },
    nextNumber: {
      nextNumberTenant: rows[0].next_number_tenant,
      nextNumberReceipt: rows[0].next_number_receipt || 101,
    },
  };
}

export async function saveControlPanelSettings(
  data: ControlPanelSettingsData,
): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM control_panel_settings ORDER BY id ASC LIMIT 1",
  );

  const autoFlag = data.tenantRegistrationNumberAuto ? 1 : 0;
  const nextNum =
    data.nextNumberTenant !== undefined &&
    data.nextNumberTenant !== null &&
    data.nextNumberTenant !== ""
      ? parseInt(String(data.nextNumberTenant), 10) || 1
      : null;
  const nextReceiptNum =
    data.nextNumberReceipt !== undefined &&
    data.nextNumberReceipt !== null &&
    data.nextNumberReceipt !== ""
      ? parseInt(String(data.nextNumberReceipt), 10) || 101
      : null;

  if (rows && rows.length > 0) {
    const id = rows[0].id;
    let query =
      "UPDATE control_panel_settings SET tenant_registration_number_auto = ?";
    const params: any[] = [autoFlag];

    if (nextNum !== null) {
      query += ", next_number_tenant = ?";
      params.push(nextNum);
    }
    if (nextReceiptNum !== null) {
      query += ", next_number_receipt = ?";
      params.push(nextReceiptNum);
    }
    query += " WHERE id = ?";
    params.push(id);

    const [result] = await pool.query<ResultSetHeader>(query, params);
    return result.affectedRows > 0;
  } else {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO control_panel_settings (id, tenant_registration_number_auto, next_number_tenant, next_number_receipt) VALUES (1, ?, ?, ?)",
      [autoFlag, nextNum || 1, nextReceiptNum || 101],
    );
    return result.affectedRows > 0;
  }
}

export async function getNextTenantNumberAndIncrement(
  usedNumber?: number | string,
): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, tenant_registration_number_auto, next_number_tenant FROM control_panel_settings ORDER BY id ASC LIMIT 1",
  );
  if (!rows || rows.length === 0) {
    const num = usedNumber ? parseInt(String(usedNumber), 10) || 1 : 1;
    await pool.query(
      "INSERT INTO control_panel_settings (id, tenant_registration_number_auto, next_number_tenant, next_number_receipt) VALUES (1, TRUE, ?, 101)",
      [num + 1],
    );
    return String(num);
  }

  const currentNext = rows[0].next_number_tenant || 1;
  const id = rows[0].id;

  let newNext = currentNext + 1;
  if (usedNumber !== undefined && usedNumber !== null) {
    const parsed = parseInt(String(usedNumber), 10);
    if (!isNaN(parsed) && parsed >= currentNext) {
      newNext = parsed + 1;
    }
  }

  await pool.query(
    "UPDATE control_panel_settings SET next_number_tenant = ? WHERE id = ?",
    [newNext, id],
  );

  return String(currentNext);
}

export async function getNextReceiptNumberAndIncrement(
  connection?: any,
  usedNumber?: number | string,
): Promise<string> {
  const db = connection || pool;
  const [rows]: any = await db.query(
    "SELECT id, next_number_receipt FROM control_panel_settings ORDER BY id ASC LIMIT 1 FOR UPDATE",
  );
  if (!rows || rows.length === 0) {
    const num = usedNumber ? parseInt(String(usedNumber), 10) || 101 : 101;
    await db.query(
      "INSERT INTO control_panel_settings (id, tenant_registration_number_auto, next_number_tenant, next_number_receipt) VALUES (1, TRUE, 1, ?)",
      [num + 1],
    );
    return String(num);
  }

  const currentNext =
    rows[0].next_number_receipt !== undefined &&
    rows[0].next_number_receipt !== null
      ? Number(rows[0].next_number_receipt)
      : 101;
  const id = rows[0].id;

  let newNext = currentNext + 1;
  if (usedNumber !== undefined && usedNumber !== null) {
    const parsed = parseInt(String(usedNumber), 10);
    if (!isNaN(parsed) && parsed >= currentNext) {
      newNext = parsed + 1;
    }
  }

  await db.query(
    "UPDATE control_panel_settings SET next_number_receipt = ? WHERE id = ?",
    [newNext, id],
  );

  return String(currentNext);
}
