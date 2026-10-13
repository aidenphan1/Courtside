import { getConnectionString } from "@netlify/database";
import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "../../../db/schema";

let cached: unknown;

function getDb() {
  if (!cached) {
    if (!process.env.NETLIFY_DB_URL) process.env.NETLIFY_DB_URL = getConnectionString();
    cached = drizzle({ schema });
  }
  return cached;
}

export const db = new Proxy({} as object, {
  get(_target, prop, receiver) {
    const real = getDb() as object;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as ReturnType<typeof drizzle>;

export { schema };
