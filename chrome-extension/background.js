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
};

chrome.runtime.onInstalled.addListener(async () => {
  const defaultSettingCodes = defaultSettings.reduce((acc, section) => {
    section.settings.forEach((setting) => {
      acc[section.code + ":" + setting.code] = setting.value;
    });
    return acc;
  }, {});

  await chrome.storage.sync.set({ settings: defaultSettingCodes });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "umnlolApiResponseJson") {
    // Handle JSON message type with a GET request
    fetch(`https://umn.lol/api/class/${message.courseName}?url=${encodeURIComponent(message.url)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    }).then(res => {
      sendResponse(res); // Send response back to the sender
    }).catch(error => {
      console.error('Error fetching data:', error);
      sendResponse({ error: 'Error fetching data' }); // Send an error response
    });

    // Return true to indicate that sendResponse will be called asynchronously
    return true;
  } else {
    // Handle other message types if necessary
    const { type } = message;
    RuntimeMessages[type](message); // Assuming RuntimeMessages is defined elsewhere
  }
});
