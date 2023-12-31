/* global rrule */

EVENT_WATERMARK =
  "<p>This event was created using the GopherGrades extension! Download at <a href='https://umn.lol'>umn.lol</a>.</p>";
DASHBOARD_URL = "https://dash.umn.lol/api/send";
DASHBOARD_ID = "22f6733b-ad28-4934-a703-1c1ea4c0e4fc";

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

let bundles = {},
  bundleColors = {};
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

let cal;
chrome.storage.local.get(["cal"], (result) => {
  cal = result.cal;
  console.log(cal);

  // add cards for each class
  const classes = cal.courses;
  bundles = unifyClasses(classes);
  Object.keys(bundles).forEach((courseNum) => {
    // each bundle is one course, e.g. CSCI 2021 (lecture and lab)
    addCard(bundles[courseNum], courseNum);
  });
});

const colorPicker = (courseNum) =>
  colors.event
    .map(
      (color, index) =>
        `<button class="color" data-color-id="${index}" style="background-color: ${color.background}"></button>`
    )
    .join("");

let currentColor = 1;

/**
 * Takes a bundle for a course, then returns a new card HTMLElement for that course
 * @param {Array<classObj>} bundle
 * @param {string} courseNum
 * @returns {ChildNode}
 */
const createCardElement = (bundle, courseNum) => {
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

      return `<p class="event-time"><b style="font-weight: 500">${
        meeting.meetingType
      }</b>: ${
        meeting.timeRange
      } ${rr.toText()} in <b style="font-weight: 400">${meeting.room}</b></p>`;
    })
    .join("");
  const colorId = currentColor++ % colors.event.length;
  const color = colors.event[colorId];
  bundleColors[courseNum] = colorId;

  // convert the html string into an actual html element
  let htmlText = `
    <div class="event card" style="--event-color: ${
      color.background
    }" id="${cardId}-card">
        <div class="title">
            <h2 class="event-title">${courseName}: ${prettyName}</h2>
            <div class="color-switcher-container">
                <button class="color-switcher">
                    <div class="color current-color"></div>
                    <div class="arrow down"></div>
                </button>
                <div class="color-picker">
                    ${colorPicker(courseNum)}
                </div>
            </div>
        </div>
        ${infoSection}
    </div>`;
  const el = htmlToElement(htmlText);
  // add event listeners to the color picker
  el.querySelectorAll(".color-picker .color").forEach((colorEl) => {
    colorEl.addEventListener("click", (e) => {
      const colorId = e.target.getAttribute("data-color-id") || "0"; // default to "0"
      const card = document.getElementById(`${cardId}-card`);
      card.style.setProperty("--event-color", colors.event[colorId].background);
      bundleColors[courseNum] = parseInt(colorId);
    });
  });
  return el;
};

/**
 *
 * @param {Object} bundle
 * @param {string} courseNum
 */
const addCard = (bundle, courseNum) => {
  const parentDiv = document.querySelector(".events");
  const newCard = createCardElement(bundle, courseNum);
  parentDiv.appendChild(newCard);
};

const getCalendarToken = () => {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (token) resolve(token);
      else reject();
    });
  });
};

const googleApi = async (url, token, body, method = "POST") => {
  // return {};
  const res = await fetch(url, {
    method: method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());
  if (res.error) console.error(res.error);
  return res;
};

const trackEvent = (name, data = {}) => {
  fetch(DASHBOARD_URL, {
    method: "POST",
    body: JSON.stringify({
      payload: {
        hostname: window.location.hostname,
        language: navigator.language,
        referrer: document.referrer,
        screen: `${window.screen.width}x${window.screen.height}`,
        title: document.title,
        url: window.location.pathname,
        website: DASHBOARD_ID,
        name: name,
        data: {
          foo: "bar",
        },
      },
      type: "event",
    }),
  })
    .then((r) => r.json())
    .then(console.log);
};

document.querySelector("#add").addEventListener("click", async (e) => {
  trackEvent("ext:adding_to_calendar", {
    bundles: bundles,
  });
  const token = await getCalendarToken();
  console.log(bundles, bundleColors);
  document.querySelector("#initial-screen").classList.add("hidden");
  document.querySelector("#loading-screen").classList.remove("hidden");
  const setLoadingMessage = (message) => {
    document.querySelector("#loading-screen .subtitle").innerHTML = message;
  };

  const createNewCalendar = document.querySelector("#new-calendar")?.checked;
  let calendarId;
  if (createNewCalendar) {
    setLoadingMessage("Creating calendar...");

    const createdCalendar = await googleApi(
      "https://www.googleapis.com/calendar/v3/calendars",
      token,
      {
        summary: "UMN.LOL Schedule",
      }
    );

    setLoadingMessage("Adding calendar to calendar list...");
    console.log(createdCalendar);

    // add calendar to calendarList
    await googleApi(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList`,
      token,
      {
        id: createdCalendar.id,
        colorId: "6", // color id of the calendar, it is 6 for now -- we could let them pick from colors.calendar.
        selected: true,
      }
    );
    console.log("added calendar to calendar list");
    calendarId = createdCalendar.id;
  } else {
    setLoadingMessage("Getting primary calendar...");
    // get primary calendar
    const calendar = await googleApi(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      token,
      undefined,
      "GET"
    );

    calendarId = calendar.id;
  }

  setLoadingMessage("Adding events to calendar...");

  // add events to calendar
  const classes = Object.keys(bundles);
  for (let i = 0; i < classes.length; i++) {
    const courseNum = classes[i];
    const bundle = bundles[courseNum];
    const colorId = bundleColors[courseNum];
    const color = colors.event[colorId];
    const courseName = bundle[0].courseName;
    const prettyName = bundle[0].prettyName;
    const cardId = courseName.replace(/\s/g, "-");

    // add in details for lecture AND lab/discussion if applicable (using the bundle)
    const events = bundle.filter((meeting) => meeting.calendarStrings.rRule);

    for (let j = 0; j < events.length; j++) {
      setLoadingMessage(
        `Adding classes to calendar... (${i + 1}/${classes.length})`
      );
      const exDate = events[j].calendarStrings.exDates.join(",");
      const recurrences = [
        `RRULE:${events[j].calendarStrings.rRule.replace(
          /([0-9]{8}T[0-9]{6})([^Z])/,
          "$1Z$2"
        )}`,
      ];
      // if (exDate) {
      //   recurrences.push(
      //     `EXDATE;TZID=America/Chicago:${exDate.replaceAll("Z", "")}`
      //   );
      // }
      const event = {
        start: {
          dateTime: rrToDate(events[j].calendarStrings.dtStart)
            .toISOString()
            .replace("Z", ""),
          timeZone: "America/Chicago",
        },
        end: {
          dateTime: rrToDate(events[j].calendarStrings.dtEnd)
            .toISOString()
            .replace("Z", ""),
          timeZone: "America/Chicago",
        },
        summary: `${courseName}: ${prettyName}`,
        description:
          `<p><b style="font-weight: 500">${events[j].meetingType}</b>: ${events[j].timeRange} in <b style="font-weight: 400">${events[j].room}</b></p>` +
          EVENT_WATERMARK,
        colorId: (colorId + 1).toString(),
        recurrence: recurrences,
        location: events[j].room,
      };

      console.log(event);
      // add event to calendar
      const res = await googleApi(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        token,
        event
      );
      console.log(res);
    }
  }
  setLoadingMessage("Done!");
  location.href = "https://calendar.google.com/calendar/";
});

document.querySelector("#ics").addEventListener("click", async (e) => {
  blob = portableToIcsBlob(cal);
  console.log(blob);
  fileDownload(blob);
});
