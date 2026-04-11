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
  FETCH_GPA: async (request, sender, sendResponse) => {
    try {
      const response = await fetch(`https://umn.lol/api/class/${request.courseId}`);
      const json = await response.json();
      
      if (!json.success || !json.data) {
        throw new Error("No data found");
      }

      const grades = json.data.total_grades;
      const weights = {
        "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67,
        "C+": 2.33, "C": 2.0, "C-": 1.67, "D+": 1.33, "D": 1.0, "F": 0.0
      };

      let totalPoints = 0;
      let totalStudents = 0;

      for (const [grade, count] of Object.entries(grades)) {
        if (weights[grade] !== undefined) {
          totalPoints += weights[grade] * count;
          totalStudents += count;
        }
      }

      const avgGpa = totalStudents > 0 ? (totalPoints / totalStudents) : 0;
      
      // Send back the calculated GPA
      sendResponse({ success: true, avg_gpa: avgGpa });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type } = request;
  
  // Check if we have a handler for this message type
  if (RuntimeMessages[type]) {
    // If it's an async function (like FETCH_GPA), we call it and return true
    RuntimeMessages[type](request, sender, sendResponse);
    return true; 
  } else {
    console.warn(`[BG] Unknown message type: ${type}`);
  }
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