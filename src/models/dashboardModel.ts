import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";

export interface DashboardSummaryResponse {
  stats: {
    totalProperties: number;
    totalBuildings: number;
    totalFloors: number;
    totalUnits: number;
    occupiedUnits: number;
    availableUnits: number;
    maintenanceUnits: number;
    totalTenants: number;
    activeTenants: number;
    totalAmenities: number;
    totalCategories: number;
  };
  financials: {
    totalRentReceivable: number;
    totalRentCollected: number;
    totalOutstandingBalance: number;
    monthlyCollected: number;
    todayCollected: number;
    todayRefunded: number;
    todayNet: number;
    collectionEfficiency: number;
  };
  occupancy: {
    occupancyPercent: number;
    availablePercent: number;
    maintenancePercent: number;
  };
  recentReceipts: any[];
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const countsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM properties) AS totalProperties,
      (SELECT COUNT(*) FROM buildings) AS totalBuildings,
      (SELECT COUNT(*) FROM floors) AS totalFloors,
      (SELECT COUNT(*) FROM units) AS totalUnits,
      (SELECT COUNT(*) FROM units WHERE LOWER(COALESCE(status, '')) = 'occupied') AS occupiedUnits,
      (SELECT COUNT(*) FROM units WHERE LOWER(COALESCE(status, '')) IN ('available', 'vacant', '')) AS availableUnits,
      (SELECT COUNT(*) FROM units WHERE LOWER(COALESCE(status, '')) NOT IN ('occupied', 'available', 'vacant', '')) AS maintenanceUnits,
      (SELECT COUNT(*) FROM tenants) AS totalTenants,
      (SELECT COUNT(*) FROM tenants WHERE LOWER(COALESCE(status, 'active')) = 'active') AS activeTenants,
      (SELECT COUNT(*) FROM amenities) AS totalAmenities,
      (SELECT COUNT(*) FROM categories) AS totalCategories;
  `;
  const financialsQuery = `
    SELECT 
      COALESCE(SUM(total_receivable), 0) AS totalRentReceivable,
      COALESCE(SUM(received_amount), 0) AS totalRentCollected,
      COALESCE(SUM(balance), 0) AS totalOutstandingBalance
    FROM rent_receipts;
  `;

  const monthlyQuery = `
    SELECT 
      COALESCE(SUM(received_amount), 0) AS monthlyCollected
    FROM rent_receipts
    WHERE MONTH(receipt_date) = MONTH(CURRENT_DATE()) 
      AND YEAR(receipt_date) = YEAR(CURRENT_DATE());
  `;

  const todayCollectionQuery = `
    SELECT 
      COALESCE(SUM(received_amount), 0) AS todayCollected
    FROM rent_receipts
    WHERE DATE(receipt_date) = CURRENT_DATE();
  `;

  const todayRefundQuery = `
    SELECT 
      COALESCE(SUM(refund_amount), 0) AS todayRefunded
    FROM release_rooms
    WHERE DATE(date) = CURRENT_DATE();
  `;

  const recentReceiptsQuery = `
    SELECT 
      r.id,
      r.receipt_no AS receiptNo,
      DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS receiptDate,
      r.tenant_id AS tenantId,
      COALESCE(t.name, 'N/A') AS tenantName,
      r.unit_id AS unitId,
      COALESCE(u.unit_no, '-') AS unitNo,
      COALESCE(b.name, '') AS buildingName,
      COALESCE(r.receipt_mode, 'Cash') AS receiptMode,
      r.total_receivable AS totalReceivable,
      r.received_amount AS receivedAmount,
      r.balance
    FROM rent_receipts r
    LEFT JOIN tenants t ON r.tenant_id = t.id
    LEFT JOIN units u ON r.unit_id = u.id
    LEFT JOIN buildings b ON u.building_id = b.id
    ORDER BY r.id DESC
    LIMIT 5;
  `;

  const [
    [countsRows],
    [financialsRows],
    [monthlyRows],
    [todayCollectionRows],
    [todayRefundRows],
    [recentReceiptsRows],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(countsQuery),
    pool.query<RowDataPacket[]>(financialsQuery),
    pool.query<RowDataPacket[]>(monthlyQuery),
    pool.query<RowDataPacket[]>(todayCollectionQuery),
    pool.query<RowDataPacket[]>(todayRefundQuery),
    pool.query<RowDataPacket[]>(recentReceiptsQuery),
  ]);

  const counts = countsRows[0] || {};
  const financialsData = financialsRows[0] || {};
  const monthlyData = monthlyRows[0] || {};
  const todayCollectionData = todayCollectionRows[0] || {};
  const todayRefundData = todayRefundRows[0] || {};

  const totalUnits = Number(counts.totalUnits) || 0;
  const occupiedUnits = Number(counts.occupiedUnits) || 0;
  const availableUnits = Number(counts.availableUnits) || 0;
  const maintenanceUnits = Number(counts.maintenanceUnits) || 0;

  let occupancyPercent = 0;
  let availablePercent = 0;
  let maintenancePercent = 0;

  if (totalUnits > 0) {
    occupancyPercent = Math.round((occupiedUnits / totalUnits) * 100);
    availablePercent = Math.round((availableUnits / totalUnits) * 100);
    maintenancePercent = Math.max(0, 100 - occupancyPercent - availablePercent);
  }

  const totalRentReceivable = Number(financialsData.totalRentReceivable) || 0;
  const totalRentCollected = Number(financialsData.totalRentCollected) || 0;
  const totalOutstandingBalance =
    Number(financialsData.totalOutstandingBalance) || 0;
  const monthlyCollected = Number(monthlyData.monthlyCollected) || 0;
  const todayCollected = Number(todayCollectionData.todayCollected) || 0;
  const todayRefunded = Number(todayRefundData.todayRefunded) || 0;
  const todayNet = todayCollected - todayRefunded;

  let collectionEfficiency = 0;
  if (totalRentReceivable > 0) {
    collectionEfficiency = Math.round(
      (totalRentCollected / totalRentReceivable) * 100,
    );
  } else if (totalRentCollected > 0) {
    collectionEfficiency = 100;
  }

  return {
    stats: {
      totalProperties: Number(counts.totalProperties) || 0,
      totalBuildings: Number(counts.totalBuildings) || 0,
      totalFloors: Number(counts.totalFloors) || 0,
      totalUnits,
      occupiedUnits,
      availableUnits,
      maintenanceUnits,
      totalTenants: Number(counts.totalTenants) || 0,
      activeTenants: Number(counts.activeTenants) || 0,
      totalAmenities: Number(counts.totalAmenities) || 0,
      totalCategories: Number(counts.totalCategories) || 0,
    },
    financials: {
      totalRentReceivable,
      totalRentCollected,
      totalOutstandingBalance,
      monthlyCollected,
      todayCollected,
      todayRefunded,
      todayNet,
      collectionEfficiency,
    },
    occupancy: {
      occupancyPercent,
      availablePercent,
      maintenancePercent,
    },
    recentReceipts: recentReceiptsRows || [],
  };
}
