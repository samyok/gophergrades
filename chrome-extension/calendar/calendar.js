console.log("calendar.js is loaded");

// ########################
// Begin date utility funcs
// ########################

/**
 * Parses date string into Date object using specified format
 * @param {string} dateString 
 * @param {string} format Options: "yyyymmmdd", "yyyy-mm-dd"
 * @returns {Date}
 */
const parseDate = (dateString, format) => {
  if (format == "yyyymmdd") {
    let year = dateString.slice(0, 4)
    let month = dateString.slice(4, 6)
    let day = dateString.slice(6, 8)
    return new Date(Date.UTC(year, month-1, day)) 
  } else if (format == "yyyy-mm-dd") {
    let [year, month, day] = dateString.split("-")
    return new Date(Date.UTC(year, month-1, day)) 
  } else if (format == "mm/dd/yyyy") { {
    let [month, day, year] = dateString.split("/")
    let result = new Date(Date.UTC(year, month-1, day))
    return result
  }
  } else if (format == "yyyymmddhhmmss") {
    let year = dateString.slice(0, 4)
    let month = dateString.slice(4, 6)
    let day = dateString.slice(6, 8)
    let hour = dateString.slice(8, 10)
    let min = dateString.slice(10, 12)
    let sec = dateString.slice(12, 14)
    return new Date(Date.UTC(year, month-1, day, hour, min, sec))
  } else {
    throw new Error(`parseDate() was passed unrecognized format string "${format}"`)
  }
}

/**
 * Formats Date object into date string using specified format
 * @param {Date} date
 * @param {string} format Options: "yyyymmdd", "yyyy-mm-dd", "yyyymmddhhmmss"
 * @returns {string} // yyyy-mm-dd
 *  */ 
const formatDate = (date, format) => {
  let year = date.getUTCFullYear() // utc to remove annoying timezone shift
  let month = date.getUTCMonth() + 1 // why is january 0????
  let day = date.getUTCDate()
  let hours = date.getUTCHours()
  let mins = date.getUTCMinutes()
  let secs = date.getUTCSeconds()

  const pad = (input, width) => {return ('0'.repeat(width) + input).slice(-width)}

  if (format == "yyyy-mm-dd") {
    return [year, pad(month, 2), pad(day, 2)].join("-")
  } else if (format == "yyyymmdd") {
    return [year, pad(month, 2), pad(day, 2)].join("")
  } else if (format == "mm/dd/yyyy") {
    return [pad(month, 2), pad(day, 2), year].join("/")
  } else if (format == "yyyymmddhhmmss") {
    return [year, pad(month, 2), pad(day, 2), pad(hours, 2), pad(mins, 2), pad(secs, 2)]
  } else {
    throw new Error(`formatDate() was passed unrecognized format string "${format}"`)
  }
}

/**
 * Returns a Date object for the Sunday in the same week as date
 * @param {Date} date 
 * @returns {Date}
 */
const sundayThisWeek = (date) => {
  let result = new Date(date.getTime()) // make a copy
  result.setDate(result.getDate() - result.getUTCDay())
  return result
}

/**
 * Util: given a string of format "Su--WThF-", returns an array of 7 booleans representing which days of the week are represented
 * @param {string} daysOfWeekString 
 * @returns {Array<boolean>} Sunday is index 0, Monday 1, etc.
 */
const daysOfWeekToArray = (daysOfWeekString) => {
  let patterns = [/S([^a]||$)/, /M/, /T[^h]/, /W/, /Th/, /F/, /Sa/] 
  return patterns.map(p => !(daysOfWeekString.search(p) == -1)) // this is so fancy
}

/**
 * Util: turn array of 7 bools into string of days of week
 * @param {Array<boolean>} daysOfWeek index 0 is Sunday, index 6 is Saturday
 * @returns {string} format: "SU,TU,WE,FR,SA" for instance
 */
let formatDaysOfWeek = (daysOfWeek) => {
  let weekdayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
  let includedDays = []
  for (d = 0; d < 7; d++) {
    if (daysOfWeek[d]) {
      includedDays.push(weekdayNames[d])
    }
  }
  return includedDays.join(",")
}

// ######################
// End date utility funcs
// ######################

//##########
// Begin scraper.js
//##########
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
const weekToJSON = async (dateString="today") => {
  if (dateString == "today") {
    dateString = formatDate(new Date(), "yyyy-mm-dd")
  }

  // appends the date info to our base url
  let baseURL = "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_ACAD_SCHEDULE&pslnk=1&cmd=smartnav" // the base url
  let url = baseURL.concat("&effdt=", dateString)

  // create a (queryable!) DOM element from the url
  var el = document.createElement('html'); 
  await fetch(url).then(r => r.text()).then(r => el.innerHTML = r);
    
  // parsing begins
  var synchronousMeetings = el.querySelector(".myu_calendar") // HTML div containing only the classes with set days and times
  if (synchronousMeetings == null) {
    console.log(`encountered a week without meetings (${dateString}).`)
    return {"meetingObjects" : [], "sundayDate" : sundayThisWeek(parseDate(dateString, "yyyy-mm-dd"))}
  }
  var meetingElements = synchronousMeetings.querySelectorAll(".myu_calendar-class") // list of all the classes this week as HTML elems
  const meetingObjects = []; // list of json objects holding meeting data
  for (let meetingEl of meetingElements) {
  
    if (meetingEl.classList.contains("no-class")) { // sometimes a meetingEl marks when there are no classes in a day?
      console.log("encountered a no-class meetingElement. skipping...")
      continue
    }
  
    let classDetails = meetingEl.querySelector(".myu_calendar-class-details")
                                .innerHTML
                                .replace(/\n/g,"").split("<br>") // regex is to get rid of random newlines that are in there for some reason
    let courseTitleScrape = meetingEl.querySelector(".myu_calendar-class-name").innerText

    meetingObjects.push({
      "term"        : meetingEl.getAttribute("data-strm").trim(), // {string} // in format `xyyx', where `yy` is the year and `xx` = `13` is spring, `19` is fall
      "courseNum"   : meetingEl.getAttribute("data-class-nbr").trim(), // {string}
      "date"        : parseDate(meetingEl.getAttribute("data-fulldate"), "yyyymmdd"), // {Date}
      "meetingType" : classDetails[0].trim(), // {string}
      "timeRange"   : classDetails[1].trim(), // {string}
      "room"        : classDetails[2].trim(), // {string}
      "courseName"  : meetingEl.querySelector(".myu_calendar-class-name-color-referencer").innerText.trim(), // {string}
      "institution" : meetingEl.dataset.institution, // {string}
      "prettyName"  : courseTitleScrape.match(/(?<=\d\) ).*/)[0].trim(), // {string} e.g. "Adv Programming Principles"
      "sectionID"   : courseTitleScrape.match(/(?<=\()\d+(?=\))/)[0] // {string} e.g. "001" of "CSCI 2021 (001)"
    });
  }

  weekObject = {"meetingObjects" : meetingObjects,
                "sundayDate"     : sundayThisWeek(parseDate(dateString, "yyyy-mm-dd"))}
  return weekObject;
}
  
/**
 * Scrapes general info on a class: session start, days of week, meeting times, location, etc
 * @param {string} term
 * @param {string} courseNum
 * @param {string} [institution="UMNTC"] // TODO: figure out institution codes for other campuses
 * @return {Array} generalMeetingObjectArray // these variable names could use some thought
 */
const generalClassInfo = async (term, courseNum, institution="UMNTC") => { 
  // example formatted url. note strm, institution, class_nbr
  // "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_CLASS_DETAIL&cmd=smartnav&STRM=1233&INSTITUTION=UMNTC&CLASS_NBR=59662"
  const baseURL = "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_CLASS_DETAIL&cmd=smartnav"
  let url = baseURL.concat("&STRM=", term, "&CLASS_NBR=", courseNum)
      // Special case for Rochester (needs both &INSTITUTION and &CAMPUS)
      if (institution == "UMNRO") {
        url = url.concat("&INSTITUTION=UMNTC&CAMPUS=", institution)
      } else { // General case for all other institutions
        url = url.concat("&INSTITUTION=",institution)
      }  
  // set up element to parse
  var el = document.createElement('html')
  await fetch(url).then(r => r.text()).then(r => el.innerHTML = r)

  // dateRange parsing
  let dateRangeString = el.querySelector('[data-th="Meeting Dates"]').innerText
  let dateRange = dateRangeString.split(" - ").map(function(dateString) {return parseDate(dateString, "mm/dd/yyyy") })

return ({
  "term"        : term.trim(), // {string}
  "courseNum"   : courseNum.trim(), // {string}
  "institution" : institution.trim(), // {string}
  "dateRange"   : dateRange, // {Array<Date>}
  "daysOfWeek"  : daysOfWeekToArray(el.querySelector('[data-th="Days and Times"]').innerText.slice(0,7)), // {Array<boolean>}
  "timeRange"   : el.querySelector('[data-th="Days and Times"]').innerText.slice(8).trim(), // {string} // everything after character 8 (inclusive) // format: hh:mm pm - hh:mm pm
  "room"        : el.querySelector('[data-th="Room"]').innerText.trim(), // {string}
  // "meetingType"   : // {string} populated in scraperSecondPass
  // "courseName"    : // {string} populated in scraperSecondPass
  // "excludedDates" : // {Array<Date>} populated in scraperSecondPass
  // "firstDate"     : // {Date} // populated in scraperSecondPass
  // "prettyName"   : // {string} // populated in scraperSecondPass
  // "sectionID"     : // {string} // populated in scraperSecondPass
  // "address"       : // COMING LATER // accessible only through outside site, likely will need to just make local lookup table
})
}
  
/**
 * Enhances `coursesInfo` by cross-referencing between it and `weeks`. 
 * Populates `meetingType`, `courseName` (but not `address` yet)
 * (not yet but will soon) Also adds excluded meetings (e.g. breaks) and (maybe???) additional meetings (e.g. exams). 
 * @param {Array<Array<Object>>} weeks // unmodified
 * @param {Array<Object>} coursesInfo // modifies coursesInfo in place
 */
const scraperSecondPass = (weeks, coursesInfo) => {
  // first, find the first meeting of the course. 
  // log the date of this first meeting (needed for .ics spec stuff)
  // copy over `meetingType` and `courseName`
  courseloop: for (let course of coursesInfo) { // for course in coursesInfo
    for (let week of weeks) { // for week in `weeks`
      for (let meeting of week.meetingObjects) { // for meeting in week
        if (meeting.courseNum == course.courseNum) {
          course.firstDate = meeting.date
          course.meetingType = meeting.meetingType
          course.courseName = meeting.courseName
          course.sectionID = meeting.sectionID
          course.prettyName = meeting.prettyName
          continue courseloop // hah, this is fun! 
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
    const timeRangeRepr = (timeRangeString, format) => {
      let ARBITRARY_DATE = new Date()
      if (format == "week") { // "hh:mm - hh:mm pm" (first am/pm is ommitted)
        timeRange = getTimes(timeRangeString, ARBITRARY_DATE) // long string that is dumb. we will cut it down >:)
      } else if (format == "coursesInfo") { // "hh:mm pm - hh:mm pm"
        timeRange = recurringGetTimes(timeRangeString, ARBITRARY_DATE) // long string that is dumb
      } else {
        throw new Error(`timeRangeRepr() was passed unrecognized format ${format}`)
      }
      return timeRange.map(s => s.slice(9, 13)).join("-") // crop off extraneous info
    }

    // ###################################
    // First, set up model week hash table
    // ###################################
    let modelWeekHT = {} // empty json object (hash table)
    for (day = 0; day < 7; day++) { // for day in a week
      
      // console.log(coursesInfo) // debug
      for (let course of coursesInfo) {
        course.excludedDates = [] // initialize to no excluded dates
        // console.log(course) // debug
        if (course.daysOfWeek[day]) { // if the course has a meeting on this day, add the course to today's hash table
          timeRange = timeRangeRepr(course.timeRange, "coursesInfo") // single standardized string representing the timeRange
          hash = [day, timeRange, course.courseNum].join("-")
          modelWeekHT[hash] = {"course" : course, "day" : day} // content of hash table: pointer to the course object
        }
        // hash table. hash is based on day, time range, course num. value is pointer to the course object
      }
    }
    let modelWeekKeys = Object.keys(modelWeekHT)

    let additionalMeetings = []

    // ###############################
    // Main loop through all the weeks
    // ###############################
    for (let week of weeks) {
      
    // Create a hash table for the actual week as well
    let thisWeekHT = {}
    for (let meeting of week.meetingObjects) {
      let day = meeting.date.getUTCDay()
      let timeRange = timeRangeRepr(meeting.timeRange, "week") // single standarized string representing the timeRange
      let hash = [day, timeRange, meeting.courseNum].join("-")
      thisWeekHT[hash] = meeting
    }
    let thisWeekKeys = Object.keys(thisWeekHT)

    // okay, setup's over
    // now the fun begins

    // finding excluded meetings
    // for meeting in model week, ensure that it appears in the actual week. if it doesn't, add it to the excluded meetings list
    for (let hash of modelWeekKeys) {
      if (thisWeekHT[hash] == null) {
        let dayOfWeek = modelWeekHT[hash].day
        // console.log(dayOfWeek)
        excludedDate = new Date(week.sundayDate.getTime()) // make copy of the sunday
        excludedDate.setDate(excludedDate.getDate() + dayOfWeek) // then shift the date to the correct day of week
        // console.log(excludedDate)
        
        console.log("Excluded meeting found!")
        // console.log(`hash: ${hash}, date: ${excludedDate}`)

        modelWeekHT[hash].course.excludedDates.push(excludedDate)
      }
    }

    // finding additional meetings
    // for meeting in actual week, ensure it appears in the model week. If it doesn't, add it to the additional dates
    for (let hash of thisWeekKeys) { // for meeting in week
      if (modelWeekHT[hash] == null) { // if this meeting doesn't appear in the model week
        console.log(`Additional meeting found! hash: ${hash}`)
        additionalMeeting = thisWeekHT[hash]
        console.log(`date: ${additionalMeeting.date}$`)
        additionalMeetings.push(additionalMeeting)
      }
    }
  
  }
    
    // console.log(modelWeek)
    return additionalMeetings
  }

  console.log("weeks: \n")
  console.log(weeks)
  let additionalMeetings = findExcludedAndAdditionalMeetings(weeks)
  // console.log(additionalMeetings)
  return additionalMeetings
}

  
// BEGIN ZONE OF EXTRA JANK

// Scraping up all meeting times, including catching when classes are canceled for holidays
// General game plan: 
// 1. pick a sample week (which week best to pick?), then grab all the course numbers in it
// 2. Then get the general course info for each of those course numbers, store it somewhere
// 3. Then take one of the `dateRange`s (they're all the same) and scrape through the whole thing to find instances of when a class should appear but it doesn't. store this somehow
console.log("scraper.js runs!")

/**
 * Given a date, returns info on each course meeting in the semester containing that date. Also returns generally-true info about the courses in the semester
 * @param {string} [sampleDateString="today"] // format: "yyyy-mm-dd". Note: this should be a *representative week of the semester*, not breaktime
 * @returns {Object} // has fields `.weeks` and `.coursesInfo`
 * `.weeks` is a doubly-nested array of every single class meeting in the semester
 * `.coursesInfo` is the general course info (e.g. term start and end days) for each class *found in the sample week*
 */
const scrapeASemester = async (sampleDateString="today") => {
  // NOTE: sampleWeek is just an array of meeting objects
  let sampleWeek = (await weekToJSON(sampleDateString)).meetingObjects // samples from the sample week
  let term = sampleWeek[0].term // extracts term. we'll need this later
  let institution = sampleWeek[0].institution

  let courseNums = []
  for (let i = 0; i < sampleWeek.length; i++) {
    if (!courseNums.includes(sampleWeek[i].courseNum)) {
      courseNums.push(sampleWeek[i].courseNum)
    }
  }

  // 2. 
  let coursesInfo = [] // list containing general class info for all the courses you're enrolled in
  for (let courseNum of courseNums) {
    coursesInfo.push(await generalClassInfo(term, courseNum, institution))
  }

  // 3: loop through week by week and do ...stuff
  startDate = endDate = coursesInfo[0].dateRange[0]
  endDate = coursesInfo[0].dateRange[1]
  endDate.setDate(endDate.getDate() + 7) // pad an extra week onto endDate so we can be sure we got everything

  // for loop from startDate to endDate. step size is one week
  // `date` is a date lying in the week of interest
  let weeks = []
  for (let date = new Date(startDate.getTime()); date <= endDate; date.setDate(date.getDate() + 7)) { // the reason we need to pad endDate
    let currentWeekData = await weekToJSON(formatDate(date, "yyyy-mm-dd"))
    // now um somehow check for when a class should be happening, but isn't (e.g. break/holiday)
    // ??? think about this later
    weeks.push(currentWeekData)
  }

  // soup up `coursesInfo` by pulling data out of `weeks`.
  let additionalMeetings = scraperSecondPass(weeks, coursesInfo)
  
  return ({ "weeks" : weeks,
            "coursesInfo" : coursesInfo,
            "additionalMeetings" : additionalMeetings}) // {Array<Meeting Objects>}
}
  
// ##########
// End scraper.js
// ##########

// ##########
// Begin icsFile.js
// ##########

/**
 * Downloads a file `cal.ics` filled with contents `stringData` (as plaintext) 
 * @param {string} stringData
 */
function fileDownload(stringData){
  // Create element with <a> tag
  const link = document.createElement("a");
  
  // Create a blog object with the file content which you want to add to the file
  const file = new Blob([stringData], { type: 'text/plain' });
  
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
function pad(n){
if (n<10) return "0"+n
return n
}

/**
 * Formats time as YYYYMMDDTHHMMSS
 * @param {number} hour
 * @param {number} min
 * @param {Date} date 
 * @returns {string}
 */
function formatDateWithTime(hour, min, date){ 
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(hour)}${pad(min)}00`
}

/**
 * Formats datetime as YYYYMMDDTHHMMSS
 * @param {Date} datetime
 * @returns {string}
 */
function formatDatetime(datetime) {
  return `${datetime.getUTCFullYear()}${pad(datetime.getUTCMonth()+1)}${pad(datetime.getUTCDate())}`
         + `T${pad(datetime.getUTCHours())}${pad(datetime.getUTCMinutes())}${pad(datetime.getUTCSeconds())}`
}

/**
 * Gets start and end times for event (array of formatted strings)
 * Does a little bit of inference of the am/pm status of the first event
 * @param {string} timeRange // format: "hh:mm - hh:mm pm"
 * @param {Date} date
 * @returns {Array<string>}
 */
function getTimes(timeRange, date) {
  let [t1, _, t2, end] = timeRange.split(" ")
  let [t1H,t1M] = t1.split(":")
  let [t2H,t2M] = t2.split(":")
  t1H = Number(t1H)
  t1M = Number(t1M)
  t2H = Number(t2H)
  t2M = Number(t2M)
  if (end == "PM"){
    if (t2H != 12){
      t2H += 12
    }
    if (t1H < 8){ //only AM/PM for end time is given
      t1H += 12   //guess if start should be AM or PM bases on start
    }
  }
  return [formatDateWithTime(t1H,t1M,date),formatDateWithTime(t2H,t2M,date)]
}

/**
 * Given a `classEvent` JSON object, returns a string: the lines representing the event in .ics format
 * @param {Object} classEvent // JSON object: the elements of `ScrapeASemester().weeks`
 * @return {string} 
 */
function createVEVENT(classEvent){ //create EVENT calendar lines
  let [startDate, endDate] = getTimes(classEvent.timeRange, classEvent.date)
  return `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
LOCATION:${classEvent.room}
SUMMARY:${classEvent.courseName + " " +classEvent.meetingType}
DTSTAMP:${formatDatetime(new Date())}
UID:${createUniqueId(classEvent.term, classEvent.courseNum)}
END:VEVENT
`
}

/**
 * Creates unique id for a calendar meeting (a repeating course or an additional meeting). 
 * Ultimately needed to satisfy .ics spec
 * @param {string} term 
 * @param {string} courseNum 
 */
const createUniqueId = (term, courseNum) => {
  const randomAlphanumeric = (length) => {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

  return `${term}-${courseNum}-${randomAlphanumeric(10)}@umn.lol`
}

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
  let [startDate, endDate] = recurringGetTimes(courseData.timeRange, courseData.firstDate) // date is exact first day of class 
  let accum = `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
`

  // recurrence info
  accum += `RRULE:FREQ=WEEKLY;WKST=SU;`
  let recurrenceEndDate = formatDateWithTime(23, 59, courseData.dateRange[1])
  accum += `UNTIL=${recurrenceEndDate};`
  accum += `BYDAY=${formatDaysOfWeek(courseData.daysOfWeek)}\n`

  let eventStartTime = parseTime(courseData.timeRange.split(" - ")[0])
  // Now add the excluded dates
    for (excludedDate of courseData.excludedDates) {
      accum += `EXDATE:${formatDateWithTime(eventStartTime.hour, eventStartTime.min, excludedDate)}\n`
    }

  // Now add the rest of the info
  accum += `LOCATION: ${courseData.room}
SUMMARY: ${courseData.courseName} ${courseData.meetingType}
DTSTAMP:${formatDatetime(new Date())}
UID:${createUniqueId(courseData.term, courseData.courseNum)}
END:VEVENT
`

  return accum
}

/**
 * Turns a single course into its full JSON representation
 * @param {Object} courseData
 * @returns {Object} shallow copy of courseData with extra info requested by Samyok (will write documentation soon)
 */
const courseToExportJSON = (courseData) => {
  let result = Object.assign({}, courseData) // shallow copy

  let [startDate, endDate] = recurringGetTimes(courseData.timeRange, courseData.firstDate) // date is exact first day of class
  let recurrenceEndDate = formatDateWithTime(23, 59, courseData.dateRange[1])
  let daysOfWeekString = formatDaysOfWeek(courseData.daysOfWeek)
  let eventStartTime = parseTime(courseData.timeRange.split(" - ")[0])

  result.calendarStrings = {
    "rRule"   : `FREQ=WEEKLY;WKST=SU;UNTIL=${recurrenceEndDate};BYDAY=${daysOfWeekString}`,
    "exDates" : [], // to be populated just below
    "dtStart" : startDate,
    "dtEnd"   : endDate,
    "dtStamp" : formatDatetime(new Date()),
    "uID"     : createUniqueId(courseData.term, courseData.courseNum)
  }

  for (excludedDate of courseData.excludedDates) {
    let exDateString = formatDateWithTime(eventStartTime.hour, eventStartTime.min, excludedDate)
    result.calendarStrings.exDates.push(exDateString)
  }
  
  return result
}

/**
 * Used solely for additional/outlier meetings. Converts into full JSON representation for calendar export
 * @param {Object} meeting
 * @returns {Object} 
 */
const meetingToExportJSON = (meeting) => {
  let result = Object.assign({}, meeting) // shallow copy
  
  let [startDate, endDate] = getTimes(meeting.timeRange, meeting.firstDate)
  result.calendarStrings = {
    "dtStart" : startDate,
    "dtEnd"   : endDate,
    "dtStamp" : formatDatetime(new Date()),
    "uID"     : createUniqueId(meeting.term, meeting.courseNum)
  }

  return result
}

/**
 * Parse "hh:mm pm" into a object with hours and mins
 * @param {string} timeString 
 * @returns {Object} {"hour" : number, "min" : number}
 */
const parseTime = (timeString) => { // takes format "hh:mm pm"
  let [hhmm, ampm] = timeString.split(" ")
  let [hour, min] = hhmm.split(":").map(s => Number(s)) // parse hhmm into ints
  hour = hour % 12 // have to reduce out that 12am is actually 0:00
  if (ampm == "PM") {
    hour += 12;
  }
  return {"hour": hour, "min" : min}
}

/**
 * Turns a "hh:mm pm - hh:mm pm" and Date object into an array of 2 ICS-formatted datetime strings
 * @param {string} timeRange "hh:mm pm - hh:mm pm"
 * @param {Date} day Only its date is used, not the time
 * @returns {Array<string>} contains ICS-formatted string of the time and date
 */
const recurringGetTimes = (timeRange, day) => {
  // timeRange = timeRange.replace(/^ | $/g,"") // again, we need to remove leading/trailing whitespace. ew!
  let [startStr, endStr] = timeRange.split(" - ")

  result = [startStr, endStr].map((timeString) => {
    time = parseTime(timeString)
    return formatDateWithTime(time.hour, time.min, day)
  })

  return result
}

/**
 * Turns scrapeASemester output into the text of a full .ics file
 * @param {Object} // given by scrapeASemester
 * @returns {string} full .ics file contents
 */
const dataToRecurringICS = (scrapedData) => {
  console.log("Composing ics file...")
  let outputString = `BEGIN:VCALENDAR
PRODID:-//GopherGrades//Classes//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME: Class Calendar
X-WR-TIMEZONE:America/Chicago
` // header stuff yknow
  for (courseInfo of scrapedData.coursesInfo) {
    outputString += createRecurringVEVENT(courseInfo)
  }

  // add additional dates
  for (additionalMeeting of scrapedData.additionalMeetings) {
    outputString += createVEVENT(additionalMeeting)
  }

  outputString += "END:VCALENDAR"
  // console.log(outputString)
  return outputString
}

/**
 * Turns scrapeASemester output into a big JSON object containing all the data for easy future use
 * @param {Object} scrapedData // given by scrapeASemester
 * @returns {Object} fullCalendarData
 */
const dataToExportJSON = (scrapedData) => {
  let result = {"courses" : [], "additionalMeetings": []}
  for (courseInfo of scrapedData.coursesInfo) {
    result.courses.push(courseToExportJSON(courseInfo))
  }
  for (meeting of scrapedData.additionalMeetings) {
    result.additionalMeetings.push(meetingToExportJSON(meeting))
  }
  return result;
}

/**
 * Given the output of `ScrapeASemester`, returns the semester's full .ics calendar file as a string
 * @param {Object} scrapedData // JSON object: what is directly returned by `ScrapeASemester()`
 * @return {string} // The full .ics file text
 */
function createData(scrapedData){ //creates ics file string
console.log("Started createData")
let ouputString = `BEGIN:VCALENDAR
PRODID:-//GopherGrades//Classes//EN
VERSION:1.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME: Class Calendar
X-WR-TIMEZONE:America/Chicago
`
for (week of scrapedData.weeks){
  for (classEvent of week.meetingObjects){
    ouputString += createVEVENT(classEvent)
  }
}
ouputString += `END:VCALENDAR`  
console.log(ouputString)
return ouputString
}

/**
 * Given the ouptut of `ScrapeASemester`
 */

//button should run this command: fileDownload(createData(await scrapeASemester()))

// ##########
// End icsFile.js
// ##########


const buttonTemplate = 
`<div id="gcal_btn_group">
<button id = "gg_button">  </button>
<button id = "gcal_button">Export to Google Calender</button>
<button id = "ics_button">.ics</button>
</div>` ;

/**
 * Turns template string into an actual html element
 * @param {string} html
 * @returns {HTMLElement}
 */ 
const htmlToElement = (html) => {
    const template = document.createElement("template");
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
};

//True if the myu button is already added
let ButtonIsAdded = false;

/**
 * Appends a new button on the MyU academics tab. 
 */
const appendButton = () => {
  const newDiv = htmlToElement(buttonTemplate); //This is a new element node
      
  //A div that holds calendarDiv inside of it
  const parentDiv = document.getElementsByClassName("row")[4];
    
    //This is the div that contains buttons "View Calendar" "List View" and "Textbooks (UMTC)"
    const calendarDiv = document.getElementsByClassName("myu_btn-group col-lg-12")[0];
    
    if(calendarDiv != null) {
        
        parentDiv.insertBefore(newDiv, calendarDiv.nextSibling);

        //Apply following 
      newDiv.querySelectorAll("button")[0].addEventListener("click", buttonBody); //Naively apply the event listener to all buttons
      newDiv.querySelectorAll("button")[1].addEventListener("click", buttonBody);
      newDiv.querySelectorAll("button")[2].addEventListener("click", buttonBody);
      // newDiv.querySelectorAll("button").map(b => b.addEventListener("click", buttonBody)) // apply it to all the buttons in the div
      ButtonIsAdded= true; 
  }
}

/**
 * Function that runs on button press
 */
const buttonBody = async () => {
  // console.log("Beginning scrape and download..")
  // fileDownload(createData(await scrapeASemester()))

  console.log("Beginning scrape and download..")
  let scrape = await scrapeASemester()
  fileDownload(dataToRecurringICS(scrape))
  console.log(dataToExportJSON(scrape))
  
  // scrape = await scrapeASemester(formatDate(new Date(), "yyyy-mm-dd"))
  // console.log(scrape.coursesInfo)
  // console.log(scrape.weeks)
  // console.log(scrape)
  // c = scrape.coursesInfo[0]
  // console.log(createRecurringVEVENT(c, []))
}

const appObserver = new MutationObserver((mutations) => {
  const look = document.querySelector("div[class='myu_btn-group col-lg-12']")
  if (look) {
    if (look.parentNode.children.length < 4) {
      appendButton()
    }
  }
});

appObserver.observe(document.body, {childList: true, subtree: true});