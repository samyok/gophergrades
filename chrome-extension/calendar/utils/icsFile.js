/**
 * Downloads a file `cal.ics` filled with contents `stringData` (as plaintext)
 * @param {string} stringData
 */
function fileDownload(stringData) {
  // Create element with <a> tag
  const link = document.createElement("a");

  // Create a blog object with the file content which you want to add to the file
  const file = new Blob([stringData], { type: "text/plain" });

  // Add file content in the object URL
  link.href = URL.createObjectURL(file);

  // Add file name
  link.download = "cal.ics";

  // Add click event to <a> tag to save file.
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Ensures numbers are 2 digits long
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  if (n < 10) return "0" + n;
  return n;
}

/**
 * Formats time as YYYYMMDDTHHMMSS
 * @param {number} hour
 * @param {number} min
 * @param {Date} date
 * @returns {string}
 */
function formatDateWithTime(hour, min, date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate()
  )}T${pad(hour)}${pad(min)}00`;
}

/**
 * Formats datetime as YYYYMMDDTHHMMSS
 * @param {Date} datetime
 * @returns {string}
 */
function formatDatetime(datetime) {
  return (
    `${datetime.getUTCFullYear()}${pad(datetime.getUTCMonth() + 1)}${pad(
      datetime.getUTCDate()
    )}` +
    `T${pad(datetime.getUTCHours())}${pad(datetime.getUTCMinutes())}${pad(
      datetime.getUTCSeconds()
    )}`
  );
}

/**
 * Gets start and end times for event (array of formatted strings)
 * Does a little bit of inference of the am/pm status of the first event
 * @param {string} timeRange // format: "hh:mm - hh:mm pm"
 * @param {Date} date
 * @returns {Array<string>}
 */
function getTimes(timeRange, date) {
  let [t1, _, t2, end] = timeRange.split(" ");
  let [t1H, t1M] = t1.split(":");
  let [t2H, t2M] = t2.split(":");
  t1H = Number(t1H);
  t1M = Number(t1M);
  t2H = Number(t2H);
  t2M = Number(t2M);
  if (end == "PM") {
    if (t2H != 12) {
      t2H += 12;
    }
    if (t1H < 8) {
      //only AM/PM for end time is given
      t1H += 12; //guess if start should be AM or PM bases on start
    }
  }
  return [
    formatDateWithTime(t1H, t1M, date),
    formatDateWithTime(t2H, t2M, date),
  ];
}

/**
 * Given a `classEvent` JSON object, returns a string: the lines representing the event in .ics format
 * @param {Object} classEvent // JSON object: the elements of `ScrapeASemester().weeks`
 * @return {string}
 */
function createVEVENT(classEvent) {
  //create EVENT calendar lines
  let [startDate, endDate] = getTimes(classEvent.timeRange, classEvent.date);
  return `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
LOCATION:${classEvent.room}
SUMMARY:${classEvent.courseName + " " + classEvent.meetingType}
DTSTAMP:${formatDatetime(new Date())}
UID:${createUniqueId(classEvent.term, classEvent.courseNum)}
END:VEVENT
`;
}

/**
 * Creates unique id for a calendar meeting (a repeating course or an additional meeting).
 * Ultimately needed to satisfy .ics spec
 * @param {string} term
 * @param {string} courseNum
 */
const createUniqueId = (term, courseNum) => {
  const randomAlphanumeric = (length) => {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  };

  return `${term}-${courseNum}-${randomAlphanumeric(10)}@umn.lol`;
};

/**
 * Create a recurring event
 * @param {Object} courseData
 * @return {string} // .ics lines for this recurring event
 */
const createRecurringVEVENT = (courseData) => {
  // let [startDate, endDate] = getTimes(courseData.timeRange)
  // console.log(courseData)
  // console.log(courseData.timeRange)
  // console.log(recurringGetTimes(courseData.timeRange, courseData.dateRange[0]))
  let [startDate, endDate] = recurringGetTimes(
    courseData.timeRange,
    courseData.firstDate
  ); // date is exact first day of class
  let accum = `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
`;

  // recurrence info
  accum += `RRULE:FREQ=WEEKLY;WKST=SU;`;
  let recurrenceEndDate = formatDateWithTime(23, 59, courseData.dateRange[1]);
  accum += `UNTIL=${recurrenceEndDate};`;
  accum += `BYDAY=${formatDaysOfWeek(courseData.daysOfWeek, "MO,")}\n`;

  let eventStartTime = parseTime(courseData.timeRange.split(" - ")[0]);
  // Now add the excluded dates
  for (excludedDate of courseData.excludedDates) {
    accum += `EXDATE:${formatDateWithTime(
      eventStartTime.hour,
      eventStartTime.min,
      excludedDate
    )}\n`;
  }

  // Now add the rest of the info
  accum += `LOCATION: ${courseData.room}
SUMMARY: ${courseData.courseName} ${courseData.meetingType}
DTSTAMP:${formatDatetime(new Date())}
UID:${createUniqueId(courseData.term, courseData.courseNum)}
END:VEVENT
`;

  return accum;
};

/**
 * Turns a single course into its full JSON representation
 * @param {Object} courseData
 * @returns {Object} shallow copy of courseData with extra info requested by Samyok (will write documentation soon)
 */
const courseToExportJSON = (courseData) => {
  let result = Object.assign({}, courseData); // shallow copy

  let [startDate, endDate] = recurringGetTimes(
    courseData.timeRange,
    courseData.firstDate
  ); // date is exact first day of class
  let recurrenceEndDate = formatDateWithTime(23, 59, courseData.dateRange[1]);
  let daysOfWeekString = formatDaysOfWeek(courseData.daysOfWeek, "MO,");
  let eventStartTime = parseTime(courseData.timeRange.split(" - ")[0]);

  result.calendarStrings = {
    rRule: `FREQ=WEEKLY;WKST=SU;UNTIL=${recurrenceEndDate};BYDAY=${daysOfWeekString}`,
    exDates: [], // to be populated just below
    dtStart: startDate,
    dtEnd: endDate,
    dtStamp: formatDatetime(new Date()),
    uID: createUniqueId(courseData.term, courseData.courseNum),
  };

  for (excludedDate of courseData.excludedDates) {
    let exDateString = formatDateWithTime(
      eventStartTime.hour,
      eventStartTime.min,
      excludedDate
    );
    result.calendarStrings.exDates.push(exDateString);
  }

  return result;
};

/**
 * Used solely for additional/outlier meetings. Converts into full JSON representation for calendar export
 * @param {Object} meeting
 * @returns {Object}
 */
const meetingToExportJSON = (meeting) => {
  let result = Object.assign({}, meeting); // shallow copy

  let [startDate, endDate] = getTimes(meeting.timeRange, meeting.date);
  result.calendarStrings = {
    dtStart: startDate,
    dtEnd: endDate,
    dtStamp: formatDatetime(new Date()),
    uID: createUniqueId(meeting.term, meeting.courseNum),
  };

  return result;
};

/**
 * Parse "hh:mm pm" into a object with hours and mins
 * @param {string} timeString
 * @returns {Object} {"hour" : number, "min" : number}
 */
const parseTime = (timeString) => {
  // takes format "hh:mm pm"
  let [hhmm, ampm] = timeString.split(" ");
  let [hour, min] = hhmm.split(":").map((s) => Number(s)); // parse hhmm into ints
  hour = hour % 12; // have to reduce out that 12am is actually 0:00
  if (ampm == "PM") {
    hour += 12;
  }
  return { hour: hour, min: min };
};

/**
 * Turns a "hh:mm pm - hh:mm pm" and Date object into an array of 2 ICS-formatted datetime strings
 * @param {string} timeRange "hh:mm pm - hh:mm pm"
 * @param {Date} day Only its date is used, not the time
 * @returns {Array<string>} contains ICS-formatted string of the time and date
 */
const recurringGetTimes = (timeRange, day) => {
  // timeRange = timeRange.replace(/^ | $/g,"") // again, we need to remove leading/trailing whitespace. ew!
  let [startStr, endStr] = timeRange.split(" - ");

  result = [startStr, endStr].map((timeString) => {
    time = parseTime(timeString);
    return formatDateWithTime(time.hour, time.min, day);
  });

  return result;
};

/**
 * Turns scrapeASemester output into the text of a full .ics file
 * @param {Object} // given by scrapeASemester
 * @returns {string} full .ics file contents
 */
const dataToRecurringICS = (scrapedData) => {
  console.log("Composing ics file...");
  let outputString = `BEGIN:VCALENDAR
PRODID:-//GopherGrades//Classes//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME: Class Calendar
X-WR-TIMEZONE:America/Chicago
`; // header stuff yknow
  for (courseInfo of scrapedData.coursesInfo) {
    outputString += createRecurringVEVENT(courseInfo);
  }

  // add additional dates
  for (additionalMeeting of scrapedData.additionalMeetings) {
    outputString += createVEVENT(additionalMeeting);
  }

  outputString += "END:VCALENDAR";
  // console.log(outputString)
  return outputString;
};

/**
 * Turns scrapeASemester output into a big JSON object containing all the data for easy future use
 * @param {Object} scrapedData // given by scrapeASemester
 * @returns {Object} fullCalendarData
 */
const dataToExportJSON = (scrapedData) => {
  let result = { courses: [], additionalMeetings: [] };
  for (courseInfo of scrapedData.coursesInfo) {
    result.courses.push(courseToExportJSON(courseInfo));
  }
  for (meeting of scrapedData.additionalMeetings) {
    result.additionalMeetings.push(meetingToExportJSON(meeting));
  }
  return result;
};

/**
 * Given the output of `ScrapeASemester`, returns the semester's full .ics calendar file as a string
 * @param {Object} scrapedData // JSON object: what is directly returned by `ScrapeASemester()`
 * @return {string} // The full .ics file text
 */
function createData(scrapedData) {
  //creates ics file string
  console.log("Started createData");
  let ouputString = `BEGIN:VCALENDAR
PRODID:-//GopherGrades//Classes//EN
VERSION:1.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME: Class Calendar
X-WR-TIMEZONE:America/Chicago
`;
  for (week of scrapedData.weeks) {
    for (classEvent of week.meetingObjects) {
      ouputString += createVEVENT(classEvent);
    }
  }
  ouputString += `END:VCALENDAR`;
  console.log(ouputString);
  return ouputString;
}

/**
 * Given the ouptut of `ScrapeASemester`
 */

//button should run this command: fileDownload(createData(await scrapeASemester()))
