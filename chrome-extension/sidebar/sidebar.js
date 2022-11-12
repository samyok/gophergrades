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

const htmlToElement = (html) => {
  const template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
};

const template = `
<div class="gopher-grades-container">
<iframe class="gopher-grades-result-iframe"></iframe>
</div>
`;

const prependFrame = (url, elem, direction = "prepend") => {
  if (elem.querySelector("iframe")) return;
  const frameContainer = htmlToElement(template);
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
    frame.contentWindow.postMessage({ email: getInternetId() }, "*");
  }, 1000);
};

const appendFrame = (url, elem) => prependFrame(url, elem, "append");

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

const loadCourses = (courseList) => {
  debouncedFindCourses(courseList);
  setTimeout(() => debouncedFindCourses(courseList), 200);
};

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

const onAppChange = () => {
  const courseList = document.querySelector(".course-list-results");
  const courseInfo = document.querySelector("#crse-info");
  if (courseList) loadCourses(courseList);
  else if (courseInfo) loadCourseInfo(courseInfo);
};

const onLoad = () => {
  const app = document.querySelector("#app-container");

  const appObserver = new MutationObserver((mutations) => {
    onAppChange();
  });

  appObserver.observe(app, { childList: true, subtree: true });
};

window.addEventListener("load", onLoad);
