/**
 * Some utilityish functions to scrape course data
 * The two functions work, but this alone is not yet very useful
 * Also the functions are still missing some features, (see commented-out lines in JSON objects)
 */

/**
 * Scrapes a list of json objects containing all the meetings in a given week
 * Json includes course name, number, date (a single date!), time, room, etc.
 * @param {string} [dateString="today"] // a day during the week in question (Let's say the Sunday.), in format "yyyy-mm-dd", WITH DASHES. "today" gives the current week
 * @returns {Object} weekObject
 */
const weekToJSON = async (dateString = "today") => {
  if (dateString == "today") {
    dateString = formatDate(new Date(), "yyyy-mm-dd");
  }

  // appends the date info to our base url
  let baseURL =
    "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_ACAD_SCHEDULE&pslnk=1&cmd=smartnav"; // the base url
  let url = baseURL.concat("&effdt=", dateString);

  // create a (queryable!) DOM element from the url
  var el = document.createElement("html");
  await fetch(url)
    .then((r) => r.text())
    .then((r) => (el.innerHTML = r));

  // parsing begins
  var synchronousMeetings = el.querySelector(".myu_calendar"); // HTML div containing only the classes with set days and times
  if (synchronousMeetings == null) {
    console.log(`[GG] encountered a week without meetings (${dateString}).`);
    return {
      meetingObjects: [],
      sundayDate: sundayThisWeek(parseDate(dateString, "yyyy-mm-dd")),
    };
  }
  var meetingElements = synchronousMeetings.querySelectorAll(
    ".myu_calendar-class"
  ); // list of all the classes this week as HTML elems
  const meetingObjects = []; // list of json objects holding meeting data
  for (let meetingEl of meetingElements) {
    if (meetingEl.classList.contains("no-class")) {
      // sometimes a meetingEl marks when there are no classes in a day?
      console.log("[GG] encountered a no-class meetingElement. skipping...");
      continue;
    }

    let classDetails = meetingEl
      .querySelector(".myu_calendar-class-details")
      .innerHTML.replace(/\n/g, "") // get rid of random newlines that are in there for some reason
      .replace(/<br>/g, "\n");
    let courseTitleScrape = meetingEl.querySelector(
      ".myu_calendar-class-name"
    ).innerText;

    meetingObjects.push({
      term: meetingEl.getAttribute("data-strm").trim(), // {string} // in format `xyyx', where `yy` is the year and `xx` = `13` is spring, `19` is fall
      courseNum: meetingEl.getAttribute("data-class-nbr").trim(), // {string}
      date: parseDate(meetingEl.getAttribute("data-fulldate"), "yyyymmdd"), // {Date}
      meetingType: classDetails.match(/^(Lecture)|(Discussion)|(Laboratory)$/m)[0], // {string} // may need updating if list is not exhaustive
      timeRange: classDetails.match(/.*:.*/m)[0], // {string}
      room: classDetails.match(/^ .* $/m)[0].trim(), // {string} // (room has leading and trailing space)
      courseName: meetingEl
        .querySelector(".myu_calendar-class-name-color-referencer")
        .innerText.trim(), // {string}
      institution: meetingEl.dataset.institution, // {string}
      prettyName: courseTitleScrape.match(/(?<=\d\) ).*/)[0].trim(), // {string} e.g. "Adv Programming Principles"
      sectionID: courseTitleScrape.match(/(?<=\()\d+(?=\))/)[0], // {string} e.g. "001" of "CSCI 2021 (001)"
    }); // {MeetingObject} spec
  }

  weekObject = {
    meetingObjects: meetingObjects,
    sundayDate: sundayThisWeek(parseDate(dateString, "yyyy-mm-dd")),
  }; // {WeekObject} spec
  return weekObject;
};

/**
 * Scrapes general info on a class: session start, days of week, meeting times, location, etc
 * @param {string} term
 * @param {string} courseNum
 * @param {string} [institution="UMNTC"] // TODO: figure out institution codes for other campuses
 * @return {Array} generalMeetingObjectArray // these variable names could use some thought
 */
const generalClassInfo = async (term, courseNum, institution = "UMNTC") => {
  // example formatted url. note strm, institution, class_nbr
  // "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_CLASS_DETAIL&cmd=smartnav&STRM=1233&INSTITUTION=UMNTC&CLASS_NBR=59662"
  const baseURL =
    "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_CLASS_DETAIL&cmd=smartnav";
  let url = baseURL.concat("&STRM=", term, "&CLASS_NBR=", courseNum);
  // Special case for Rochester (needs both &INSTITUTION and &CAMPUS)
  if (institution == "UMNRO") {
    url = url.concat("&INSTITUTION=UMNTC&CAMPUS=", institution);
  } else {
    // General case for all other institutions
    url = url.concat("&INSTITUTION=", institution);
  }
  // set up element to parse
  var el = document.createElement("html");
  await fetch(url)
    .then((r) => r.text())
    .then((r) => (el.innerHTML = r));

  synchronousRows = [];
  let table = el.querySelector("table.myu_panel-table.table.responsive").querySelector("tbody").querySelectorAll("tr");
  for (let row of table) {
    if (row.querySelector("[data-th='Days and Times']").innerText == "------- -") { // !(no meetings, no time range)
      console.log("[GG] found asynchronous meeting in `generalClassInfo`, ignoring...");
      continue;
    }
    
    // dateRange parsing
    let dateRangeString = row.querySelector('[data-th="Meeting Dates"]').innerText;
    let dateRange = dateRangeString.split(" - ").map(function (dateString) {
      return parseDate(dateString, "mm/dd/yyyy");
    });

    const courseObject = {
      term: term.trim(), // {string}
      courseNum: courseNum.trim(), // {string}
      institution: institution.trim(), // {string}
      dateRange: dateRange, // {Array<Date>}
      daysOfWeek: daysOfWeekToArray(
        row.querySelector('[data-th="Days and Times"]').innerText.slice(0, 7)
      ), // {Array<boolean>}
      timeRange: row
        .querySelector('[data-th="Days and Times"]')
        .innerText.slice(8)
        .trim(), // {string} // everything after character 8 (inclusive) // format: hh:mm pm - hh:mm pm
      room: row.querySelector('[data-th="Room"]').innerText.trim(), // {string}
      // "meetingType"   : // {string} populated in scraperSecondPass
      // "courseName"    : // {string} populated in scraperSecondPass
      // "excludedDates" : // {Array<Date>} populated in scraperSecondPass
      // "firstDate"     : // {Date} // populated in scraperSecondPass
      // "prettyName"   : // {string} // populated in scraperSecondPass
      // "sectionID"     : // {string} // populated in scraperSecondPass
      // "address"       : // COMING LATER // accessible only through outside site, likely will need to just make local lookup table
    }; // {CourseObject} spec
    synchronousRows.push(courseObject);
  }

  if (synchronousRows.length != 1) {
    console.log(`[GG] Note: ${synchronousRows.length} synchronous meeting found in generalClassInfo() for url ${url}`);
  } // if this runs, that means we have a big headache and rewrite ahead of us. pls no
  // oh wait, I just did the rewrite and everything's good now, yay :D

  return synchronousRows;
};

/**
 * Enhances `coursesInfo` by cross-referencing between it and `weeks`.
 * Populates `meetingType`, `courseName` (but not `address` yet)
 * Also adds excluded meetings (e.g. breaks) and additional meetings (e.g. exams).
 * @param {Array<Array<Object>>} weeks // unmodified
 * @param {Array<Object>} coursesInfo // modifies coursesInfo in place.
 * @returns {Array<Object>} list of additional meetings
 */
const scraperSecondPass = (weeks, coursesInfo) => {
  const timeRangeRepr = (timeRangeString, format) => {
    let ARBITRARY_DATE = new Date();
    if (format == "week") {
      // "hh:mm - hh:mm pm" (first am/pm is ommitted)
      timeRange = getTimes(timeRangeString, ARBITRARY_DATE); // long string that is dumb. we will cut it down >:)
    } else if (format == "coursesInfo") {
      // "hh:mm pm - hh:mm pm"
      timeRange = recurringGetTimes(timeRangeString, ARBITRARY_DATE); // long string that is dumb
    } else {
      throw new Error(
        `timeRangeRepr() was passed unrecognized format ${format}`
      );
    }
    return timeRange.map((s) => s.slice(9, 13)).join("-"); // crop off extraneous info
  };

  // first, find the first meeting of the course.
  // log the date of this first meeting (needed for .ics spec stuff)
  // copy over `meetingType` and `courseName`
  courseloop: for (let course of coursesInfo) {
    for (let week of weeks) {
      for (let meeting of week.meetingObjects) {
        if (meeting.courseNum == course.courseNum // match courses to first meeting based on room, time range, date range
            && meeting.room == course.room 
            && timeRangeRepr(meeting.timeRange, "week") == timeRangeRepr(course.timeRange, "coursesInfo")
            && new Date(course.dateRange[0]) <= meeting.date
            && meeting.date <= new Date(course.dateRange[1])) {
          course.firstDate = meeting.date;
          course.meetingType = meeting.meetingType;
          course.courseName = meeting.courseName;
          course.sectionID = meeting.sectionID;
          course.prettyName = meeting.prettyName;
          continue courseloop; // hah, this is fun!
        }
      }
    }
  }

  /**
   * Excluded meetings are stored in their respective `coursesInfo` entry; additional meetings are returned
   * @param {Array<Object>} weeks
   * @returns {Array<Object>} list of additional meetings. the excluded meetings are stored directly inside of the `coursesInfo` object
   */
  const findExcludedAndAdditionalMeetings = (weeks) => {
    /**
     * Util: creates short string repr for a time range. Used as part of hash table key below
     * @param {string} timeRangeString
     * @param {string} format "week" for "hh:mm - hh:mm pm" format, "coursesInfo" for "hh:mm pm - hh:mm pm" format
     * @returns {string} "hhmm-hhmm" (start time, then end time)
     */

    // ###################################
    // First, set up model week hash table
    // ###################################
    const hashMeeting = (day, timeRange, courseNum, room) => { // perhaps have hash also include room name?
      return [day, timeRange, courseNum, room].join("-");
    }
    let modelWeekHT = {}; // maps hash: str |-> {course: CourseObject, day: int}
    for (day = 0; day < 7; day++) {
      // console.log(coursesInfo) // debug
      for (let course of coursesInfo) {
        course.excludedDates = []; // initialize to no excluded dates
        // console.log(course) // debug
        if (course.daysOfWeek[day]) {
          // if the course has a meeting on this day, add the course to today's hash table
          timeRange = timeRangeRepr(course.timeRange, "coursesInfo"); // single standardized string representing the timeRange
          hash = hashMeeting(day, timeRange, course.courseNum, course.room);
          modelWeekHT[hash] = { course: course, day: day }; // content of hash table: pointer to the course object
        }
        // hash table. hash is based on day, time range, course num. value is pointer to the course object
      }
    }

    let additionalMeetings = [];

    // ###############################
    // Main loop through all the weeks
    // ###############################
    for (let week of weeks) {
      // Create a hash table for the actual week as well
      let thisWeekHT = {}; // maps hash: str |-> MeetingObject
      for (let meeting of week.meetingObjects) {
        let day = meeting.date.getUTCDay();
        let timeRange = timeRangeRepr(meeting.timeRange, "week"); // single standarized string representing the timeRange
        let hash = hashMeeting(day, timeRange, meeting.courseNum, meeting.room);
        thisWeekHT[hash] = meeting;
      }

      // okay, setup's over
      // now the fun begins

      // finding excluded meetings
      // for meeting in model week, ensure that it appears in the actual week. if it doesn't, add it to the excluded meetings list
      // console.log(modelWeekHT)
      // console.log(thisWeekHT)
      for (let hash of Object.keys(modelWeekHT)) {
        const course = modelWeekHT[hash].course;
        if (thisWeekHT[hash] == null) {
          let dayOfWeek = modelWeekHT[hash].day;
          // console.log(dayOfWeek)
          excludedDate = new Date(week.sundayDate.getTime()); // make copy of the sunday
          excludedDate.setDate(excludedDate.getDate() + dayOfWeek); // then shift the date to the correct day of week
          // console.log(excludedDate)

          // console.log(`[GG] found possible excluded meeting! hash: ${hash}`)
          // console.log(`[GG] date ${excludedDate}`)
          // console.log(`[GG] course date range: ${course.dateRange}`)
          if (new Date(course.dateRange[0]) <= excludedDate // don't add an excluded date if the meeting's already out of recurrence range
              && excludedDate <= new Date(course.dateRange[1])) {
            console.log(`[GG] Excluded meeting found! hash: ${hash}`);
            console.log(`[GG] date: ${excludedDate}`)
            course.excludedDates.push(excludedDate);
          }
        }
      }

      // finding additional meetings
      // for meeting in actual week, ensure it appears in the model week. If it doesn't, add it to the additional dates
      for (let hash of Object.keys(thisWeekHT)) {
        const meeting = thisWeekHT[hash];
        // for meeting in week
        if (modelWeekHT[hash] == null // if meeting doesn't appear in the model week
            || !(new Date(modelWeekHT[hash].course.dateRange[0]) <= meeting.date 
                 && meeting.date <= new Date(modelWeekHT[hash].course.dateRange[1])) // or if the meeting *is* in the model week, but this is outside of its recurrence range
        ) {
          console.log(`[GG] Additional meeting found! hash: ${hash}`);
          additionalMeeting = meeting;
          console.log(`[GG] date: ${additionalMeeting.date}$`);
          additionalMeetings.push(additionalMeeting);
        }
      }
    }

    // console.log(modelWeek)
    return additionalMeetings;
  };

  console.log("[GG] weeks: \n");
  console.log(weeks);
  let additionalMeetings = findExcludedAndAdditionalMeetings(weeks);
  // console.log(additionalMeetings)
  return additionalMeetings;
};

// BEGIN ZONE OF EXTRA JANK

// Scraping up all meeting times, including catching when classes are canceled for holidays
// General game plan:
// 1. pick a sample week (which week best to pick?), then grab all the course numbers in it
// 2. Then get the general course info for each of those course numbers, store it somewhere
// 3. Then take one of the `dateRange`s (they're all the same) and scrape through the whole thing to find instances of when a class should appear but it doesn't. store this somehow
console.log("[GG] scraper.js runs!");

/**
 * Given a date, returns info on each course meeting in the semester containing that date. Also returns generally-true info about the courses in the semester
 * @param {string} [sampleDateString="today"] // format: "yyyy-mm-dd". Note: this should be a *representative week of the semester*, not breaktime
 * @returns {Object} {weeks {List<WeekObject>}, coursesInfo {List<CourseObject>}, additionalMeetings {List<MeetingObject>}}// has fields `.weeks` and `.coursesInfo`
 * `.weeks` is a doubly-nested array of every single class meeting in the semester
 * `.coursesInfo` is the general course info (e.g. term start and end days) for each class *found in the sample week*
 */
const scrapeASemester = async (sampleDateString = "today") => {
  // NOTE: sampleWeek is just an array of meeting objects
  let sampleWeek = (await weekToJSON(sampleDateString)).meetingObjects; // samples from the sample week
  let term = sampleWeek[0].term; // extracts term. we'll need this later
  let institution = sampleWeek[0].institution;

  let courseNums = [];
  for (let meeting of sampleWeek) {
    if (!courseNums.includes(meeting.courseNum)) {
      courseNums.push(meeting.courseNum);
    }
  }

  // 2.
  let coursesInfoPromises = []; // list containing general class info for all the courses you're enrolled in
  for (let courseNum of courseNums) {
    coursesInfoPromises.push(generalClassInfo(term, courseNum, institution));
  }
  let coursesInfo = (await Promise.all(coursesInfoPromises)).flat(); // concurrency, yo!

  // 3: loop through week by week and do ...stuff
  startDate = coursesInfo[0].dateRange[0]; // assumption: coursesInfo[0] has the widest date range (this is not necessarily true)
  endDate = coursesInfo[0].dateRange[1];
  endDate.setDate(endDate.getDate() + 7); // pad an extra week onto endDate so we can be sure we got everything

  // for loop from startDate to endDate. step size is one week
  // `date` is a date lying in the week of interest
  let weeksPromises = [];
  for (
    let date = new Date(startDate.getTime());
    date <= endDate;
    date.setDate(date.getDate() + 7)
  ) {
    let currentWeekData = weekToJSON(formatDate(date, "yyyy-mm-dd"));
    weeksPromises.push(currentWeekData);
  }
  let weeks = await Promise.all(weeksPromises); // concurrency, yo!

  // soup up `coursesInfo` by pulling data out of `weeks`.
  let additionalMeetings = scraperSecondPass(weeks, coursesInfo);

  return {
    weeks: weeks,
    coursesInfo: coursesInfo,
    additionalMeetings: additionalMeetings,
  }; // {Array<MeetingObject>}
};