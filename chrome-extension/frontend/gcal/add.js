/* global rrule */

// #############################################################
// figure out the canonical/proper way to import these:
// #############################################################
// from calendar.js
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

// from date.js
const MONTH_NAMES = ["December", "January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"];

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

// #######################
// Again, should figure out how to import properly .__.
// #######################


const sample_data = {
  cal: {
    additionalMeetings: [],
    courses: [
      {
        calendarStrings: {
          dtEnd: "20230118T131000",
          dtStamp: "20230327T012753",
          dtStart: "20230118T122000",
          exDates: [
            "20230116T122000",
            "20230306T122000",
            "20230308T122000",
            "20230310T122000",
            "20230503T122000",
            "20230505T122000",
          ],
          rRule: "FREQ=WEEKLY;WKST=SU;UNTIL=20230508T235900;BYDAY=MO,WE,FR",
          uID: "1233-55334-ybsz8mrb31@umn.lol",
        },
        courseName: "STAT 3021",
        courseNum: "55334",
        dateRange: ["2023-01-17T00:00:00.000Z", "2023-05-08T00:00:00.000Z"],
        daysOfWeek: [false, true, false, true, false, true, false],
        excludedDates: [
          "2023-01-16T00:00:00.000Z",
          "2023-03-06T00:00:00.000Z",
          "2023-03-08T00:00:00.000Z",
          "2023-03-10T00:00:00.000Z",
          "2023-05-03T00:00:00.000Z",
          "2023-05-05T00:00:00.000Z",
        ],
        firstDate: "2023-01-18T00:00:00.000Z",
        institution: "UMNTC",
        meetingType: "Lecture",
        prettyName: "Intro to Prob&Stat",
        room: "Amundson Hall B75",
        sectionID: "004",
        term: "1233",
        timeRange: "12:20 PM - 01:10 PM",
      },
      {
        calendarStrings: {
          dtEnd: "20230118T141500",
          dtStamp: "20230327T012753",
          dtStart: "20230118T132500",
          exDates: [
            "20230116T132500",
            "20230306T132500",
            "20230308T132500",
            "20230310T132500",
            "20230503T132500",
            "20230505T132500",
          ],
          rRule: "FREQ=WEEKLY;WKST=SU;UNTIL=20230501T235900;BYDAY=MO,WE,FR",
          uID: "1233-59511-1x3iea6p8p@umn.lol",
        },
        courseName: "CSCI 2041",
        courseNum: "59511",
        dateRange: ["2023-01-17T00:00:00.000Z", "2023-05-01T00:00:00.000Z"],
        daysOfWeek: [false, true, false, true, false, true, false],
        excludedDates: [
          "2023-01-16T00:00:00.000Z",
          "2023-03-06T00:00:00.000Z",
          "2023-03-08T00:00:00.000Z",
          "2023-03-10T00:00:00.000Z",
          "2023-05-03T00:00:00.000Z",
          "2023-05-05T00:00:00.000Z",
        ],
        firstDate: "2023-01-18T00:00:00.000Z",
        institution: "UMNTC",
        meetingType: "Lecture",
        prettyName: "Adv. Programming Principles",
        room: "Bruininks Hall 230",
        sectionID: "001",
        term: "1233",
        timeRange: "01:25 PM - 02:15 PM",
      },
      {
        calendarStrings: {
          dtEnd: "20230118T152000",
          dtStamp: "20230327T012753",
          dtStart: "20230118T143000",
          exDates: [
            "20230116T143000",
            "20230306T143000",
            "20230308T143000",
            "20230310T143000",
            "20230503T143000",
            "20230505T143000",
          ],
          rRule: "FREQ=WEEKLY;WKST=SU;UNTIL=20230501T235900;BYDAY=MO,WE,FR",
          uID: "1233-59443-lqbvumk0ap@umn.lol",
        },
        courseName: "CSCI 1913",
        courseNum: "59443",
        dateRange: ["2023-01-17T00:00:00.000Z", "2023-05-01T00:00:00.000Z"],
        daysOfWeek: [false, true, false, true, false, true, false],
        excludedDates: [
          "2023-01-16T00:00:00.000Z",
          "2023-03-06T00:00:00.000Z",
          "2023-03-08T00:00:00.000Z",
          "2023-03-10T00:00:00.000Z",
          "2023-05-03T00:00:00.000Z",
          "2023-05-05T00:00:00.000Z",
        ],
        firstDate: "2023-01-18T00:00:00.000Z",
        institution: "UMNTC",
        meetingType: "Lecture",
        prettyName: "Intro to Algs. & Program Dev.",
        room: "Bruininks Hall 220",
        sectionID: "001",
        term: "1233",
        timeRange: "02:30 PM - 03:20 PM",
      },
      {
        calendarStrings: {
          dtEnd: "20230118T162500",
          dtStamp: "20230327T012753",
          dtStart: "20230118T153500",
          exDates: [
            "20230116T153500",
            "20230306T153500",
            "20230308T153500",
            "20230310T153500",
            "20230503T153500",
            "20230505T153500",
          ],
          rRule: "FREQ=WEEKLY;WKST=SU;UNTIL=20230501T235900;BYDAY=MO,WE,FR",
          uID: "1233-60000-g7cqokqhgz@umn.lol",
        },
        courseName: "CSCI 2011",
        courseNum: "60000",
        dateRange: ["2023-01-17T00:00:00.000Z", "2023-05-01T00:00:00.000Z"],
        daysOfWeek: [false, true, false, true, false, true, false],
        excludedDates: [
          "2023-01-16T00:00:00.000Z",
          "2023-03-06T00:00:00.000Z",
          "2023-03-08T00:00:00.000Z",
          "2023-03-10T00:00:00.000Z",
          "2023-05-03T00:00:00.000Z",
          "2023-05-05T00:00:00.000Z",
        ],
        firstDate: "2023-01-18T00:00:00.000Z",
        institution: "UMNTC",
        meetingType: "Lecture",
        prettyName: "Disc. Structures",
        room: "Amundson Hall B75",
        sectionID: "020",
        term: "1233",
        timeRange: "03:35 PM - 04:25 PM",
      },
      {
        calendarStrings: {
          dtEnd: "20230117T141500",
          dtStamp: "20230327T012753",
          dtStart: "20230117T132500",
          exDates: ["20230307T132500", "20230502T132500"],
          rRule: "FREQ=WEEKLY;WKST=SU;UNTIL=20230501T235900;BYDAY=TU",
          uID: "1233-59517-sqiq10ggwk@umn.lol",
        },
        courseName: "CSCI 2041",
        courseNum: "59517",
        dateRange: ["2023-01-17T00:00:00.000Z", "2023-05-01T00:00:00.000Z"],
        daysOfWeek: [false, false, true, false, false, false, false],
        excludedDates: ["2023-03-07T00:00:00.000Z", "2023-05-02T00:00:00.000Z"],
        firstDate: "2023-01-17T00:00:00.000Z",
        institution: "UMNTC",
        meetingType: "Laboratory",
        prettyName: "Adv. Programming Principles",
        room: "Keller Hall 1-250",
        sectionID: "007",
        term: "1233",
        timeRange: "01:25 PM - 02:15 PM",
      },
      {
        calendarStrings: {
          dtEnd: "20230117T162500",
          dtStamp: "20230327T012753",
          dtStart: "20230117T143000",
          exDates: ["20230307T143000", "20230502T143000"],
          rRule: "FREQ=WEEKLY;WKST=SU;UNTIL=20230501T235900;BYDAY=TU",
          uID: "1233-59444-9unlln6g8f@umn.lol",
        },
        courseName: "CSCI 1913",
        courseNum: "59444",
        dateRange: ["2023-01-17T00:00:00.000Z", "2023-05-01T00:00:00.000Z"],
        daysOfWeek: [false, false, true, false, false, false, false],
        excludedDates: ["2023-03-07T00:00:00.000Z", "2023-05-02T00:00:00.000Z"],
        firstDate: "2023-01-17T00:00:00.000Z",
        institution: "UMNTC",
        meetingType: "Laboratory",
        prettyName: "Intro to Algs. & Program Dev.",
        room: "Walter Library 106",
        sectionID: "003",
        term: "1233",
        timeRange: "02:30 PM - 04:25 PM",
      },
      {
        calendarStrings: {
          dtEnd: "20230117T173000",
          dtStamp: "20230327T012753",
          dtStart: "20230117T164000",
          exDates: ["20230307T164000", "20230502T164000"],
          rRule: "FREQ=WEEKLY;WKST=SU;UNTIL=20230501T235900;BYDAY=TU",
          uID: "1233-60005-2krzqiuy5g@umn.lol",
        },
        courseName: "CSCI 2011",
        courseNum: "60005",
        dateRange: ["2023-01-17T00:00:00.000Z", "2023-05-01T00:00:00.000Z"],
        daysOfWeek: [false, false, true, false, false, false, false],
        excludedDates: ["2023-03-07T00:00:00.000Z", "2023-05-02T00:00:00.000Z"],
        firstDate: "2023-01-17T00:00:00.000Z",
        institution: "UMNTC",
        meetingType: "Discussion",
        prettyName: "Disc. Structures",
        room: "Lind Hall L120",
        sectionID: "023",
        term: "1233",
        timeRange: "04:40 PM - 05:30 PM",
      },
    ],
  },
};

function getClasses(cal) {
  const classes = [];
  cal.forEach((c) => {
    const {
      courseName,
      courseNum,
      sectionID,
      prettyName,
      meetingType,
      timeRange,
      room,
      daysOfWeek,
      excludedDates,
      dateRange,
      firstDate,
      calendarStrings,
    } = c;
    const classObj = {
      courseName,
      courseNum,
      sectionID,
      prettyName,
      meetingType,
      timeRange,
      room,
      daysOfWeek,
      excludedDates,
      dateRange,
      firstDate,
      calendarStrings,
    };
    classes.push(classObj);
  });
  return classes;
}

/**
 * Bundles together all the meetings for each class into li'l arrays, which themselves go in a dict
 * e.g. puts 2041 lecture together with 2041 lab
 * @param {Array<classObj>} classes 
 * @returns {Object<Array<classObj>} dict of "bundles"
 */
const unifyClasses = (classes) => {
  let bundles = {};
  classes.forEach((meeting) => {
    if (bundles[meeting.courseName] == null) {
      bundles[meeting.courseName] = [];
    }
    bundles[meeting.courseName].push(meeting);
  });
  return bundles; // future enhancement: order the bundles: display lecture first, then lab/discussoin
}

chrome.storage.sync.get(["cal"], (result) => {
  const { cal } = result;
  console.log(cal);

  // add cards for each class
  const classes = getClasses(cal.courses);
  const bundles = unifyClasses(classes);
  Object.keys(bundles).forEach((courseNum) => { // each bundle is one course, e.g. CSCI 2021 (lecture and lab)
    addCard(bundles[courseNum]);
  });
  
  rrule;
});

/**
 * Takes a bundle for a course, then makes the 
 * @param {Array<ClassObj>} bundle 
 * @returns {HTMLElement}
 */
const createCardElement = (bundle) => {  
  const courseName = bundle[0].courseName;
  const cardId = courseName.replace(/\s/g, "-");
  const prettyName = bundle[0].prettyName;
  // const {
  //   courseName,
  //   courseNum,
  //   sectionID,
  //   prettyName,
  //   meetingType,
  //   timeRange,
  //   room,
  //   daysOfWeek,
  //   excludedDates,
  //   dateRange,
  //   firstDate,
  //   calendarStrings,
  // } = bundle[0];

  let htmlText = 
  `<div class="event card" style="--event-color: #ff887c" id="${cardId}-card">
    <div class="title">
        <h2 class="event-title">${courseName}: ${prettyName}</h2>
        <div class="color-switcher-container">
            <button class="color-switcher">
                <div class="color current-color" style="background-color: #ff887c"></div>
                <div class="arrow down"></div>
            </button>
            <div class="color-picker">
                <div class="color" style="background-color: #ff0000"></div>
                <div class="color" style="background-color: #ff7f00"></div>
                <div class="color" style="background-color: #ffff00"></div>
                <div class="color" style="background-color: #00ff00"></div>
                <div class="color" style="background-color: #0000ff"></div>
                <div class="color" style="background-color: #4b0082"></div>
                <div class="color" style="background-color: #9400d3"></div>
            </div>
        </div>
    </div>`

    // add in details for lecture AND lab/discussion if applicable (using the bundle)
    // Q: would it be neater/cleaner to create a template html element, then *insert* the relevant custom things into it 
    // using `.appendChild()` and stuff? Or is this "directly edit the html text" method okay?
    bundle.forEach((meeting) => {
      let prettyDaysOfWeek = formatDaysOfWeek(meeting.daysOfWeek, "Monday, ");
      let prettyEndDate = formatDate(new Date(meeting.dateRange[1]), "Month dd, yyyy");
      htmlText += `\n<p class="event-time">${meeting.meetingType}: ${meeting.timeRange} \
      every week on ${prettyDaysOfWeek} until ${prettyEndDate} in ${meeting.room}</p>`
    }); 
  htmlText += `\n</div>` 

  return htmlToElement(htmlText)
};

/**
 * 
 * @param {Object} bundle 
 */
const addCard = (bundle) => {
  const parentDiv = document.querySelector(".events");
  const newCard = createCardElement(bundle);
  parentDiv.appendChild(newCard);
};

// const  = ()
// let c = getClasses(sample_data.cal.courses);
// let bundles = unifyClasses(c);
// addCard(bundles["STAT 3021"]);
