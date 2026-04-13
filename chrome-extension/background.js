const CACHE_EXPIRATION_MS = 1000 * 60 * 60 * 24;
const GPA_WEIGHTS = {
  "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67,
  "C+": 2.33, "C": 2.0, "C-": 1.67, "D+": 1.33, "D": 1.0, "F": 0.0
};

const calculateGPA = (grades) => {
  let totalPoints = 0, totalStudents = 0;
  for (const [grade, count] of Object.entries(grades)) {
    if (GPA_WEIGHTS[grade] !== undefined) {
      totalPoints += GPA_WEIGHTS[grade] * count;
      totalStudents += count;
    }
  }
  return totalStudents > 0 ? (totalPoints / totalStudents).toFixed(2) : "N/A";
};

// change should be made in popup.js as well.
const defaultSettings = [
  {
    sectionName: "Schedule Builder",
    code: "sb",
    settings: [
      {
        name: "Display grade distribution graphs",
        code: "displayGraphsInline",
        value: true,
      },
      // {
      //   name: "Add to calendar button",
      //   code: "addToCalendarButton",
      //   value: true,
      // },
      {
        name: "Show map of classes",
        code: "showMapOfClasses",
        value: true,
      },
    ],
  },
  {
    sectionName: "MyU",
    code: "myu",
    settings: [
      {
        name: "Add to calendar button",
        code: "addToCalendarButton",
        value: true,
      },
    ],
  },
];

chrome.omnibox.onInputEntered.addListener((text) => {
  const newURL = "https://umn.lol/?ref=omni&q=" + encodeURIComponent(text);
  chrome.tabs.update({ url: newURL });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: "https://schedulebuilder.umn.edu/" });
});

const RuntimeMessages = {
  openCalendarTab: async (request) => {
    await chrome.storage.local.set({ cal: request.data });

    await chrome.tabs.create({
      url: chrome.runtime.getURL("frontend/gcal/add.html"),
    });
  },
  GET_COURSE_DATA: async (request, sender, sendResponse) => {
    const { courseId } = request;
    const cacheKey = `cache_${courseId}`;

    try {
      const cached = await chrome.storage.local.get(cacheKey);
      const now = Date.now();

      if (cached[cacheKey] && (now - cached[cacheKey].timestamp < CACHE_EXPIRATION_MS)) {
        return sendResponse(cached[cacheKey].data);
      }

      const response = await fetch(`https://umn.lol/api/class/${courseId}`);
      const json = await response.json();

      if (json.success) {
        await chrome.storage.local.set({
          [cacheKey]: { data: json, timestamp: now }
        });
      }
      sendResponse(json);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  },
  FETCH_GPA: async (request, sender, sendResponse) => {
    try {
      const response = await fetch(`https://umn.lol/api/class/${request.courseId}`);
      const json = await response.json();
      if (!json.success || !json.data) throw new Error("No data found");

      sendResponse({ success: true, avg_gpa: calculateGPA(json.data.total_grades) });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const messageType = request.action || request.type;
  
  if (RuntimeMessages[messageType]) {
    RuntimeMessages[messageType](request, sender, sendResponse);
    return true; 
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async () => {
  const defaultSettingCodes = defaultSettings.reduce((acc, section) => {
    section.settings.forEach((setting) => {
      acc[section.code + ":" + setting.code] = setting.value;
    });
    return acc;
  }, {});

  await chrome.storage.sync.set({ settings: defaultSettingCodes });
});