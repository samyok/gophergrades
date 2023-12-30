const defaultSettings = [
  {
    sectionName: "Schedule Builder",
    code: "sb",
    settings: [
      {
        name: "Display graphs inline",
        code: "displayGraphsOnline",
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

const sectionTemplate = (section, settings) => `
<div class="card">
  <h2>${section.sectionName}</h2>
  <div class="settings">
    ${section.settings
      .map((setting) => settingTemplate(section.code, setting, settings))
      .join("")}
  </div>
</div>
`;

const settingTemplate = (prefix, setting, settings) => `
<div class="setting">
  <div class="round">
    <input type="checkbox" id="${prefix}:${setting.code}" name="${prefix}:${
  setting.code
}" ${settings[prefix + ":" + setting.code] ? "checked" : ""} />
    <label for="${prefix}:${setting.code}"></label>
  </div>
  <label class="light" for="${prefix}:${setting.code}">${setting.name}</label>
</div>
`;

chrome.storage.sync.get("settings", (data) => {
  const defaultSettingCodes = defaultSettings.reduce((acc, section) => {
    section.settings.forEach((setting) => {
      acc[section.code + ":" + setting.code] = setting.value;
    });
    return acc;
  }, {});

  const settings = { ...defaultSettingCodes, ...data.settings };
  document.getElementById("settings").innerHTML = defaultSettings
    .map((section) => sectionTemplate(section, settings))
    .join("");
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", (event) => {
      const settingCode = event.target.id;
      chrome.storage.sync.get("settings", (data) => {
        const settings = {
          ...data.settings,
          [settingCode]: event.target.checked,
        };
        chrome.storage.sync.set({ settings });
      });
    });
  });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log(changes);
});

function login() {
  chrome.identity.getAuthToken({ interactive: true }, function (token) {
    console.log(token);
    if (chrome.runtime.lastError) {
      alert(chrome.runtime.lastError.message);
      return;
    }
    updateSignInStatus();
  });
}

// document.getElementById("login").addEventListener("click", login);

function updateSignInStatus() {
  chrome.identity.getAuthToken({ interactive: false }, function (token) {
    if (chrome.runtime.lastError) {
      // logged out
      // document.getElementById("logged-out").style.display = "block";
      console.warn("[GGE] " + chrome.runtime.lastError.message);
      return;
    }
    chrome.identity.getProfileUserInfo(function (userInfo) {
      console.log({ userInfo });
      // document.getElementById("logged-in").style.display = "block";
      // document.getElementById("email").innerText = userInfo.email;
    });
    console.log("[GGE] TOKEN: " + token);
  });
}

updateSignInStatus();

chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  console.log({ account, signedIn });
  updateSignInStatus();
});

document.querySelector("#version").innerText =
  chrome.runtime.getManifest().version;
