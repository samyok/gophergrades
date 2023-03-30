chrome.omnibox.onInputEntered.addListener((text) => {
  const newURL = "https://umn.lol/?ref=omni&q=" + encodeURIComponent(text);
  chrome.tabs.update({ url: newURL });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: "https://schedulebuilder.umn.edu/" });
});

const RuntimeMessages = {
  openCalendarTab: async (request) => {
    await chrome.storage.sync.set({ cal: request.data });

    await chrome.tabs.create({
      url: chrome.runtime.getURL("frontend/gcal/add.html"),
    });
  },
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type } = request;
  RuntimeMessages[type](request);
});
