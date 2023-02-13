/**
 * Some utilityish functions to scrape course data
 * The two functions work, but this alone is not yet very useful
 * Also the functions are still missing some features, (see commented-out lines in JSON objects)
 */

/**
 * Returns a list of json objects containing all the meetings in a given week
 * Json includes course name, number, date (a single date!), time, room, etc. 
 * @param {string} [date="unset"] // a day during the week in question (Let's say the Sunday.), in format "yyyy-mm-dd", WITH DASHES. "unset" gives the current week
 * @returns {Array} meetingObjectArray
 */
const weekToJson = async (date="unset") => {
  // appends the date info to our base url
  let url = "https://www.myu.umn.edu/psp/psprd/EMPLOYEE/CAMP/s/WEBLIB_IS_DS.ISCRIPT1.FieldFormula.IScript_DrawSection?group=UM_SSS&section=UM_SSS_ACAD_SCHEDULE&pslnk=1&cmd=smartnav" // the base url
  if (date != "unset") {
    let url = baseURL.concat("&effdt=", date)
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
    let classDetails = meetingEl.querySelector(".myu_calendar-class-details").innerHTML
                        .replace(/\n/g,"").split("<br>") // regex is to get rid of random newlines that are in there for some reason
    
    meetingObjects.push({
      "term"        : meetingEl.getAttribute("data-strm"), // in format `xyyx', where `yy` is the year and `xx` = `13` is spring, `19` is fall
      "courseNum"   : meetingEl.getAttribute("data-class-nbr"),
      "date"        : meetingEl.getAttribute("data-fulldate"),
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

  var el = document.createElement('html')
  await fetch(url).then(r => r.text()).then(r => el.innerHTML = r)

  return ({
    "term"        : term,
    "courseNum"   : courseNum,
    "institution" : institution,
    "dateRange"   : el.querySelector('[data-th="Meeting Dates"]'),
    "daysOfWeek"  : el.querySelector('[data-th="Days and Times"]').innerText.slice(0,7), // everything before character 8
    "timeRange"   : el.querySelector('[data-th="Days and Times"]').innerText.slice(8), // everything after character 8 (inclusive)
    // "meetingType" : el.querySelector('[data-th="Meeting Dates"]').innerText, // uh not doing this rn
    "room"        : el.querySelector('[data-th="Room"]').innerText,
    // "courseName"  : el.querySelector('[data-th="Meeting Dates"]').innerText, // hm not actually given by this url
    // "address"     : el.querySelector('[data-th="Meeting Dates"]').innerText // this is also not included and may be hard to get too? accessible through outside sit,
  })
}
