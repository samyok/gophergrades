console.log("calendar.js is loaded");

//##########
// Begin scraper.js
//##########
/**
 * Some utilityish functions to scrape course data
 * The two functions work, but this alone is not yet very useful
 * Also the functions are still missing some features, (see commented-out lines in JSON objects)
 */


/**
 * Given a Date object, formats it to "yyyy-mm-dd" 
 * @param {Date} [date]
 * @returns {string} // yyyy-mm-dd
 *  */ 
const formatDateForURL = (date) => {
  let year = date.getUTCFullYear() // utc to remove annoying timezone shift
  let month = date.getUTCMonth() + 1 // why is january 0????
  let day = date.getUTCDate()
  return [year, ('0' + month).slice(-2), ('0' + day).slice(-2)].join("-")
}
  
  /**
   * Scrapes a list of json objects containing all the meetings in a given week
   * Json includes course name, number, date (a single date!), time, room, etc. 
   * @param {string} [dateString="unset"] // a day during the week in question (Let's say the Sunday.), in format "yyyy-mm-dd", WITH DASHES. "unset" gives the current week
   * @returns {Array<Object>} meetingObjectArray
   */
  const weekToJson = async (dateString="unset") => {
  // utility func to parse yyyymmdd into Date object
  let parseDate = (dateString) => {
    let year = dateString.slice(0, 4)
    let month = dateString.slice(4, 6)
    let day = dateString.slice(6, 8)
    return new Date(Date.UTC(year, month-1, day)) // month-1 ew
  }
  let parseDateWithDashes = (dateString) => {
    let year = dateString.slice(0, 4)
    let month = dateString.slice(5, 7)
    let day = dateString.slice(8, 10)
    return new Date(Date.UTC(year, month-1, day)) // month-1 ew
  }

    // appends the date info to our base url
    let url = "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_ACAD_SCHEDULE&pslnk=1&cmd=smartnav" // the base url
    if (dateString != "unset") {
      url = url.concat("&effdt=", dateString)
    }
    // create a (queryable!) DOM element from the url
    let HTMLText;
    var el = document.createElement('html'); 
    await fetch(url).then(r => r.text()).then(r => HTMLText = r);
    el.innerHTML = HTMLText;
    
    var setDaysTimes = el.querySelector(".myu_calendar") // HTML div containing only the classes with set days and times
    var meetingElements = setDaysTimes.querySelectorAll(".myu_calendar-class") // list of all the classes this week as HTML elems
    const meetingObjects = []; // list of json objects holding meeting data
    for (let meetingEl of meetingElements) {
  
      // sometimes a meetingEl marks when there are no classes in a day?
      if (meetingEl.classList.contains("no-class")) {
        console.log("encountered a no-class meetingElement. skipping...")
        continue
      }
  
      let classDetails = meetingEl.querySelector(".myu_calendar-class-details").innerHTML
                          .replace(/\n/g,"").split("<br>") // regex is to get rid of random newlines that are in there for some reason
      meetingObjects.push({
        "term"        : meetingEl.getAttribute("data-strm"), // in format `xyyx', where `yy` is the year and `xx` = `13` is spring, `19` is fall
        "courseNum"   : meetingEl.getAttribute("data-class-nbr"),
        "date"        : parseDate(meetingEl.getAttribute("data-fulldate")),
        "meetingType" : classDetails[0],
        "timeRange"   : classDetails[1],
        "room"        : classDetails[2].replace(/^ | $/g,""), // strip off the leading and trailing space with regex
        "courseName"  : meetingEl.querySelector(".myu_calendar-class-name-color-referencer").innerText,
      });
      // console.log([semester, date, timeRange, courseName, meetingType, room].join(","))
    }
    // console.log(meetingObjects);

  let sundayDate = null // TODO: fix the problems this will cause
  // console.log(`datestring: ${dateString}`)
  if (dateString != "unset") {
    sundayDate = sundayThisWeek(parseDateWithDashes(dateString))
  }
  // console.log(sundayDate)

  weekObject = {"meetingObjects" : meetingObjects,
                "sundayDate"     : sundayDate}
  return weekObject;
}

/**
 * Returns a Date object for the Sunday in the same week as date
 * @param {Date} date 
 * @returns 
 */
const sundayThisWeek = (date) => {
  let result = new Date(date.getTime()) // make a copy
  result.setDate(result.getDate() - result.getUTCDay())
  return result
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
      // var url = "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_CLASS_DETAIL&cmd=smartnav&STRM=1233&INSTITUTION=UMNTC&CLASS_NBR=59662"
      const baseURL = "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_CLASS_DETAIL&cmd=smartnav"
      let url = baseURL.concat("&STRM=", term, "&CLASS_NBR=", courseNum, "&INSTITUTION=", institution)
  
      // set up element to parse
      var el = document.createElement('html')
      await fetch(url).then(r => r.text()).then(r => el.innerHTML = r)
  
      // dateRange parsing
      let dateRangeString = el.querySelector('[data-th="Meeting Dates"]').innerText
      let dateRange = dateRangeString.split(" - ").map(dateString => {
        let splitDate = dateString.split("/")
        let year = splitDate[2]
        let month = splitDate[0]
        let day = splitDate[1]
        return new Date(Date.UTC(year, month-1, day))
      }
      )
  
    /**
     * Given a string of format "Su--WThF-", returns an array of 7 booleans representing which days of the week are represented
     * @param {string} daysOfWeekString 
     * @returns Sunday is index 0, Monday 1, etc.
     */
    const daysOfWeekToArray = (daysOfWeekString) => {
      let patterns = [/Su/, /M/, /T[^h]/, /W/, /Th/, /F/, /Sa/] // the sunday and saturday patterns are guesses. TODO: find someone with a sunday/saturday class and see what the real pattern is
      return patterns.map(p => !(daysOfWeekString.search(p) == -1)) // this is so fancy
    }

      return ({
        "term"        : term,
        "courseNum"   : courseNum,
        "institution" : institution,
        "dateRange"   : dateRange,
        // "dateRangeString" : dateRangeString, for debugging
      "daysOfWeek"  : daysOfWeekToArray(el.querySelector('[data-th="Days and Times"]').innerText.slice(0,7)),
      "timeRange"   : el.querySelector('[data-th="Days and Times"]').innerText.slice(8), // everything after character 8 (inclusive) // format: hh:mm pm - hh:mm pm
        // "meetingType" : el.querySelector('[data-th="Meeting Dates"]').innerText, // uh not doing this rn
        "room"        : el.querySelector('[data-th="Room"]').innerText,
        // "courseName"  : el.querySelector('[data-th="Meeting Dates"]').innerText, // hm not actually given by this url
        // "address"     : el.querySelector('[data-th="Meeting Dates"]').innerText // this is also not included and may be hard to get too? accessible through outside sit,
      })
    }
  
  /**
   * Enhances coursesInfo by cross-referencing between it and `weeks`. 
   * Populates `meetingType`, `courseName` (but not `address` yet)
   * (not yet but will soon) Also adds excluded meetings (e.g. breaks) and (maybe???) additional meetings (e.g. exams). 
   * @param {Array<Array<Object>>} weeks 
   * @param {Array<Object>} coursesInfo
   */
  const scraperSecondPass = (weeks, coursesInfo) => {
    // first, copy over `meetingType` and `courseName`
    courseloop: for (let course of coursesInfo) { // for course in coursesInfo
      for (let week of weeks) { // for week in `weeks`
        for (let meeting of week.meetingObjects) { // for meeting in week
          if (meeting.courseNum == course.courseNum) {
            course.meetingType = meeting.meetingType
            course.courseName = meeting.courseName
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
      const timeRangeRepr = (timeRangeString, format) => {
        let ARBITRARY_DATE = new Date("Oct 10 1990")
        if (format == "week") {
          timeRange = getTimes(timeRangeString, ARBITRARY_DATE) // long string that is dumb
        } else if (format == "coursesInfo") {
          timeRange = recurringGetTimes(timeRangeString, ARBITRARY_DATE) // long string that is dumb
        } else {
          console.log("Uh oh rip m8 uncaught error in timeRangeRepr") // TODO: handle error
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
          
          console.log(`Excluded meeting found! hash: ${hash}`)
          console.log(`date: ${excludedDate}`)
          modelWeekHT[hash].course.excludedDates.push(excludedDate)
        }
      }

      // finding additional meetings
      // for meeting in actual week, ensure it appears in the model week. If it doesn't, add it to the additional dates
      for (let hash of thisWeekKeys) { // for meeting in week
        if (modelWeekHT[hash] == null) { // if this meeting doesn't appear in the model week
          console.log(`Additional meeting found! hash: ${hash}`)
          additionalMeeting = thisWeekHT[hash]
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
    console.log(additionalMeetings)

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
     * @param {string} [sampleDateString] // format: "yyyy-mm-dd". Note: this should be a *representative week of the semester*, not breaktime
     * @returns {Object} // has fields `.weeks` and `.coursesInfo`
     * `.weeks` is a doubly-nested array of every single class meeting in the semester
     * `.coursesInfo` is the general course info (e.g. term start and end days) for each class *found in the sample week*
     */
    const scrapeASemester = async (sampleDateString="unset") => {
      // NOTE: sampleWeek is just an array of meeting objects
      let sampleWeek = (await weekToJson(sampleDateString)).meetingObjects // samples from the sample week
      let term = sampleWeek[0].term // extracts term. we'll need this later
      let institution = "UMNTC"
  
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
      // this is so cursed
      let weeks = []
      for (let date = new Date(startDate.getTime()); date <= endDate; date.setDate(date.getDate() + 7)) { // the reason we need to pad endDate
        let currentWeekData = await weekToJson(formatDateForURL(date))
        // now um somehow check for when a class should be happening, but isn't (e.g. break/holiday)
        // ??? think about this later
        weeks.push(currentWeekData)
      }
  
      // `weeks` now contains all the meeting time info, and `coursesInfo` contains all the general info about courses
      // We could just dump this info directly into a calendar file, but it'd be best to try to compress it down a bit
      // Idea: (does this work with .ics files?)
      // i. Create calendar with all of the meetings as prescribed (using repeating events)
      // ii. add extra meeting times as needed (e.g. exams), delete meeting times as needed for holidays
      // if we can't delete individual instances of repeating events, we could end up creating 2 repeating events per class? (e.g. one for before break, one for after)
  
      // 3. 
      let missingMeetings = [] // holdiays/breaks
      let extraMeetings = [] // e.g. midterms

      // soup up `coursesInfo` by pulling data out of `weeks`.
      scraperSecondPass(weeks, coursesInfo)
  
      return ({"weeks" : weeks.map(w => w.meetingObjects), // just return the meetingObjects to avoid breaking dependencies
               "coursesInfo" : coursesInfo})
  }
  
// ##########
// End scraper.js
// ##########

// ##########
// Begin icsFile.js
// ##########

/**
 * Downloads a file `cal.ics` filled with contents `stringData` (as plaintext) 
 * @param {string} [stringData] 
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
 * @param {number} [n]
 * @returns {string}
 */
function pad(n){
if (n<10) return "0"+n
return n
}

/**
 * Formats time as YYYYMMDDTHHMMSS
 * @param {number} [hour]
 * @param {number} [min]
 * @param {Date} [date] 
 * @returns {string}
 */
function formatDate(hour, min, date){ 
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(hour)}${pad(min)}00`
}

/**
 * Gets start and end times for event (array of formatted strings)
 * Does a little bit of inference of the am/pm status of the first event
 * @param {string} [timeRange] // format: "hh:mm - hh:mm pm"
 * @param {Date} [date]
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
  return [formatDate(t1H,t1M,date),formatDate(t2H,t2M,date)]
}

/**
 * Given a `classEvent` JSON object, returns a string: the lines representing the event in .ics format
 * @param {Object} [classEvent] // JSON object: the elements of `ScrapeASemester().weeks`
 * @return {string} 
 */
function createVEVENT(classEvent){ //create EVENT calendar lines
let [startDate, endDate] = getTimes(classEvent.timeRange, classEvent.date)
return `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
LOCATION:${classEvent.room}
SUMMARY:${classEvent.courseName + " " +classEvent.meetingType}
END:VEVENT
`
}

/**
 * Create a recurring event
 * @param {Object} [courseData]
 * @return {string} // .ics lines for this recurring event
 */
const createRecurringVEVENT = (courseData, excludedDates) => {
  // let [startDate, endDate] = getTimes(courseData.timeRange)
  // console.log(courseData)
  // console.log(courseData.timeRange)
  // console.log(recurringGetTimes(courseData.timeRange, courseData.dateRange[0]))
  let [startDate, endDate] = recurringGetTimes(courseData.timeRange, courseData.dateRange[0]) // date is first day of semester
  let accum = `BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
`

  // recurrence info
  accum += `RRULE:FREQ=WEEKLY;WKST=SU;`
  let recurrenceEndDate = formatDate(23, 59, courseData.dateRange[1])
  accum += `UNTIL=${recurrenceEndDate};`

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
  accum += `BYDAY=${formatDaysOfWeek(courseData.daysOfWeek)}\n`

  let eventStartTime = parseTime(courseData.timeRange.split(" - ")[0])
  // Now add the excluded dates
    for (excludedDate of courseData.excludedDates) {
      accum += `EXDATE:${formatDate(eventStartTime.hour, eventStartTime.min, excludedDate)}\n`
    }

  // Now add the rest of the info
  accum += `LOCATION: ${courseData.room}
SUMMARY: ${courseData.courseName} ${courseData.meetingType}
END:VEVENT
`

  return accum
}

const parseTime = (timeString) => { // takes format "hh:mm pm"
  let [hhmm, ampm] = timeString.split(" ")
  let [hour, min] = hhmm.split(":").map(s => Number(s)) // parse hhmm into ints
  hour = hour % 12 // have to reduce out that 12am is actually 0:00
  if (ampm == "PM") {
    hour += 12;
  }
  return {"hour": hour, "min" : min}
}

const recurringGetTimes = (timeRange, day) => {
  timeRange = timeRange.replace(/^ | $/g,"") // again, we need to remove leading/trailing whitespace. ew!
  let [startStr, endStr] = timeRange.split(" - ")

  result = [startStr, endStr].map((timeString) => {
    time = parseTime(timeString)
    return formatDate(time.hour, time.min, day)
  })

  return result
}

const dataToRecurringICS = (scrapedData) => {
  console.log("Composing ics file...")
  let accum = `BEGIN:VCALENDAR
PRODID:-//GopherGrades//Classes//EN
VERSION:1.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME: Class Calendar
X-WR-TIMEZONE:America/Chicago
` // header stuff yknow
  for (courseInfo of scrapedData.coursesInfo) {
    accum += createRecurringVEVENT(courseInfo)
  }

  accum += "END:VCALENDAR"
  console.log(accum)
  return accum
}

/**
 * Given the output of `ScrapeASemester`, returns the semester's full .ics calendar file as a string
 * @param {Object} [scrapedData] // JSON object: what is directly returned by `ScrapeASemester()`
 * @return {string} // The full .ics file text
 */
function createData(scrapedData){ //creates ics file string
console.log("Started createData")
let ouputString = `BEGIN:VCALENDAR
PRODID:-//GopherGrades//Classes//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME: Class Calendar
X-WR-TIMEZONE:America/Chicago
`
for (week of scrapedData.weeks){
  for (classEvent of week){
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
`<div id="calendar_button">
<button class="calendar_button">Export to Google Calendar</button>
</div>` ; 

/**
 * Turns template string into an actual html element
 * @param {string} [html]
 * @returns {HTMLElement}
 */ 
const htmlToElement = (html) => {
    const template = document.createElement("template");
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
};

/**
 * Appends a new button on the MyU academics tab. 
 */
const appendButton = () => {
    const newDiv = htmlToElement(buttonTemplate); //This should be a new element node?
    
    //This is the div that contains buttons "View Calendar" "List View" and "Textbooks (UMTC)"
    const calendarDiv = document.getElementsByClassName("myu_btn-group col-lg-12")[0];
    
    //A div that holds calendarDiv inside of it
    const parentDiv = document.getElementsByClassName("row")[4];
    
    if(calendarDiv != null) {
        
        parentDiv.insertBefore(newDiv, calendarDiv.nextSibling);

        //Apply following 
        newDiv.querySelector("button").addEventListener("click", buttonBody)
        
    }else{
        console.log("Button not working");
    }
}

/**
 * Function that runs on button press
 */
const buttonBody = async () => {
  // console.log("Beginning scrape and download..")
  // fileDownload(createData(await scrapeASemester()))

  console.log("Beginning scrape and download..")
  fileDownload(dataToRecurringICS(await scrapeASemester()))
  
  // scrape = await scrapeASemester(formatDateForURL(new Date()))
  // console.log(scrape.coursesInfo)
  // console.log(scrape.weeks)
  // console.log(scrape)
  // c = scrape.coursesInfo[0]
  // console.log(createRecurringVEVENT(c, []))
}

setTimeout(appendButton, 10000); //Wait 5 seconds after load before applying button. There has to be a better way 
