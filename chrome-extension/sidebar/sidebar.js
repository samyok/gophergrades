const BASE_URL = "https://umn.lol";

// --- HELPERS ---

const fixApasTextSpacing = (text) => {
    if (!text) return "";
    return text
        // Fix smushed words: "MATH1471" -> "MATH 1471"
        .replace(/([a-zA-Z])(\d)/g, '$1 $2') 
        // Fix "coursefrom" or "requirementwill"
        .replace(/([a-z])([A-Z])/g, '$1 $2') 
        // Ensure we don't collapse our intentional newlines into single spaces
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .join('\n') 
        .trim();
};

const nestApasData = (flatReqs) => {
    const nested = {};
    flatReqs.forEach(req => {
        const cat = req.requirementTitle || "General Requirements";
        if (!nested[cat]) {
            nested[cat] = {
                title: cat,
                status: "MET", // Default to MET, will downgrade if any sub-req is UNMET
                subReqs: []
            };
        }
        nested[cat].subReqs.push(req);
        
        // Logical "Overall Status" calculation
        if (req.status === 'UNMET') nested[cat].status = 'UNMET';
        else if (req.status === 'IP' && nested[cat].status !== 'UNMET') nested[cat].status = 'IP';
    });
    return Object.values(nested);
};

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

const openApasModal = async () => {
    const { gg_apas_unmet } = await chrome.storage.local.get(["gg_apas_unmet"]);
    if (!gg_apas_unmet) return alert("Sync APAS first!");

    // FILTER: Focus only on Major Requirements
    const majorOnly = gg_apas_unmet.filter(req => {
        const title = req.requirementTitle.toLowerCase();
        const subTitle = req.title.toLowerCase();
        
        // Exclude broad university/administrative bookkeeping
        const isJunk = /credits|gpa|minimum|total|resident|withdrawn|degree-applicable|elective/i.test(subTitle) || 
                       /degree|university/i.test(title);
        
        return !isJunk;
    });

    const nestedCategories = nestApasData(majorOnly);
    renderCategoryGrid(nestedCategories);
};

const renderCategoryGrid = (categories) => {
    let overlay = document.getElementById('apas-modal');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = "apas-modal";
        overlay.className = "gopher-grades-modal-overlay";
        document.body.appendChild(overlay);
    }
    
    // Tier 1 cards now use the vertical list style
    const cards = categories.map((cat, i) => {
        const isDone = cat.status === 'MET';
        return `
            <div class="gopher-grades-req-card status-${cat.status.toLowerCase()}" data-idx="${i}">
                <h3 class="req-title">${fixApasTextSpacing(cat.title)}</h3>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 11px; font-weight: 800; color: ${isDone ? 'var(--status-met)' : 'var(--status-unmet)'}">
                        ${cat.status}
                    </span>
                    <span style="color: #ccc; font-size: 18px;">&rsaquo;</span>
                </div>
            </div>
        `;
    }).join('');

    // Updated structure: Close button is now INSIDE the header
    overlay.innerHTML = `
        <div class="gopher-grades-modal-window">
            <div class="modal-header-main">
                <span>〽️ MAJOR REQUIREMENTS</span>
                <button id="close-apas" class="modal-close-btn" title="Close">✕</button>
            </div>
            <div class="modal-scroll-area">
                <div class="apas-section-grid">
                    ${cards}
                </div>
            </div>
        </div>
    `;
    
    // Bind listeners
    overlay.querySelector('#close-apas').onclick = () => overlay.remove();
    
    overlay.querySelectorAll('.gopher-grades-req-card').forEach(card => {
        card.onclick = () => {
            const categoryData = categories[card.dataset.idx];
            // Ensure we pass the overlay reference forward
            renderSubReqList(categoryData, overlay);
        };
    });
};

const renderSubReqList = (category, overlay) => {
    const cards = category.subReqs.map((sub, i) => {
        const isDone = sub.status === 'MET' || sub.status === 'IP';

        return `
            <div class="gopher-grades-sub-card status-${sub.status.toLowerCase()}" 
                 data-idx="${i}" 
                 style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin-bottom: 10px; background: white; border: 1px solid #ddd; border-left: 5px solid ${isDone ? '#2e7d32' : '#c62828'}; border-radius: 4px; cursor: pointer; transition: transform 0.1s;">
                
                <div style="display: flex; align-items: center; gap: 5px; flex: 1;">
                    <h4 style="margin: 0; font-size: 14px; color: #333; font-weight: 600;">${sub.title}</h4>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; margin-left: 15px;">
                    <span style="font-size: 11px; font-weight: 800; color: ${isDone ? '#2e7d32' : '#c62828'}">${sub.status}</span>
                    <span style="color: #ccc; font-size: 18px;">&rsaquo;</span>
                </div>
            </div>
        `;
    }).join('');

    overlay.querySelector('.modal-scroll-area').innerHTML = `
        <div class="nav-breadcrumb" style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
            <button id="back-to-cats" class="back-btn" style="background: #eee; border: 1px solid #ccc; padding: 5px 12px; border-radius: 4px; cursor: pointer;">← All Categories</button>
            <span class="nav-label" style="font-weight: 800; color: #7a0019; text-transform: uppercase; font-size: 12px;">${category.title}</span>
        </div>
        <div class="apas-sub-list-container" style="display: flex; flex-direction: column;">
            ${cards}
        </div>
    `;

    // Listeners
    overlay.querySelector('#back-to-cats').onclick = () => openApasModal();
    
    overlay.querySelectorAll('.gopher-grades-sub-card').forEach(card => {
        card.onclick = () => renderCourseDetail(category.subReqs[card.dataset.idx], category, overlay);
    });
};

const renderCourseDetail = (subReq, category, overlay) => {
    const isDone = subReq.status === 'MET' || subReq.status === 'IP';
    
    const courses = subReq.options.map(opt => {
        const courseId = `${opt.dept}${opt.num}`;
        return `
          <div class="course-option-row" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: white; border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <div class="course-identity" style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                      <strong style="color: var(--umn-maroon); font-size: 16px;">${opt.dept} ${opt.num}</strong>
                      <span id="gpa-${courseId}" style="font-size: 11px; font-weight: 800; color: #888; background: #f0f0f0; padding: 1px 6px; border-radius: 4px;">...</span>
                  </div>
                  <span id="name-${courseId}" style="font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; font-style: italic;">Loading title...</span>
              </div>
              <button class="view-course-btn" 
                  data-url="https://schedulebuilder.umn.edu/explore/2026Spring/${opt.dept}/${opt.num}/">
                  ${isDone ? 'VIEW' : 'EXPLORE'}
              </button>
          </div>
      `}).join('');

    overlay.querySelector('.modal-scroll-area').innerHTML = `
        <div class="nav-breadcrumb" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
            <button id="back-to-subreqs" class="back-btn">← BACK</button>
            <div class="header-titles">
                <small style="color: #7a0019; font-weight: 800; text-transform: uppercase; font-size: 10px; display: block;">
                    ${fixApasTextSpacing(category.title)}
                </small>
                <strong style="font-size: 16px; color: #333;">${subReq.title}</strong>
            </div>
        </div>
        
        <div class="apas-info-panel" style="background: #fffde7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #fff59d; border-left: 4px solid var(--umn-gold);">
            <div style="display: flex; justify-content: flex-start; align-items: center; margin-bottom: ${subReq.description ? '10px' : '0'};">
                <span style="font-weight: 800; font-size: 12px; color: ${isDone ? '#2e7d32' : '#c62828'}">${subReq.status}</span>
            </div>
            
            ${subReq.description ? `
                <div class="req-description-box" style="font-size: 12px; line-height: 1.5; color: #5d4037; white-space: pre-line;">
                    ${fixApasTextSpacing(subReq.description)}
                </div>
            ` : ''}
        </div>

        <div class="course-section">
            <div style="font-weight: 800; font-size: 10px; margin-bottom: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">
                ${isDone ? 'Fulfilled By' : 'Available Options'}
            </div>
            <div class="course-list-container">${courses}</div>
        </div>
    `;

    subReq.options.forEach((opt, index) => {
        const courseId = `${opt.dept}${opt.num}`;
        
        // Staggered execution (0ms, 50ms, 100ms...)
        setTimeout(() => {
            chrome.runtime.sendMessage({ action: "GET_COURSE_DATA", courseId }, (json) => {
                if (chrome.runtime.lastError || !json || !json.success) {
                    const nameEl = document.getElementById(`name-${courseId}`);
                    if (nameEl) nameEl.innerText = "Data unavailable";
                    return;
                }

                // Update Name
                const nameEl = document.getElementById(`name-${courseId}`);
                if (nameEl) {
                    nameEl.innerText = json.data.class_desc || "Title unavailable";
                    nameEl.style.fontStyle = "normal";
                }

                // Calculate GPA
                const grades = json.data.total_grades;
                const weights = { "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67, "C+": 2.33, "C": 2.0, "C-": 1.67, "D+": 1.33, "D": 1.0, "F": 0.0 };
                let pts = 0, count = 0;
                Object.entries(grades).forEach(([grade, n]) => {
                    if (weights[grade] !== undefined) { pts += weights[grade] * n; count += n; }
                });

                const avg = count > 0 ? (pts / count).toFixed(2) : "N/A";
                const gpaEl = document.getElementById(`gpa-${courseId}`);
                if (gpaEl) {
                    gpaEl.innerText = `${avg} GPA`;
                    gpaEl.style.color = avg >= 3.3 ? "#2e7d32" : (avg < 2.8 ? "#c62828" : "#888");
                }
            });
        }, index * 50); 
    });

    // Listeners
    overlay.querySelector('#back-to-subreqs').onclick = () => renderSubReqList(category, overlay);
    overlay.querySelectorAll('.view-course-btn').forEach(btn => {
        btn.onclick = () => window.open(btn.dataset.url, '_blank');
    });
};

const injectApasFab = () => {
    if (document.getElementById('apas-fab')) return;
    const fab = document.createElement('div');
    fab.id = 'apas-fab';
    fab.className = 'gopher-grades-fab'; // Ensure this class is in your CSS
    fab.innerHTML = '〽️';
    fab.title = "Open APAS Explorer";
    fab.onclick = openApasModal; // Correct function name
    document.body.appendChild(fab);
};

const performGPASort = async () => {
  const resultsContainer = document.querySelector('.course-list-results > div');
  const coursePanels = Array.from(resultsContainer.querySelectorAll('.panel-default'));
  const sortBtn = document.getElementById('gg-do-sort');

  if (coursePanels.length === 0) return;

  sortBtn.innerText = "⏳ Fetching...";
  sortBtn.disabled = true;

  try {
    const sortedData = await Promise.all(coursePanels.map(async (panel) => {
        const header = panel.querySelector('.panel-heading h3')?.innerText || "";
        const match = header.match(/([A-Z]{2,4})\s?(\d{4}[A-Z]?)/i);
        
        let gpa = 0;
        if (match) {
            const courseId = (match[1] + match[2]).toUpperCase();
            
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: "FETCH_GPA", courseId }, (res) => {
                    // If there's an error in the background script, this might be undefined
                    if (chrome.runtime.lastError) {
                        console.error("Message Error:", chrome.runtime.lastError);
                        resolve(null);
                    } else {
                        resolve(res);
                    }
                });
            });

            console.log(`[GG Debug] API Result for ${courseId}:`, response);

            if (response && response.success) {
                gpa = response.avg_gpa; // This is the value we just calculated in background.js
                console.log(`[GG Sort] ${courseId} GPA: ${gpa.toFixed(2)}`);
            }
        }
        return { panel, gpa };
    }));

    sortedData.sort((a, b) => b.gpa - a.gpa);
    sortedData.forEach(item => resultsContainer.appendChild(item.panel));

    sortBtn.innerText = "✅ Sorted";
    sortBtn.style.background = "#2e7d32";
  } catch (err) {
    sortBtn.innerText = "❌ Error";
  } finally {
    sortBtn.disabled = false;
  }
};

/**
 * UI Injection
 * Adds the sort bar to the top of the results list
 */
const injectSortTool = () => {
  const resultsContainer = document.querySelector('.course-list-results > div');
  if (!resultsContainer || document.getElementById('gg-sort-bar')) return;

  const sortBar = document.createElement('div');
  sortBar.id = 'gg-sort-bar';
  sortBar.style = `
    margin-bottom: 15px; padding: 12px; background: #fff8e1; 
    border: 1px solid #ffcc33; border-radius: 8px; display: flex; 
    justify-content: space-between; align-items: center;
  `;

  sortBar.innerHTML = `
    <div style="font-family: sans-serif;">
        <strong style="color: #7a0019; font-size: 13px;">📊 GPA Ranker</strong>
        <span style="display:block; font-size: 10px; color: #666;">Sort results by historical difficulty</span>
    </div>
    <button id="gg-do-sort" style="background: #7a0019; color: #ffcc33; border: none; padding: 8px 16px; border-radius: 5px; font-weight: bold; cursor: pointer;">
        Sort High to Low
    </button>
  `;

  resultsContainer.prepend(sortBar);
  document.getElementById('gg-do-sort').onclick = performGPASort;
};

const onAppChange = async () => {
  injectApasFab();

  const courseList = document.querySelector(".course-list-results");
  const courseInfo = document.querySelector("#crse-info");
  const courseSchedule = document.querySelector("#schedule-courses");

  // see if the option to disable the inline graph loading is enabled
  const displayGraphsInline = await chrome.storage.sync
    .get("settings")
    .then((result) => result.settings["sb:displayGraphsInline"]);
  if (!displayGraphsInline) return;

  // determine which page we're on and load the appropriate data.
  if (courseList) {
      injectSortTool();
      loadCourses(courseList);
  }
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
