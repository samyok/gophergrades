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

const groupBy = (array, key) => {
  return Object.values(
    array.reduce((result, currentValue) => {
      // eslint-disable-next-line no-param-reassign
      (result[currentValue[key]] = result[currentValue[key]] || []).push(
        currentValue
      );
      return result;
    }, {})
  );
};

const summarizeTerms = (groupedDistributions) => {
  // grouped distributions is an array of arrays of distributions
  // each distribution has a grades property, which is an object with the letter grades as keys and the number of students as values
  // we want to sum up the number of students for each letter grade across all distributions

  return groupedDistributions.map((distributions) => {
    const grades = {};
    const terms = distributions.map((distribution) => ({
      term: distribution.term,
      grades: distribution.grades,
      students: distribution.students,
    }));
    const students = terms.reduce((acc, term) => acc + term.students, 0);
    distributions.forEach((distribution) => {
      Object.keys(distribution.grades).forEach((grade) => {
        if (grades[grade]) {
          grades[grade] += distribution.grades[grade];
        } else {
          grades[grade] = distribution.grades[grade];
        }
      });
    });
    return { ...distributions[0], grades, terms, students };
  });
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
      SELECT d.id      as distribution_id,
             students,
             term,
             grades,
             professor_id,
             name      as professor_name,
             RMP_score as professor_RMP_score
      FROM classdistribution
               LEFT JOIN distribution d on classdistribution.id = d.class_id
               LEFT JOIN termdistribution t on d.id = t.dist_id
               LEFT JOIN professor p on d.professor_id = p.id
      WHERE REPLACE(class_name, ' ', '') = REPLACE($class_name, ' ', '')`;

  const params = {
    $class_name: classCode,
  };

  const rows = await promisedQuery(sql, params);

  return summarizeTerms(groupBy(rows.map(parseJSONFromRow), "professor_id"));
};

export const getClassInfo = async (classCode) => {
  const sql = `
      SELECT *
      FROM classdistribution
               LEFT JOIN departmentdistribution d on classdistribution.department_id = d.id
               LEFT JOIN (SELECT lat.right_id,
                                 json_group_array(json_object('name', l.name, 'id', lat.left_id)) as libEds
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

export const getEveryClassCode = async () => {
  const sql = `
      SELECT class_name
      FROM classdistribution`;

  const rows = await promisedQuery(sql);

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
               LEFT JOIN distribution d on professor.id = d.professor_id
               LEFT JOIN termdistribution t on d.id = t.dist_id
               LEFT JOIN classdistribution c on d.class_id = c.id
      WHERE professor.id = $instructor_id`;

  const params = {
    $instructor_id: instructorId,
  };

  const rows = await promisedQuery(sql, params);

  return summarizeTerms(groupBy(rows.map(parseJSONFromRow), "class_id"));
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
