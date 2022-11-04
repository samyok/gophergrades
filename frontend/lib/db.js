import { Database, OPEN_READONLY } from "sqlite3";
import path from "path";
// get the database from the root of the repo
const dbPath = path.resolve(process.cwd(), "../ProcessedData.db");

const db = new Database(dbPath, OPEN_READONLY);

const tryJSONParse = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

const parseJSONFromRow = (row) => {
  return {
    ...row,
    grades: tryJSONParse(row.grades),
    total_grades: tryJSONParse(row.total_grades),
  };
};

const promisedQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const getDistribution = async (classCode) => {
  const sql = `
      SELECT distribution.id as distribution_id,
             students,
             terms,
             grades,
             professor_id,
             name            as professor_name,
             RMP_score       as professor_RMP_score
      FROM distribution
               LEFT JOIN classdistribution c on c.id = distribution.class_id
               LEFT JOIN professor p on p.id = distribution.professor_id
      WHERE REPLACE(class_name, ' ', '') = REPLACE($class_name, ' ', '')`;

  const params = {
    $class_name: classCode,
  };

  const rows = await promisedQuery(sql, params);

  return rows.map(parseJSONFromRow);
};

export const getClassInfo = async (classCode) => {
  const sql = `
      SELECT *
      FROM classdistribution
      WHERE REPLACE(class_name, ' ', '') = REPLACE($class_name, ' ', '')`;

  const params = {
    $class_name: classCode,
  };

  const rows = await promisedQuery(sql, params);

  return rows.map(parseJSONFromRow);
};
