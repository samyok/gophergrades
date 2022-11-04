// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Database, OPEN_READONLY } from "sqlite3";

import path from "path";
import { getClassInfo, getDistribution } from "../../../lib/db";

// get the database from the root of the repo
const dbPath = path.resolve(process.cwd(), "../ProcessedData.db");

const db = new Database(dbPath, OPEN_READONLY);

export default async function handler(req, res) {
  if (!req.query.classCode) {
    res
      .status(400)
      .json({ success: false, error: "Missing classCode in query string" });
    return;
  }

  const { classCode } = req.query;

  const info = await getClassInfo(classCode);

  if (info.length === 0) {
    res.status(404).json({ success: false, error: "Class not found" });
    return;
  }

  const distributions = await getDistribution(classCode);

  res.status(200).json({
    success: true,
    data: {
      ...info[0],
      distributions,
    },
  });
}
