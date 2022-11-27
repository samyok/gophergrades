const BASE_URL = "https://umn.lol";

console.log("sidebar grades is loaded :)");

// listen for messages from iframes
window.addEventListener("message", (event) => {
  console.log("[GG] received message from iframe", event);
  if (event.data?.url) {
    // open the url in a new tab
    return window.open(event.data.url, "_blank");
  }
});

// a debounce function to prevent the findCourses function from being called too many times
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

let internetId;

// get email so we can follow up on bug reports
const getInternetId = () => {
  if (internetId) return internetId;
  const matches = document
    .querySelector("[href='/logout.php']")
    .innerText.match(/\((.+)\)/);
  if (matches.length > 1) internetId = matches[1];
  return internetId;
};

// code to turn template string into an actual html element
const htmlToElement = (html) => {
  const template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
};

const iframeTemplate = `
<div class="gopher-grades-container">
<iframe class="gopher-grades-result-iframe"></iframe>
</div>
`;

const iframePortalTemplate = (iframeId, courseName) => `
<div class="gopher-grades-portal" id="${iframeId}">
<h3 class="portal-label">${courseName}</h3>
</div>
`;

const appendPortal = (iframeId, target, courseName) => {
  const alreadyExists = document.querySelector(`#${iframeId}`);
  if (alreadyExists) return alreadyExists;
  const portal = htmlToElement(iframePortalTemplate(iframeId, courseName));
  target.append(portal);
  return portal;
}

// code to add the iframe to the page
const prependFrame = (url, elem, direction = "prepend") => {
  if (elem.querySelector("iframe")) return;
  const frameContainer = htmlToElement(iframeTemplate);
  console.log("[GG] frameContainer", frameContainer);
  const frame = frameContainer.querySelector("iframe");
  frame.src = url.replace(/ /g, "");
  elem[direction](frameContainer);
  let interval = setInterval(() => {
    console.log("[GG] sending message to iframe");
    if (!frame.contentWindow) {
      clearInterval(interval);
      return;
    }
    frame.contentWindow.postMessage({email: getInternetId()}, "*");
  }, 1000);
};

// if we need to go the other way, we can use this function (append instead of prepend)
const appendFrame = (url, elem) => prependFrame(url, elem, "append");

// find courses in the course list
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

// if we're on the course list page (search), load the courses
const loadCourses = (courseList) => {
  debouncedFindCourses(courseList);
  setTimeout(() => debouncedFindCourses(courseList), 200);
};

// if we're on the course info page, load the course with all the professors and sections
const loadCourseInfo = (courseInfo) => {
  const courseTitle = courseInfo.querySelector("h2");
  const courseId = courseTitle.innerText.split(":")[0];

  console.log("[GG] course info loaded", courseId);

  const url = `${BASE_URL}/class/${courseId}?static=all`;
  appendFrame(url, courseInfo);

  // load all panels
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

// if we're on a built schedule, load the schedule
const loadCourseSchedule = (courseSchedule) => {
  const courses = Array.from(document.querySelectorAll("#schedule-courses tr:has(h4)"))
    .map(tr =>
      ({
        courseId: tr.innerText
          .trim()
          .split(":")[0]
          ?.replaceAll(" ", ""),
        courseName: tr.innerText.trim(),
        tr
      })
    );

  console.log("[GG] scheduled courses", courses);
  for (let i = 0; i < courses.length; i++) {
    const {courseId, courseName} = courses[i];
    const iframeTarget = document.querySelector("#app-main .col-xs-12");
    const portal = appendPortal(courseId, iframeTarget, courseName);
    const url = `${BASE_URL}/class/${courseId}?static=all`;
    appendFrame(url, portal);
  }
}

const onAppChange = () => {
  const courseList = document.querySelector(".course-list-results");
  const courseInfo = document.querySelector("#crse-info");
  const courseSchedule = document.querySelector("#schedule-courses");

  // determine which page we're on and load the appropriate data.
  if (courseList) loadCourses(courseList);
  else if (courseInfo) loadCourseInfo(courseInfo);
  else if (courseSchedule) loadCourseSchedule(courseSchedule);
};

const onLoad = () => {
  const app = document.querySelector("#app-container");

  const appObserver = new MutationObserver((mutations) => {
    onAppChange();
  });

  appObserver.observe(app, {childList: true, subtree: true});
};

window.addEventListener("load", onLoad);
