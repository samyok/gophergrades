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

// Begin code for sorting course list

// dropdown element
const dropdownTemplate = `
<div style="display: inline-block; margin-left: -20px; margin-right: 5px;">
  <select class="size-dropdown" style="border-color: #ccc; border-radius: 3px; height: 34px; transform: translateY(3%); font-size: 14px; padding: 6px 12px;">
    <option value="sortCourseCodeAsc">Sort By Course # (Default)</option>
    <option value="sortSeatsAvailDes">Sort By Seats Available</option>
    <option value="sortMostCommonGradeDes">Sort By Most-Common A Grade</option>
    <option value="sortPopularityDes">Sort By Popularity</option>
    <option value="sortUnitsDes">Sort By Units</option>
  </select>
</div>
`;

// handle sorting options
const handleDropdownChange = (event) => {
  var selectedValue = event.target.value;
  console.log("my choice: " + selectedValue);

  if (selectedValue === "sortCourseCodeAsc") {
    location.reload();
  }
  if (selectedValue === "sortSeatsAvailDes") {
    const buttons = document.querySelectorAll('.action-sections.btn.btn-default');    
    buttons.forEach(button => button.click());
    setTimeout(sortBySeatsAvailable, 1000);
  }
  if (selectedValue === "sortMostCommonGradeDes") {
    sortByMostCommonGrade();
  }
  if (selectedValue === "sortPopularityDes") {
    sortByPopularity();
  }
  if (selectedValue === "sortUnitsDes") {
    sortByUnits();
  }
  // expand with more below...
};

const sortBySeatsAvailable = () => {
  // Looks like { "CSCI4011":26, "CSCI4041":37 ... }
  const courseSizeDict = {};

  // Get the main container with class 'course-list-results'
  let courseListResults = document.querySelector('.course-list-results');
  let courseDivs = Array.from(courseListResults.firstElementChild.children);

  for (let courseDiv of courseDivs) {
    // Get name of course
    let courseName = courseDiv.querySelector('a').getAttribute('name');
    
    // Get seats available value
    let targetDiv = courseDiv.querySelector('div:nth-child(2) > div:nth-child(3)');
    let trElements = targetDiv.querySelectorAll('tr');
    
    let sum = 0;
    trElements.forEach(tr => {
      let lastChildText = tr.lastElementChild.innerText;
      sum += parseFloat(extractDifference(lastChildText)) || 0; // Ensure the text is converted to a number
    });
    
    courseSizeDict[courseName] = sum;
  }

  // sort the courseDivs in the order we want
  courseDivs.sort((a, b) => {
    let nameA = a.querySelector('a').getAttribute('name');
    let nameB = b.querySelector('a').getAttribute('name');
    return courseSizeDict[nameB] - courseSizeDict[nameA];
  });

  console.log("Sorted Seats Dict: ", courseSizeDict); // For debugging purposes, display the updated dictionary
  console.log("Sorted Seats Course Divs: ", courseDivs); // For debugging purposes, display the updated divs

  // remove all the courses to add our own ordering of the courses
  courseListResults.firstElementChild.innerHTML = '';
  courseDivs.forEach(courseDiv => {
    courseListResults.firstElementChild.appendChild(courseDiv);
  });

  // click all the 'hide' buttons
  const buttons2 = document.querySelectorAll('.action-sections.btn.btn-default.pull-right');
  buttons2.forEach(button => button.click());

  // ensure this value is selected
  document.querySelector('.size-dropdown').value = 'sortSeatsAvailDes';
};

// Helper function to determine seats available
function extractDifference(text) {
  let matches = text.match(/(\d+)\s+of\s+(\d+)/g);
  let totalDifference = 0;
  
  if (matches) {
    matches.forEach(match => {
      let parts = match.match(/(\d+)\s+of\s+(\d+)/);
      let current = parseInt(parts[1]);
      let total = parseInt(parts[2]);
      totalDifference += (total - current);
    });
  }
  return totalDifference;
}

const sortByMostCommonGrade = () => {
  let courseMostCommonGradeDict = {};

  // Get the main container with class 'course-list-results'
  let courseListResults = document.querySelector('.course-list-results');
  let courseDivs = Array.from(courseListResults.firstElementChild.children);

  // Array to hold all fetch promises
  let fetchPromises = [];

  for (let courseDiv of courseDivs) {
    let courseName = courseDiv.querySelector('a').getAttribute('name');

    // Push the fetch promise into the array
    let fetchPromise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'umnlolApiResponseJson', url: window.location.href, courseName: courseName }, response => {
        // If the response is consistently unsuccessful or there's no data
        // Check background.js and ctrl+f for 'umnlolApiResponseJson'
        // That is where I handled the request
        
        if (response.success && response.data) {
          let totalStudents = response.data.total_students;
          let totalGrades = response.data.total_grades;
          let numberOfAs = totalGrades["A"];
          let val = (numberOfAs / totalStudents) * 100;
          console.log(`Percentage of A's for ${courseName}: ${val}%`);

          // Store the calculated percentage in the dictionary
          courseMostCommonGradeDict[courseName] = val;
        } else {
          courseMostCommonGradeDict[courseName] = 0;
        }
        resolve(); // Resolve the promise once processing is done
      });
    });

    fetchPromises.push(fetchPromise);
  }

  // Wait for all fetch promises to resolve
  Promise.all(fetchPromises)
    .then(() => {
      // Once all promises have resolved (fetch requests are complete and data is populated), sort courseDivs
      courseDivs.sort((a, b) => {
        let nameA = a.querySelector('a').getAttribute('name');
        let nameB = b.querySelector('a').getAttribute('name');
        return courseMostCommonGradeDict[nameB] - courseMostCommonGradeDict[nameA];
      });

      console.log("Most Common Grade Dict: ", courseMostCommonGradeDict); // For debugging purposes, display the updated dictionary
      console.log("Sorted Most Common Grade Course Divs: ", courseDivs); // For debugging purposes, display the updated divs

      // Clear and update the course list results
      courseListResults.firstElementChild.innerHTML = '';
      courseDivs.forEach(courseDiv => {
        courseListResults.firstElementChild.appendChild(courseDiv);
      });

      // Set dropdown value after sorting
      document.querySelector('.size-dropdown').value = 'sortMostCommonGradeDes';
    })
    .catch(error => {
      console.error('Error fetching course data:', error);
    });
};


// NOTE: the rest of the functions follow very similar code from the last two.
// The first one is to build dictionaries from information that is already on the schedule builder page (eg. seats available, course units)
// The second one is to build dictionaries from information using an API (eg. popularity, most-common grade)
// Refer to them if you are confused about something


const sortByPopularity = () => {
  let coursePopularityDict = {};

  // Get the main container with class 'course-list-results'
  let courseListResults = document.querySelector('.course-list-results');
  let courseDivs = Array.from(courseListResults.firstElementChild.children);

  // Array to hold all fetch promises
  let fetchPromises = [];

  for (let courseDiv of courseDivs) {
    let courseName = courseDiv.querySelector('a').getAttribute('name');

    // Push the fetch promise into the array
    let fetchPromise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'umnlolApiResponseJson', url: window.location.href, courseName: courseName }, response => {
        if (response.success && response.data) {
          let totalStudents = response.data.total_students;
          coursePopularityDict[courseName] = totalStudents;
        } else {
          coursePopularityDict[courseName] = 0;
        }
        resolve(); // Resolve the promise once processing is done
      });
    });

    fetchPromises.push(fetchPromise);
  }

  // Wait for all fetch promises to resolve
  Promise.all(fetchPromises)
    .then(() => {
      // Once all promises have resolved (fetch requests are complete and data is populated), sort courseDivs
      courseDivs.sort((a, b) => {
        let nameA = a.querySelector('a').getAttribute('name');
        let nameB = b.querySelector('a').getAttribute('name');
        return coursePopularityDict[nameB] - coursePopularityDict[nameA];
      });

      console.log("Most Common Grade Dict: ", coursePopularityDict); // For debugging purposes, display the updated dictionary
      console.log("Sorted Most Common Grade Course Divs: ", courseDivs); // For debugging purposes, display the updated divs

      // Clear and update the course list results
      courseListResults.firstElementChild.innerHTML = '';
      courseDivs.forEach(courseDiv => {
        courseListResults.firstElementChild.appendChild(courseDiv);
      });

      // Set dropdown value after sorting
      document.querySelector('.size-dropdown').value = 'sortPopularityDes';
    })
    .catch(error => {
      console.error('Error fetching course data:', error);
    });
};


const sortByUnits = () => {
  const courseUnitsDict = {};

  // Get the main container with class 'course-list-results'
  let courseListResults = document.querySelector('.course-list-results');
  let courseDivs = Array.from(courseListResults.firstElementChild.children);

  for (let courseDiv of courseDivs) {
    let courseName = courseDiv.querySelector('a').getAttribute('name');
    
    // Navigate to the correct div
    let targetDiv = courseDiv.querySelector('div:nth-child(2) > div:nth-child(2)').children;
    let trElements = targetDiv[targetDiv.length - 2];

    myCleanText = trElements.innerHTML.trim().replace(/\s+/g, '');
    numberMatch = (myCleanText.match(/(\d+(\.\d+)?)/));

    if (numberMatch) {
      console.log(parseFloat(numberMatch[0])); // Output: 2
      courseUnitsDict[courseName] = parseFloat(numberMatch[0]);
    } else {
      // No number found
      courseUnitsDict[courseName] = 0;
    }
    
    
  }

  courseDivs.sort((a, b) => {
    let nameA = a.querySelector('a').getAttribute('name');
    let nameB = b.querySelector('a').getAttribute('name');
    return courseUnitsDict[nameB] - courseUnitsDict[nameA];
  });

  console.log("Course Units Dict: ", courseUnitsDict); // For debugging purposes, display the updated dictionary
  console.log("Sorted Units Course Divs: ", courseDivs); // For debugging purposes, display the updated divs

  courseListResults.firstElementChild.innerHTML = '';
  courseDivs.forEach(courseDiv => {
      courseListResults.firstElementChild.appendChild(courseDiv);
  });

  document.querySelector('.size-dropdown').value = 'sortUnitsDes';
};

// end sorting feature



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

const loadDropdown = () => {
  const courseListOptions = document.querySelector(".course-list-options");
  const emptyDiv = courseListOptions.firstElementChild;
  const dropdownElement = htmlToElement(dropdownTemplate);
  const firstDiv = emptyDiv.firstElementChild;
  emptyDiv.insertBefore(dropdownElement, firstDiv);
};

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

  var courseSortDropdown = document.querySelector('.size-dropdown');
  if (courseSortDropdown) {
    courseSortDropdown.addEventListener('change', handleDropdownChange);
  } else {
    console.log("Course-sort dropdown not found for whatever reason. This feature will not work.");
  }

  if (!courseSortDropdown) loadDropdown();
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
