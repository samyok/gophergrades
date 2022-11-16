import { Database, OPEN_READONLY } from "sqlite3";
import path from "path";
// get the database from the root of the repo
const dbPath = path.resolve(process.cwd(), "../ProcessedData.db");

const db = new Database(dbPath, OPEN_READONLY);

const tryJSONParse = (str, err) => {
  try {
    if (JSON.parse(str)) return JSON.parse(str);
    return err;
  } catch (e) {
    if (err) return err;
    return str;
  }
};

const parseJSONFromRow = (row) => {
  const newRow = { ...row };
  if (row.grades) newRow.grades = tryJSONParse(row.grades);
  if (row.total_grades) newRow.total_grades = tryJSONParse(row.total_grades);
  if (row.libEds !== undefined) newRow.libEds = tryJSONParse(row.libEds, []);
  return newRow;
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
               LEFT JOIN departmentdistribution d on classdistribution.department_id = d.id
               LEFT JOIN (SELECT lat.right_id,json_group_array(json_object('name', l.name, 'id', lat.left_id)) as libEds
                          FROM libedAssociationTable lat
                                   LEFT JOIN libEd l ON lat.left_id = l.id
                          GROUP BY right_id) libEds on classdistribution.id = libEds.right_id
      WHERE REPLACE(class_name, ' ', '') = REPLACE($class_name, ' ', '')`;

  const params = {
    $class_name: classCode,
  };

  const rows = await promisedQuery(sql, params);

  return rows.map(parseJSONFromRow);
};

export const getDeptInfo = async (deptCode) => {
  const sql = `
      SELECT *
      FROM departmentdistribution
      WHERE dept_abbr = $dept_code`;

  const params = {
    $dept_code: deptCode.toUpperCase(),
  };

  const rows = await promisedQuery(sql, params);

  return rows.map(parseJSONFromRow);
};

export const getClassDistribtionsInDept = async (deptCode) => {
  const sql = `
      SELECT *
      FROM departmentdistribution
               LEFT JOIN classdistribution on classdistribution.department_id = departmentdistribution.id
      WHERE dept_abbr = $dept_code
      ORDER BY replace(classdistribution.class_name, ' ', '')
  `;

  const params = {
    $dept_code: deptCode.toUpperCase(),
  };

  const rows = await promisedQuery(sql, params);

  return rows.map(parseJSONFromRow);
};

export const getInstructorInfo = async (instructorId) => {
  const sql = `
      SELECT *
      FROM professor
      WHERE id = $instructor_id`;

  const params = {
    $instructor_id: instructorId,
  };

  const rows = await promisedQuery(sql, params);

  return rows.map(parseJSONFromRow);
};

export const getInstructorClasses = async (instructorId) => {
  const sql = `
      SELECT *
      FROM professor
               LEFT JOIN distribution on distribution.professor_id = professor.id
               LEFT JOIN classdistribution on classdistribution.id = distribution.class_id
      WHERE professor.id = $instructor_id`;

  const params = {
    $instructor_id: instructorId,
  };

  const rows = await promisedQuery(sql, params);

  return rows.map(parseJSONFromRow);
};

export const getSearch = async (search) => {
  const classDistSQL = `
      SELECT id, class_name, class_desc, total_students
      FROM classdistribution
      WHERE REPLACE(class_name, ' ', '') LIKE $search
         OR REPLACE(class_desc, ' ', '') LIKE $search
      ORDER BY total_students DESC
      LIMIT 10`;

  const professorSQL = `
      SELECT *
      FROM professor
      WHERE REPLACE(name, ' ', '') LIKE $search
      ORDER BY RMP_score DESC
      LIMIT 10`;

  const deptSQL = `
      SELECT *
      FROM departmentdistribution
      WHERE dept_name LIKE $search
         OR dept_abbr LIKE $search
      LIMIT 10`;

  const params = {
    $search: `%${search.replace(/ /g, "")}%`,
  };

  const departments = await promisedQuery(deptSQL, params);
  const classes = await promisedQuery(classDistSQL, params);
  const professors = await promisedQuery(professorSQL, params);

  return {
    departments: departments.map(parseJSONFromRow),
    classes: classes.map(parseJSONFromRow),
    professors: professors.map(parseJSONFromRow),
  };
};
