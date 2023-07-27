console.log("[GG] calendar.js is loaded");

const buttonTemplate = `<div id="gcal_btn_group">
<button id = "gg_button">  </button>
<button id = "gcal_button">Export to Google Calendar</button>
<button id = "ics_button">.ics</button>
</div>`;

const loadingPageTemplate = `<div id="cover-spin">
<img src='https://umn.lol/images/icon.png' width='800' height='800' /></div>`

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
    newDiv.querySelectorAll("button")[0].addEventListener("click", buttonBody); //Naively apply the event listener to all buttons
    newDiv.querySelectorAll("button")[1].addEventListener("click", buttonBody);
    newDiv.querySelectorAll("button")[2].addEventListener("click", buttonBody);
    // newDiv.querySelectorAll("button").map(b => b.addEventListener("click", buttonBody)) // apply it to all the buttons in the div
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
                    "mm/dd/yyyy");

    console.log("[GG] Beginning scrape and download..");
    scrape = await scrapeASemester(formatDate(currentWeek, "yyyy-mm-dd"));
    // fileDownload(dataToRecurringICS(scrape));
  } catch (error) {
    console.error(error);
    alert("[GG] Calendar export scraper error. Are you open to a week that doesn't have classes?"); // this message doesn't display. need to edit manifest?
  } finally {
    loadingPage.remove();
  }
  console.log(dataToExportJSON(scrape));
  openCalendarTab(dataToExportJSON(scrape));

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
