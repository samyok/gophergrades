/* global rrule */

// #############################################################
// figure out the canonical/proper way to import these:
// #############################################################
// from calendar.js (? maybe import from elsewhere?)
/**
 * Turns template string into an actual html element
 * @param {string} html
 * @returns {ChildNode}
 */
const htmlToElement = (html) => {
  const template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
};

// #######################
// Again, should figure out how to import properly .__.
// #######################
/**
 * The complete classObj
 * @typedef {Object} classObj
 * @property {string} courseName
 * @property {string} courseNum
 * @property {string} sectionID
 * @property {string} prettyName
 * @property {string} meetingType
 * @property {string} timeRange
 * @property {string} room
 * @property {string} daysOfWeek
 * @property {string} excludedDates
 * @property {string} dateRange
 * @property {string} firstDate
 * @property {string} calendarStrings
 */

/**
 * Bundles together all the meetings for each class into lil arrays, which themselves go in a dict
 * e.g. bundles 2041 lecture together with 2041 lab
 * @param {Array<classObj>} classes
 * @returns {Object<key: string, classObj[]>} dict of "bundle" lists
 */
const unifyClasses = (classes) => {
  let bundles = {};
  classes.forEach((meeting) => {
    if (bundles[meeting.courseName] == null) {
      bundles[meeting.courseName] = [];
    }
    bundles[meeting.courseName].push(meeting);
  });
  return bundles; // future enhancement: order the bundles: display lecture first, then lab/discussion
};

chrome.storage.sync.get(["cal"], (result) => {
  const { cal } = result;
  console.log(cal);

  // add cards for each class
  const classes = cal.courses;
  const bundles = unifyClasses(classes);
  Object.keys(bundles).forEach((courseNum) => {
    // each bundle is one course, e.g. CSCI 2021 (lecture and lab)
    addCard(bundles[courseNum]);
  });
});

/**
 * Takes a bundle for a course, then returns a new card HTMLElement for that course
 * @param {Array<classObj>} bundle
 * @returns {ChildNode}
 */
const createCardElement = (bundle) => {
  const courseName = bundle[0].courseName;
  const cardId = courseName.replace(/\s/g, "-");
  const prettyName = bundle[0].prettyName;

  // add in details for lecture AND lab/discussion if applicable (using the bundle)
  const infoSection = bundle
    .filter((meeting) => meeting.calendarStrings.rRule)
    .map((meeting) => {
      const rr = new rrule.RRule(
        rrule.RRule.parseString(meeting.calendarStrings.rRule)
      );

      return `<p class="event-time">${meeting.meetingType}: ${
        meeting.timeRange
      } ${rr.toText()} in <b style="font-weight: 500">${meeting.room}</b></p>`;
    })
    .join("");

  let htmlText = `
<div class="event card" style="--event-color: #ff887c" id="${cardId}-card">
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
    </div>
    ${infoSection}
</div>`;
  return htmlToElement(htmlText);
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
