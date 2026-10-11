// import { pool } from "../config/database";

// export interface OrganizationDetails {
//   id: number;
//   name: string;
//   email?: string;
//   phoneNo?: string;
//   mobileNo?: string;
//   addressLine1?: string;
//   addressLine2?: string;
//   city?: string;
//   postalCode?: string;
//   state?: {
//     id: number;
//     name: string;
//   };
//   country?: {
//     id: number;
//     name: string;
//     currency?: string;
//     currencySymbol?: string;
//   };
// }

// export async function getPrimaryOrganization(): Promise<OrganizationDetails | null> {
//   try {
//     const [rows]: any = await pool.query(
//       "SELECT * FROM organization ORDER BY id ASC LIMIT 1",
//     );
//     if (!rows || rows.length === 0) {
//       return null;
//     }

//     const organization = rows[0];
//     const countryName = organization.country;
//     const stateName = organization.state;

//     let countryId: number = 0;
//     if (countryName) {
//       const [countryRows]: any = await pool.query(
//         "SELECT id FROM countries WHERE name = ? LIMIT 1",
//         [countryName],
//       );
//       if (countryRows && countryRows.length > 0) {
//         countryId = countryRows[0].id;
//       }
//     }
//     if (!countryId) {
//       const [defaultCountry]: any = await pool.query(
//         "SELECT id FROM countries ORDER BY id ASC LIMIT 1",
//       );
//       if (defaultCountry && defaultCountry.length > 0) {
//         countryId = defaultCountry[0].id;
//       }
//     }

//     let stateId: number = 0;
//     if (stateName) {
//       const [stateRows]: any = await pool.query(
//         "SELECT id FROM states WHERE name = ? LIMIT 1",
//         [stateName],
//       );
//       if (stateRows && stateRows.length > 0) {
//         stateId = stateRows[0].id;
//       }
//     }
//     if (!stateId && countryId) {
//       const [defaultState]: any = await pool.query(
//         "SELECT id FROM states WHERE country_id = ? ORDER BY id ASC LIMIT 1",
//         [countryId],
//       );
//       if (defaultState && defaultState.length > 0) {
//         stateId = defaultState[0].id;
//       }
//     }

//     return {
//       id: organization.id,
//       name: organization.name,
//       email: organization.email,
//       phoneNo: organization.phoneNo,
//       mobileNo: organization.mobileNo,
//       addressLine1: organization.addressLine1,
//       addressLine2: organization.addressLine2,
//       city: organization.city,
//       postalCode: organization.postalCode,
//       state: {
//         id: stateId,
//         name: stateName,
//       },
//       country: {
//         id: countryId,
//         name: countryName,
//         currency: organization.currency,
//         currencySymbol: organization.currencySymbol,
//       },
//     };
//   } catch (error) {
//     throw error;
//   }
// }


import {
  isPostgres,
  pgPool,
  mysqlPool,
} from "../config/database";

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

async function queryRows(
  pgSql: string,
  mysqlSql: string,
  params: any[] = [],
): Promise<any[]> {
  if (isPostgres) {
    const result = await pgPool.query(pgSql, params);
    return result.rows;
  }

  const [rows]: any = await mysqlPool.query(
    mysqlSql,
    params,
  );

  return rows;
}

export async function getPrimaryOrganization():
  Promise<OrganizationDetails | null> {

  const organizations = await queryRows(
    "SELECT * FROM organization ORDER BY id ASC LIMIT 1",
    "SELECT * FROM organization ORDER BY id ASC LIMIT 1",
  );

  if (organizations.length === 0) {
    return null;
  }

  const organization = organizations[0];

  const countryName =
    organization.country ?? organization.country_name;

  const stateName =
    organization.state ?? organization.state_name;

  let countryId = 0;

  if (countryName) {
    const countries = await queryRows(
      "SELECT id FROM countries WHERE name = $1 LIMIT 1",
      "SELECT id FROM countries WHERE name = ? LIMIT 1",
      [countryName],
    );

    if (countries.length > 0) {
      countryId = Number(countries[0].id);
    }
  }

  if (!countryId) {
    const countries = await queryRows(
      "SELECT id FROM countries ORDER BY id ASC LIMIT 1",
      "SELECT id FROM countries ORDER BY id ASC LIMIT 1",
    );

    if (countries.length > 0) {
      countryId = Number(countries[0].id);
    }
  }

  let stateId = 0;

  if (stateName) {
    const states = await queryRows(
      "SELECT id FROM states WHERE name = $1 LIMIT 1",
      "SELECT id FROM states WHERE name = ? LIMIT 1",
      [stateName],
    );

    if (states.length > 0) {
      stateId = Number(states[0].id);
    }
  }

  if (!stateId && countryId) {
    const states = await queryRows(
      "SELECT id FROM states WHERE country_id = $1 ORDER BY id ASC LIMIT 1",
      "SELECT id FROM states WHERE country_id = ? ORDER BY id ASC LIMIT 1",
      [countryId],
    );

    if (states.length > 0) {
      stateId = Number(states[0].id);
    }
  }

  let resolvedStateName = stateName;

  if (stateId && !resolvedStateName) {
    const states = await queryRows(
      "SELECT name FROM states WHERE id = $1 LIMIT 1",
      "SELECT name FROM states WHERE id = ? LIMIT 1",
      [stateId],
    );

    resolvedStateName = states[0]?.name;
  }

  let resolvedCountryName = countryName;

  if (countryId && !resolvedCountryName) {
    const countries = await queryRows(
      "SELECT name FROM countries WHERE id = $1 LIMIT 1",
      "SELECT name FROM countries WHERE id = ? LIMIT 1",
      [countryId],
    );

    resolvedCountryName = countries[0]?.name;
  }

  return {
    id: Number(organization.id),
    name: organization.name,
    email: organization.email,
    phoneNo: organization.phoneNo ?? organization.phoneno,
    mobileNo: organization.mobileNo ?? organization.mobileno,
    addressLine1:
      organization.addressLine1 ?? organization.addressline1,
    addressLine2:
      organization.addressLine2 ?? organization.addressline2,
    city: organization.city,
    postalCode:
      organization.postalCode ?? organization.postalcode,

    state: stateId
      ? {
          id: stateId,
          name: resolvedStateName,
        }
      : undefined,

    country: countryId
      ? {
          id: countryId,
          name: resolvedCountryName,
          currency: organization.currency,
          currencySymbol:
            organization.currencySymbol ??
            organization.currencysymbol,
        }
      : undefined,
  };
}
