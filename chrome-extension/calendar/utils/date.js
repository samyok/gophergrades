const MONTH_NAMES = ["December", "January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"];

/**
 * Parses date string into Date object using specified format
 * @param {string} dateString
 * @param {string} format Options: "yyyymmmdd", "yyyy-mm-dd"
 * @returns {Date}
 */
const parseDate = (dateString, format) => {
  if (format == "yyyymmdd") {
    let year = dateString.slice(0, 4);
    let month = dateString.slice(4, 6);
    let day = dateString.slice(6, 8);
    return new Date(Date.UTC(year, month - 1, day));
  } else if (format == "yyyy-mm-dd") {
    let [year, month, day] = dateString.split("-");
    return new Date(Date.UTC(year, month - 1, day));
  } else if (format == "mm/dd/yyyy") {
    {
      let [month, day, year] = dateString.split("/");
      let result = new Date(Date.UTC(year, month - 1, day));
      return result;
    }
  } else if (format == "yyyymmddhhmmss") {
    let year = dateString.slice(0, 4);
    let month = dateString.slice(4, 6);
    let day = dateString.slice(6, 8);
    let hour = dateString.slice(8, 10);
    let min = dateString.slice(10, 12);
    let sec = dateString.slice(12, 14);
    return new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  } else {
    throw new Error(
      `parseDate() was passed unrecognized format string "${format}"`
    );
  }
};

/**
 * Formats Date object into date string using specified format
 * @param {Date} date
 * @param {string} format Options: "yyyymmdd", "yyyy-mm-dd", "yyyymmddhhmmss"
 * @returns {string} // yyyy-mm-dd
 *  */
const formatDate = (date, format) => {
  let year = date.getUTCFullYear(); // utc to remove annoying timezone shift
  let month = date.getUTCMonth() + 1; // why is january 0????
  let day = date.getUTCDate();
  let hours = date.getUTCHours();
  let mins = date.getUTCMinutes();
  let secs = date.getUTCSeconds();

  const pad = (input, width) => {
    return ("0".repeat(width) + input).slice(-width);
  };

  if (format == "yyyy-mm-dd") {
    return [year, pad(month, 2), pad(day, 2)].join("-");
  } else if (format == "yyyymmdd") {
    return [year, pad(month, 2), pad(day, 2)].join("");
  } else if (format == "mm/dd/yyyy") {
    return [pad(month, 2), pad(day, 2), year].join("/");
  } else if (format == "yyyymmddhhmmss") {
    return [
      year,
      pad(month, 2),
      pad(day, 2),
      pad(hours, 2),
      pad(mins, 2),
      pad(secs, 2),
    ];
  } else if (format == "Month dd, yyyy") {
    return `${MONTH_NAMES[month]} ${day}, ${year}`;
  } else {
    throw new Error(
      `formatDate() was passed unrecognized format string "${format}"`
    );
  }
};

/**
 * Returns a Date object for the Sunday in the same week as date
 * @param {Date} date
 * @returns {Date}
 */
const sundayThisWeek = (date) => {
  let result = new Date(date.getTime()); // make a copy
  result.setDate(result.getDate() - result.getUTCDay());
  return result;
};

/**
 * Util: given a string of format "Su--WThF-", returns an array of 7 booleans representing which days of the week are represented
 * @param {string} daysOfWeekString
 * @returns {Array<boolean>} Sunday is index 0, Monday 1, etc.
 */
const daysOfWeekToArray = (daysOfWeekString) => {
  let patterns = [/S([^a]||$)/, /M/, /T[^h]/, /W/, /Th/, /F/, /Sa/];
  return patterns.map((p) => !(daysOfWeekString.search(p) == -1)); // this is so fancy
};

/**
 * Util: turn array of 7 bools into string of days of week
 * @param {Array<boolean>} daysOfWeek index 0 is Sunday, index 6 is Saturday
 * @param {string} format "MO," or "Monday, " (encodes day names and delimiter)
 * @returns {string} format: "SU,TU,WE,FR,SA" for instance
 */
let formatDaysOfWeek = (daysOfWeek, format) => {
  let weekdayNames;
  let delimiter;
  if (format == "MO,") {
    weekdayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    delimiter = ",";
  } else if (format == "Monday, ") { // there's gotta be a better way than this to support different formats
    weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    delimiter = ", ";
  } else {
    throw new Error(
      `formatDaysOfWeek() was passed unrecognized format string "${format}"`
    );
  }
  let includedDays = [];
  for (d = 0; d < 7; d++) {
    if (daysOfWeek[d]) {
      includedDays.push(weekdayNames[d]);
    }
  }
  return includedDays.join(delimiter);
};
