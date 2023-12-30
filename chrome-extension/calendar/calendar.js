console.log("[GG] calendar.js is loaded");

const buttonTemplate = `
<div id="gg_gcal_btn_group">
  <button id="gg_gcal_button">
    <div id="gg_icon"></div>
    Add Classes to Google Calendar
  </button>
</div>
`;

const loadingPageTemplate = `
<div id="cover-spin">
  <img src="https://umn.lol/images/icon.png"
     width="800"
     height="800"
     alt="loading icon"
  />
  
  <div class="loading-text">
    <h1>Loading Classes...</h1>
    <h2>This may take a few seconds.</h2>
  </div>
</div>
`;

/**
 * Turns template string into an actual html element
 * @param {string} html
 * @returns {HTMLElement}
 */
const htmlToElement = (html) => {
  const template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
};

//True if the myu button is already added
let ButtonIsAdded = false;

/**
 * Appends a new button on the MyU academics tab.
 */
const appendButton = () => {
  const newDiv = htmlToElement(buttonTemplate); //This is a new element node

  //A div that holds calendarDiv inside of it
  const parentDiv = document.getElementsByClassName("row")[4];

  //This is the div that contains buttons "View Calendar" "List View" and "Textbooks (UMTC)"
  const calendarDiv = document.getElementsByClassName(
    "myu_btn-group col-lg-12"
  )[0];

  if (calendarDiv != null) {
    parentDiv.insertBefore(newDiv, calendarDiv.nextSibling);

    //Apply following
    const buttons = newDiv.querySelectorAll("button");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", buttonBody); // Naively apply the event listener to all buttons
    }
    ButtonIsAdded = true;
  }
};

const openCalendarTab = async (data) => {
  await chrome.runtime.sendMessage({ type: "openCalendarTab", data: data });
};

/**
 * Function that runs on button press
 */
const buttonBody = async () => {
  const calendarDiv = document.getElementsByClassName(
    "myu_btn-group col-lg-12"
  )[0];

  const parentDiv = document.getElementsByClassName("row")[4];
  const loadingPage = htmlToElement(loadingPageTemplate);
  parentDiv.insertBefore(loadingPage, calendarDiv.nextSibling);

  let scrape;
  try {
    let currentWeek = parseDate(
      document
        .querySelector(".myu_heading-nav")
        .querySelector("h2")
        .innerText.match(/\d{2}\/\d{2}\/\d{4}/)[0],
      "mm/dd/yyyy"
    );
    console.log("[GG] Beginning scrape and download..");
    scrape = await scrapeASemester(formatDate(currentWeek, "yyyy-mm-dd"));
    // fileDownload(dataToRecurringICS(scrape));
  } catch (error) {
    console.error(error);
    alert(
      "[GG] Calendar export scraper error. Are you open to a week that doesn't have classes?"
    ); // this message doesn't display. need to edit manifest?
  } finally {
    loadingPage.remove();
  }

  console.log(dataToExportJSON(scrape));

  try {
    await openCalendarTab(dataToExportJSON(scrape));
  } catch (e) {
    console.log("Error opening calendar tab");
    console.log(e);
  } finally {
    loadingPage.remove();
  }

  // scrape = await scrapeASemester(formatDate(new Date(), "yyyy-mm-dd"))
  // console.log(scrape.coursesInfo)
  // console.log(scrape.weeks)
  // console.log(scrape)
  // c = scrape.coursesInfo[0]
  // console.log(createRecurringVEVENT(c, []))
};

const appObserver = new MutationObserver((mutations) => {
  const look = document.querySelector("div[class='myu_btn-group col-lg-12']");
  if (look) {
    if (look.parentNode.children.length < 4) {
      appendButton();
    }
  }
});

appObserver.observe(document.body, { childList: true, subtree: true });
