chrome.omnibox.onInputEntered.addListener((text) => {
  const newURL = "https://umn.lol/?ref=omni&q=" + encodeURIComponent(text);
  chrome.tabs.update({ url: newURL });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: "https://schedulebuilder.umn.edu/" });
});
