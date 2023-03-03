/**
 * Some utilityish functions to scrape course data
 * The two functions work, but this alone is not yet very useful
 * Also the functions are still missing some features, (see commented-out lines in JSON objects)
 */


/**
 * given a Date object, formats it to yyyy-mm-dd 
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
 * Returns a list of json objects containing all the meetings in a given week
 * Json includes course name, number, date (a single date!), time, room, etc. 
 * @param {string} [dateString="unset"] // a day during the week in question (Let's say the Sunday.), in format "yyyy-mm-dd", WITH DASHES. "unset" gives the current week
 * @returns {Array} meetingObjectArray
 */
const weekToJson = async (dateString="unset") => {
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

  var meetingElements = el.querySelectorAll(".myu_calendar-class") // list of all the classes this week as HTML elems
  const meetingObjects = []; // list of json objects holding meeting data
  for (let i = 0; i < meetingElements.length; i++) {

    // defined for convenience/readability(?)
    let meetingEl = meetingElements[i];

    // sometimes a meetingEl marks when there are no classes in a day?
    if (meetingEl.classList.contains("no-class")) {
      console.log("encountered a no-class meetingElement. skipping...")
      continue
    }

    // utility func to parse yyyymmdd into Date object
    let parseDate = (dateString) => {
      year = dateString.slice(0, 4)
      month = dateString.slice(4, 6)
      day = dateString.slice(6, 8)
      return new Date(Date.UTC(year, month-1, day)) // month-1 ew
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
  return meetingObjects;
}

/**
 * Gives general info on a class: session start, days of week, meeting times, location, etc
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

    return ({
      "term"        : term,
      "courseNum"   : courseNum,
      "institution" : institution,
      "dateRange"   : dateRange,
      // "dateRangeString" : dateRangeString, for debugging
      "daysOfWeek"  : el.querySelector('[data-th="Days and Times"]').innerText.slice(0,7), // everything before character 8 // TODO: put this in better format? esp bc Thursday ("Th") messes stuff up I expect
      "timeRange"   : el.querySelector('[data-th="Days and Times"]').innerText.slice(8), // everything after character 8 (inclusive)
      // "meetingType" : el.querySelector('[data-th="Meeting Dates"]').innerText, // uh not doing this rn
      "room"        : el.querySelector('[data-th="Room"]').innerText,
      // "courseName"  : el.querySelector('[data-th="Meeting Dates"]').innerText, // hm not actually given by this url
      // "address"     : el.querySelector('[data-th="Meeting Dates"]').innerText // this is also not included and may be hard to get too? accessible through outside sit,
    })
  }

  // BEGIN ZONE OF EXTRA JANK

  // Scraping up all meeting times, including catching when classes are canceled for holidays
  // General game plan: 
  // 1. pick a sample week (which week best to pick?), then grab all the course numbers in it
  // 2. Then get the general course info for each of those course numbers, store it somewhere
  // 3. Then take one of the `dateRange`s (they're all the same) and scrape through the whole thing to find instances of when a class should appear but it doesn't. store this somehow
  console.log("scraper.js runs!")

  // 1. get all the course numbers
  // TRY A WEEK! YES, YOU! TYPE ONE IN BELOW! DO IT NOW!
  const scrapeASemester = async (sampleDateString="unset") => { // format: yyyy-mm-dd
    let sampleWeek = await weekToJson(sampleDateString) // i think you can type in arbitrary dates now!
    // let term = "1229"
    let term = sampleWeek[0].term // automatic, baybee
    let institution = "UMNTC"

    let courseNums = []
    for (let i = 0; i < sampleWeek.length; i++) {
      if (!courseNums.includes(sampleWeek[i].courseNum)) {
        courseNums.push(sampleWeek[i].courseNum)
      }
    }

    // 2. 
    let coursesInfo = [] // list containing general class info for all the courses you're enrolled in
    for (let i = 0; i < courseNums.length; i++) {
      coursesInfo.push(await generalClassInfo(term, courseNums[i], institution))
    }

    // 3: loop through week by week and do ...stuff
    startDate = endDate = coursesInfo[0].dateRange[0]
    endDate = coursesInfo[0].dateRange[1]
    endDate.setDate(endDate.getDate() + 7) // pad an extra week onto endDate so we can be sure we got everything

    // for loop from startDate to endDate. step size is one week
    // `date` is a date lying in the week of interest
    // this is so cursed
    let weeks = []
    for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 7)) { // the reason we need to pad endDate
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

    return ({"weeks" : weeks, 
             "courseInfo" : coursesInfo})
}
window.scrapeASemester = scrapeASemester
console.log("scope lifted????")

// console.log("trying to scrape...")
// console.log(scrapeASemester("2023-03-02"))
