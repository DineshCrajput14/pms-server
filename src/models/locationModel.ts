import { pool } from "../config/database";

export interface Country {
  id: number;
  name: string;
}

export interface State {
  id: number;
  countryId: number;
  name: string;
}

export interface City {
  id: number;
  stateId: number;
  name: string;
}

export async function getCountries(): Promise<Country[]> {
  const [rows]: any = await pool.query(
    "SELECT id, name FROM countries ORDER BY name ASC",
  );
  return rows;
}

export async function getStatesByCountryId(
  countryId: number,
): Promise<State[]> {
  const [rows]: any = await pool.query(
    "SELECT id, country_id AS countryId, name FROM states WHERE country_id = ? ORDER BY name ASC",
    [countryId],
  );
  return rows;
}

export async function getCitiesByStateId(stateId: number): Promise<City[]> {
  const [rows]: any = await pool.query(
    "SELECT id, state_id AS stateId, name FROM cities WHERE state_id = ? ORDER BY name ASC",
    [stateId],
  );
  return rows;
}

export async function getAllCities(): Promise<City[]> {
  const [rows]: any = await pool.query(
    "SELECT id, state_id AS stateId, name FROM cities ORDER BY name ASC",
  );
  return rows;
}

export async function getCityById(id: number): Promise<City | null> {
  const [rows]: any = await pool.query(
    "SELECT id, state_id AS stateId, name FROM cities WHERE id = ?",
    [id],
  );
  return rows.length ? rows[0] : null;
}

export async function createCity(
  stateId: number,
  name: string,
): Promise<number> {
  const [result]: any = await pool.query(
    "INSERT INTO cities (state_id, name) VALUES (?, ?)",
    [stateId, name],
  );
  return result.insertId;
}

export async function updateCity(
  id: number,
  name: string,
  stateId?: number,
): Promise<boolean> {
  if (stateId) {
    const [result]: any = await pool.query(
      "UPDATE cities SET name = ?, state_id = ? WHERE id = ?",
      [name, stateId, id],
    );
    return result.affectedRows > 0;
  } else {
    const [result]: any = await pool.query(
      "UPDATE cities SET name = ? WHERE id = ?",
      [name, id],
    );
    return result.affectedRows > 0;
  }
}

export async function checkCityInUse(
  id: number,
): Promise<{ inUse: boolean; table?: string }> {
  const tablesToCheck = ["properties", "tenants"];
  for (const table of tablesToCheck) {
    try {
      const [rows]: any = await pool.query(
        `SELECT 1 FROM \`${table}\` WHERE city_id = ? LIMIT 1`,
        [id],
      );
      if (rows && rows.length > 0) {
        return { inUse: true, table };
      }
    } catch (e) {}
  }
  return { inUse: false };
}

export async function deleteCity(id: number): Promise<boolean> {
  const [result]: any = await pool.query("DELETE FROM cities WHERE id = ?", [
    id,
  ]);
  return result.affectedRows > 0;
}
