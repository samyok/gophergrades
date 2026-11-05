/**
 * Sidebar content script for embedding inline gopher-grades pages.
 *
 * This file contains a small set of helpers that:
 *  - inject an iframe into course pages and schedules
 *  - send a single postMessage containing the current user's email
 *  - debounce DOM-driven updates to avoid repeat work
 *
 */

/* Base URL used when embedding the static class pages */
const BASE_URL = "https://umn.lol";

/* Small startup message helps quickly confirm the script loaded in DevTools */
console.log("sidebar grades is loaded :)");

/**
 * Listen for messages from embedded iframes.
 *
 * Expected message shape (from the iframe): { url: <some-url> }
 * When a message with a url is received, open it in a new browser tab.
 */
window.addEventListener("message", (event) => {
  console.log("[GG] received message from iframe", event);
  if (event.data?.url) {
    // open the url in a new tab
    return window.open(event.data.url, "_blank");
  }
});


/**
 * Generic debounce utility used to avoid calling expensive DOM work
 * repeatedly during rapid mutation sequences.
 *
 * @param {Function} func - Function to debounce.
 * @param {number} [wait=20] - Milliseconds to wait before invoking.
 * @param {boolean} [immediate=true] - If true, call on leading edge.
 * @returns {Function} - Debounced wrapper.
 */
const debounce = (func, wait = 20, immediate = true) => {
  let timeout;
  return function () {
    let context = this,
      args = arguments;
    let later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};


/* Cached internet id (email) so we avoid repeatedly querying DOM */
let internetId;

/**
 * Extract the user's internet id (email) from the page when available.
 * This is used to send a small identifying message to embedded iframes
 * so they can personalize content or surface follow-up contact details.
 */
const getInternetId = () => {
  if (internetId) return internetId;
  const matches = document
    .querySelector("[href='/logout.php']")
    ?.innerText.match(/\((.+)\)/);
  if (matches?.length > 1) internetId = matches[1];
  return internetId;
};


/**
 * Convert a HTML string into a DOM Element. Uses a template element so
 * scripts are not executed and whitespace-only nodes are avoided.
 *
 * @param {string} html - HTML fragment
 * @returns {Element}
 */
const htmlToElement = (html) => {
  const template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
};


/* Templates used for iframe insertion */
const iframeTemplate = `
<div class="gopher-grades-container">
<iframe class="gopher-grades-result-iframe" referrerpolicy="unsafe-url"></iframe>
</div>
`;

const iframePortalTemplate = (iframeId, courseName) => `
<div class="gopher-grades-portal" id="${iframeId}">
<h3 class="portal-label">${courseName}</h3>
</div>
`;


/**
 * Ensure a portal container exists for a given course. If the portal is
 * already present in the DOM we return it, otherwise we create and append
 * it to the provided target node.
 *
 * @param {string} iframeId - id string used for the portal container
 * @param {Element} target - DOM node to append the portal to
 * @param {string} courseName - friendly label for the portal
 * @returns {Element} the portal element
 */
const appendPortal = (iframeId, target, courseName) => {
  const alreadyExists = document.querySelector(`#${iframeId}`);
  if (alreadyExists) return alreadyExists;
  const portal = htmlToElement(iframePortalTemplate(iframeId, courseName));
  target.append(portal);
  return portal;
};


/**
 * Insert an iframe into the page and post a single message containing the
 * user's email. We attempt to send the message once shortly after
 * insertion and once again when the iframe emits its `load` event. This
 * avoids tight intervals and reduces the risk of infinite spam loops.
 *
 * Note: uses `direction` to support `prepend` (default) or `append`.
 */
const prependFrame = (url, elem, direction = "prepend") => {
  if (elem.querySelector("iframe")) return;
  const frameContainer = htmlToElement(iframeTemplate);
  console.log("[GG] frameContainer", frameContainer);
  const frame = frameContainer.querySelector("iframe");
  frame.src = url.replace(/ /g, "");
  elem[direction](frameContainer);

  // send a single postMessage when the iframe is ready. Also try once
  // shortly after insertion in case the iframe is already available.
  const sendMessage = () => {
    try {
      if (frame.contentWindow) {
        console.log("[GG] posting message to iframe");
        frame.contentWindow.postMessage({ email: getInternetId() }, "*");
        return true;
      }
    } catch (e) {
      console.log("[GG] postMessage error", e);
    }
    return false;
  };

  // try once immediately (after a small delay) and once on load event
  setTimeout(sendMessage, 200);
  frame.addEventListener('load', () => sendMessage());
};


/* Append variant for readability */
const appendFrame = (url, elem) => prependFrame(url, elem, "append");


/**
 * Scan an instructor/course list and inject inline iframes for each course
 * panel. This is debounced to avoid thrashing when the page mutates
 * rapidly (search results updating, panel expansion, etc.).
 */
const debouncedFindCourses = debounce((courseList) => {
  // list all ".panel" elements in the course list
  const coursePanels = courseList.querySelectorAll(".panel");
  Array.from(coursePanels).map((coursePanel) => {
    const parentPanel = coursePanel.parentElement;
    const courseId = parentPanel.querySelector("a[name]")?.getAttribute("name");
    console.log("[GG] coursePanels", courseId);

    prependFrame(
      `${BASE_URL}/class/${courseId}?static=all`,
      parentPanel.querySelector(".panel-body")
    );
  });
}, 50);


/**
 * Entry point when on the search/course list page. We debounce twice to
 * guard against timing issues where the DOM is still stabilizing.
 */
const loadCourses = (courseList) => {
  debouncedFindCourses(courseList);
  setTimeout(() => debouncedFindCourses(courseList), 200);
};


/**
 * When viewing a single course's info page, inject the main roadmap iframe
 * and also inject per-instructor views for each professor panel.
 */
const loadCourseInfo = (courseInfo) => {
  const courseTitle = courseInfo.querySelector("h2");
  const courseId = courseTitle.innerText.split(":")[0];

  console.log("[GG] course info loaded", courseId);

  const url = `${BASE_URL}/class/${courseId}?static=all`;
  appendFrame(url, courseInfo);

  // load all panels (one frame per professor panel)
  Array.from(document.querySelectorAll(".panel-body")).forEach((panel) => {
    const prof = panel
      ?.querySelector("table tbody tr td:nth-of-type(4)")
      ?.innerText.trim()
      ?.split(" ")
      ?.reverse()[0];
    if (!prof) return;

    const url = `${BASE_URL}/class/${courseId}?static=${prof}`;
    appendFrame(url, panel.querySelector(".table-responsive"));
  });
};


/**
 * If a built schedule is visible, find the courses listed there and inject
 * portal iframes for each one. This method uses a lightweight debounce
 * keyed on the current course list so we skip repeated processing when the
 * same list is encountered repeatedly.
 */
const loadCourseSchedule = (courseSchedule) => {
  const courses = Array.from(
    document.querySelectorAll("#schedule-courses tr:has(h4)")
  ).map((tr) => ({
    courseId: tr.innerText.trim().split(":")[0]?.replaceAll(" ", ""),
    courseName: tr.innerText.trim(),
    tr,
  }));

  // lightweight debounce: if same course list was processed recently, skip
  try {
    const key = courses.map(c => c.courseId).join(",")
    const now = Date.now()
    if (key === _lastScheduledCoursesKey && (now - _lastScheduledCoursesTs) < _SCHEDULE_DEBOUNCE_MS) {
      // use a minimal debug to indicate suppressed repeated update
      if (window.GGPlotter && window.GGPlotter.debug) window.GGPlotter.debug('[GG] scheduled courses suppressed')
      return
    }
    _lastScheduledCoursesKey = key
    _lastScheduledCoursesTs = now
  } catch (e) {
    // fall back to always proceeding on error
  }

  // log scheduled courses (compact) and inject iframes
  try {
    const dbg = (window.GGPlotter && window.GGPlotter.debug) ? window.GGPlotter.debug : console.log
    dbg('[GG] scheduled courses (' + courses.length + ') ' + JSON.stringify(courses.map(c => c.courseId)))
  } catch (e) {
    console.log('[GG] scheduled courses', courses)
  }
  for (let i = 0; i < courses.length; i++) {
    const { courseId, courseName } = courses[i];
    const iframeTarget = document.querySelector("#app-main .col-xs-12");
    const portal = appendPortal(courseId, iframeTarget, courseName);
    const url = `${BASE_URL}/class/${courseId}?static=all`;
    appendFrame(url, portal);
  }
};


/**
 * Called on app-level changes (mutation observer). Detects which page we
 * are on and delegates to the appropriate loader above. Honor the
 * `sb:displayGraphsInline` setting so users can opt out of inline frames.
 */
const onAppChange = async () => {
  const courseList = document.querySelector(".course-list-results");
  const courseInfo = document.querySelector("#crse-info");
  const courseSchedule = document.querySelector("#schedule-courses");

  // see if the option to disable the inline graph loading is enabled
  const displayGraphsInline = await chrome.storage.sync
    .get("settings")
    .then((result) => result.settings["sb:displayGraphsInline"]);
  if (!displayGraphsInline) return;

  // determine which page we're on and load the appropriate data.
  if (courseList) loadCourses(courseList);
  else if (courseInfo) loadCourseInfo(courseInfo);
  else if (courseSchedule) loadCourseSchedule(courseSchedule);
};


/* Initialization: observe the app container and call `onAppChange` when
 * child nodes change. The lightweight MutationObserver avoids polling.
 */
let loaded = false;
// track last scheduled courses to avoid repeated processing / logging
let _lastScheduledCoursesKey = null
let _lastScheduledCoursesTs = 0
const _SCHEDULE_DEBOUNCE_MS = 2000
const onLoad = () => {
  if (loaded) return;
  loaded = true;

  const app = document.querySelector("#app-container");

  const appObserver = new MutationObserver((mutations) => {
    onAppChange();
  });

  appObserver.observe(app, { childList: true, subtree: true });
};

window.addEventListener("load", onLoad);
// also call the onLoad function immediately; this fixes an issue in Firefox where the page loads before the script is loaded and thus the script doesn't run.
onLoad();
