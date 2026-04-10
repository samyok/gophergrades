const BASE_URL = "https://umn.lol";

const injectApasStyles = () => {
    if (document.getElementById('gg-apas-styles')) return;
    const style = document.createElement('style');
    style.id = 'gg-apas-styles';
    style.textContent = `
        .gg-modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:20000; display:flex; justify-content:center; align-items:center; }
        .gg-modal-window { background:white; width:85%; max-width:900px; max-height:85vh; border-radius:10px; display:flex; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: sans-serif; }
        .gg-modal-header { padding:15px 20px; border-bottom:2px solid #7a0019; display:flex; justify-content:space-between; align-items:center; }
        .gg-modal-body { padding:20px; overflow-y:auto; flex-grow:1; background:#f9f9f9; }
        .gg-req-card { background:white; border:1px solid #ddd; border-top:5px solid #ffcc33; padding:15px; border-radius:6px; cursor:pointer; }
        .gg-req-card:hover { background:#f0f0f0; }
        .gg-course-card { background:white; border:1px solid #eee; border-left:8px solid #7a0019; padding:15px; border-radius:6px; margin-bottom:10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .gg-btn-view { display:block; text-align:center; background:#7a0019; color:white; text-decoration:none; padding:8px; border-radius:4px; font-weight:bold; font-size:12px; margin-top:10px; }
        @keyframes gg-spin { to { transform: rotate(360deg); } }
        .gg-loader { border:4px solid #f3f3f3; border-top:4px solid #7a0019; border-radius:50%; width:30px; height:30px; animation: gg-spin 1s linear infinite; margin:20px auto; }
        .gg-status-met { border-top-color: #2e7d32 !important; color: #2e7d32; }
        .gg-status-unmet { border-top-color: #d32f2f !important; color: #d32f2f; }
        .gg-status-ip { border-top-color: #ed6c02 !important; color: #ed6c02; }

        .gg-req-card { 
            background: white; 
            border: 1px solid #ddd; 
            border-top: 5px solid #ffcc33; /* Default Yellow */
            padding: 15px; 
            border-radius: 6px; 
            cursor: pointer; 
            transition: transform 0.1s ease;
        }
        .gg-req-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    `;
    document.head.appendChild(style);
};
injectApasStyles();

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
    ?.innerText.match(/\((.+)\)/);
  if (matches?.length > 1) internetId = matches[1];
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
<iframe class="gopher-grades-result-iframe" referrerpolicy="unsafe-url"></iframe>
</div>
`;

const iframePortalTemplate = (iframeId, courseName) => `
<div class="gopher-grades-portal" id="${iframeId}">
<h3 class="portal-label">${courseName}</h3>
</div>
`;

const apasTriggerTemplate = `
<div id="gg-apas-trigger" class="list-group-item" style="cursor: pointer; background: #fff8e1; border-left: 5px solid #ffcc33; font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between;">
    <span style="color: #7a0019;">〽️ Degree Requirements (APAS)</span>
    <span style="color: #7a0019;">&rsaquo;</span>
</div>
`;

const appendPortal = (iframeId, target, courseName) => {
  const alreadyExists = document.querySelector(`#${iframeId}`);
  if (alreadyExists) return alreadyExists;
  const portal = htmlToElement(iframePortalTemplate(iframeId, courseName));
  target.append(portal);
  return portal;
};

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
    frame.contentWindow.postMessage({ email: getInternetId() }, "*");
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
  const courses = Array.from(
    document.querySelectorAll("#schedule-courses tr:has(h4)")
  ).map((tr) => ({
    courseId: tr.innerText.trim().split(":")[0]?.replaceAll(" ", ""),
    courseName: tr.innerText.trim(),
    tr,
  }));

  console.log("[GG] scheduled courses", courses);
  for (let i = 0; i < courses.length; i++) {
    const { courseId, courseName } = courses[i];
    const iframeTarget = document.querySelector("#app-main .col-xs-12");
    const portal = appendPortal(courseId, iframeTarget, courseName);
    const url = `${BASE_URL}/class/${courseId}?static=all`;
    appendFrame(url, portal);
  }
};

const COURSE_SERVICE = {
    fetchCourse: async (dept, num) => {
        const payload = new URLSearchParams({
            type: 'param_search', institution: 'UMNTC', campus: 'UMNTC', term: '1263',
            json: JSON.stringify([{ "param": "subject", "value": dept }, { "param": "number", "value": num }])
        });
        try {
            const res = await fetch('https://schedulebuilder.umn.edu/api.php', {
                method: 'POST', body: payload, headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await res.json();
            return data && data.length > 0 ? data[0] : null;
        } catch (e) { return null; }
    }
};

const renderApasExplorer = async () => {
    const { gg_apas_unmet, gg_apas_completed } = await chrome.storage.local.get(["gg_apas_unmet", "gg_apas_completed"]);
    if (!gg_apas_unmet) return alert("Please sync APAS first!");

    const overlay = document.createElement('div');
    overlay.id = "gg-apas-overlay";
    overlay.className = "gg-modal-overlay";
    overlay.innerHTML = `
        <div class="gg-modal-window">
            <div class="gg-modal-header">
                <h3 style="margin:0; color:#7a0019;">〽️ APAS Explorer</h3>
                <button id="gg-close" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            <div id="gg-content" class="gg-modal-body"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const content = overlay.querySelector('#gg-content');

    const showGrid = () => {
        content.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:15px;">
                ${gg_apas_unmet.map((req, i) => {
                    // Determine class based on status
                    let statusClass = 'gg-status-unmet';
                    if (req.status === 'MET') statusClass = 'gg-status-met';
                    if (req.status === 'IP') statusClass = 'gg-status-ip';

                    return `
                        <div class="gg-req-card ${statusClass}" data-idx="${i}">
                            <div style="font-size: 10px; color: #999; font-weight: bold; text-transform: uppercase;">
                                ${req.requirementTitle || 'General'}
                            </div>
                            <div style="font-weight: bold; margin-top: 5px; color: #333;">${req.title}</div>
                            <div style="margin-top: 10px; font-size: 11px; font-weight: bold;">
                                ${req.status === 'MET' ? '✅ MET' : (req.status === 'IP' ? '⏳ IN-PROGRESS' : '❌ NOT MET')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>`;
        
        content.querySelectorAll('.gg-req-card').forEach(c => {
            c.onclick = () => showCourses(gg_apas_unmet[c.dataset.idx]);
        });
    };

    const showCourses = async (req) => {
        content.innerHTML = `<div class="gg-loader"></div><p style="text-align:center;">Finding sections for ${req.title}...</p>`;
        const results = await Promise.all(req.options.map(o => COURSE_SERVICE.fetchCourse(o.dept, o.num)));
        
        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:10px; border-bottom:1px solid #eee;">
                <button id="gg-back" style="cursor:pointer; padding:5px 10px;">&larr; Back</button>
                <h4 style="margin:0; color:#7a0019;">${req.title}</h4>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:15px;">
                ${req.options.map((o, i) => {
                    const done = (gg_apas_completed || []).includes((o.dept+o.num).toUpperCase());
                    const live = results[i];
                    
                    return `
                        <div class="gg-course-card" style="border-left: 8px solid ${done ? '#2e7d32' : '#d32f2f'}">
                            <div style="display:flex; justify-content:space-between; align-items: center;">
                                <strong style="font-size: 15px;">${o.dept} ${o.num}</strong>
                                <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${done ? '#e8f5e9' : '#ffebee'}; color: ${done ? '#2e7d32' : '#d32f2f'};">
                                    ${done ? 'COMPLETED' : 'NEEDED'}
                                </span>
                            </div>
                            <div style="font-size: 12px; color: #666; margin: 8px 0;">
                                ${live ? `🟢 ${live.sections?.length} sections available` : '⚪ Not offered this term'}
                            </div>
                            <a href="https://schedulebuilder.umn.edu/explore/2026Spring/${o.dept}/${o.num}" class="gg-btn-view">
                                View Schedule
                            </a>
                        </div>
                    `;
                }).join('')}
            </div>`;
        
        content.querySelector('#gg-back').onclick = showGrid;
        
        content.querySelectorAll('.gg-btn-view').forEach(a => {
            a.onclick = () => setTimeout(() => document.getElementById('gg-apas-overlay').remove(), 150);
        });
    };

    overlay.querySelector('#gg-close').onclick = () => overlay.remove();
    showGrid();
};

const injectApasTrigger = () => {
    const sidebar = document.querySelector('.list-group.visible-lg.visible-md');
    if (!sidebar || document.getElementById('gg-apas-trigger')) return;

    const trigger = htmlToElement(apasTriggerTemplate);
    
    trigger.onclick = () => {
        console.log("[GG] APAS Trigger Clicked");
        if (typeof renderApasExplorer === "function") {
            renderApasExplorer();
        }
    };

    sidebar.prepend(trigger);
};

const onAppChange = async () => {
  injectApasTrigger();

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

let loaded = false;
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
