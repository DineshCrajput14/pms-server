import { pool } from "../config/database";

export interface OrganizationDetails {
  id: number;
  name: string;
  email?: string;
  phoneNo?: string;
  mobileNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  state?: {
    id: number;
    name: string;
  };
  country?: {
    id: number;
    name: string;
    currency?: string;
    currencySymbol?: string;
  };
}

export async function getPrimaryOrganization(): Promise<OrganizationDetails | null> {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM organization ORDER BY id ASC LIMIT 1",
    );
    if (!rows || rows.length === 0) {
      return null;
    }

    const organization = rows[0];
    const countryName = organization.country;
    const stateName = organization.state;

    let countryId: number = 0;
    if (countryName) {
      const [countryRows]: any = await pool.query(
        "SELECT id FROM countries WHERE name = ? LIMIT 1",
        [countryName],
      );
      if (countryRows && countryRows.length > 0) {
        countryId = countryRows[0].id;
      }
    }
    if (!countryId) {
      const [defaultCountry]: any = await pool.query(
        "SELECT id FROM countries ORDER BY id ASC LIMIT 1",
      );
      if (defaultCountry && defaultCountry.length > 0) {
        countryId = defaultCountry[0].id;
      }
    }

    let stateId: number = 0;
    if (stateName) {
      const [stateRows]: any = await pool.query(
        "SELECT id FROM states WHERE name = ? LIMIT 1",
        [stateName],
      );
      if (stateRows && stateRows.length > 0) {
        stateId = stateRows[0].id;
      }
    }
    if (!stateId && countryId) {
      const [defaultState]: any = await pool.query(
        "SELECT id FROM states WHERE country_id = ? ORDER BY id ASC LIMIT 1",
        [countryId],
      );
      if (defaultState && defaultState.length > 0) {
        stateId = defaultState[0].id;
      }
    }

    return {
      id: organization.id,
      name: organization.name,
      email: organization.email,
      phoneNo: organization.phoneNo,
      mobileNo: organization.mobileNo,
      addressLine1: organization.addressLine1,
      addressLine2: organization.addressLine2,
      city: organization.city,
      postalCode: organization.postalCode,
      state: {
        id: stateId,
        name: stateName,
      },
      country: {
        id: countryId,
        name: countryName,
        currency: organization.currency,
        currencySymbol: organization.currencySymbol,
      },
    };
  } catch (error) {
    throw error;
  }
}
