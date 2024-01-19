/**
 * where the bulk of event handling/DOM manipulation happens
 * 
 * uses util.js and apiapi.js to present plotter feature to the webpage
 */

(function() {
  let plotterUIPresented = chrome.storage.sync.get("settings").then((result) => result.settings["sb:showMapOfClasses"])

  let schedulePresented = false
  let plotterPresented = false

  let daySelected = "Monday"

  /**
   * updates the UI to match the current state of the page
   *
   * this is where all the decisions on when to refresh different components are
   * made:
   *    UI creation
   *    UI updates
   *
   * @param mutations{MutationRecord[]} mutations from MutationObserver
   */
  async function onChange(mutations) {
    if (!await plotterUIPresented) return;

    const schedule = document.querySelector("#schedule-main");

    //create elements if change is detected
    if (schedule !== schedulePresented) {
      schedulePresented = schedule
      if (schedule) {
        console.debug("schedule has just appeared; creating UI")
        createUI()
      }
    }

    //update iff schedule view is present
    if (!schedule) return;

    // update button only when necessary
    // (changes to DOM structure, e.g. button is removed)
    let doUpdateButton = mutations.find(m => m.type === "childList")
    //update map when DOM changes or attributes change
    // (for color hover """"feature"""")
    let doUpdateMap =
        doUpdateButton || mutations.find(m => m.type === "attributes");

    if (doUpdateButton) updateButton();
    if (doUpdateMap && plotterPresented) await updateMap();
  }

  function updateButton() {
    console.debug('updating button')
    const group = document.querySelector("div#rightside div.btn-group")
    const buttonPresent = document.querySelector("#gg-map-btn")
    //button bar not loaded yet or button already exists
    if (!group || buttonPresent) return;

    const buttonTemplate = (active) => `
    <div id="gg-map-btn" class="btn-group">
      <button id="gg-map-btn-btn" type="button" class="btn btn-default ${active ? "active" : ""}">
        <i class="fa fa-map"></i> Map
      </button>
    </div>
    `;

    const newButton = htmlToElement(buttonTemplate(plotterPresented))
    group.insertBefore(newButton, group.children[2])
    const group2 = document.querySelector("#button-bar > div.btn-group.btn-group-justified.hidden-print.visible-sm.visible-xs")
    group2.insertBefore(newButton.cloneNode(true), group2.children[2])
    document.querySelectorAll("#gg-map-btn-btn").forEach(node => {
      node.onclick = toggleMap
    });
  }

  function toggleMap() {
    plotterPresented = !plotterPresented
    const plotter = document.querySelector("#gg-plotter")
    // const map = document.querySelector("#gg-plotter-map")
    const button = document.querySelector("div#rightside div.btn-group")
        .children[2].children[0]
    if (plotterPresented) {
      plotter.style.display = "block";
      button.className = "btn btn-default active"
    } else {
      plotter.style.display = "none";
      button.className = "btn btn-default"
    }
  }

  /**
   * creates the plotter UI
   *
   * reasons to call this function:
   *  - loading a schedule view for the first time
   *  - changing from agenda view to calendar view
   *    - (buttons obliterate entire main content view and replace it)
   */
  function createUI() {
    console.debug("creating UI")
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const right = document.querySelector("#rightside");

    //prepare map to be drawn on
    const plotterTemplate = `
  <div id="gg-plotter">
      <div class="btn-group btn-group-justified hidden-print" style="margin-bottom: 1em;">
      ${days.map(day => {
      //NOW WE'rE CODING
      return `
          <div class="btn-group">
              <button id="gg-plotter-${day.toLowerCase()}-btn" type="button" class="btn btn-default">
                  ${ day.slice(0, 3) }
              </button>
          </div>
        `
    }).join("")}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: bottom">
          <div id="gg-plotter-info">
              <div id="gg-plotter-distance">unknown</div>
              <div id="gg-plotter-report" style="color: #f00"></div>
          </div>
          <div style="display: default">
              <a id="gg-plotter-gmaps" class="btn btn-primary" target="_blank">
                  <i class="fa fa-map-pin"></i> View in Google Maps
              </a>
          </div>
      </div>
      <canvas id="gg-plotter-map" width="2304" height="1296" class="card" style="padding-top: 5px; padding-bottom: 5px;"></canvas>
  </div>
    `

    const plotter = htmlToElement(plotterTemplate)
    if (!plotterPresented) {
      plotter.style.display = "none"
    }
    //insert as second child (before the second object; the schedule)
    right.insertBefore(plotter, right.children[1])

    //add button functionality
    function makeButton(day) {
      const button = document.querySelector(`#gg-plotter-${day.toLowerCase()}-btn`)
      if (day === "Monday")
        button.className = "btn btn-default active";
      button.onclick = async function () {
        setDayButtonSelected(day)
        daySelected = day
      }
    }
    days.forEach(makeButton)
  }

  /**
   * takes the day and makes the corresponding button have the active styling
   * while inactivating all others
   *
   * @param activeDay string of day to switch to active styling
   */
  function setDayButtonSelected(activeDay) {
    //maybe make global at this point
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    //reset button styling
    function styleDayButton(day) {
      const button = document.querySelector(`#gg-plotter-${day.toLowerCase()}-btn`)
      if (day === activeDay) button.className = "btn btn-default active";
      else button.className = "btn btn-default";
    }
    days.forEach(styleDayButton)
  }

  /**
   * plots on the map the representation of all the classes in a schedule from
   * information on the page (namely the section list in the left column)
   */
  async function updateMap() {
    console.debug("updating map")
    const canvas = document.querySelector("#gg-plotter-map");
    // canvas not loaded yet
    if (!canvas) return

    let schedule = await compileScheduleInfo();
    let itinerary = schedule.generateItinerary(daySelected);

    // monitor changes and update map
    const ctx = canvas.getContext("2d")
    const mapper = new SBUtil.Mapper(ctx)
    mapper.drawMap(itinerary)

    //total sequence distance
    const dist = itinerary.calculateDistances().toLocaleString(undefined, {maximumFractionDigits: 2})
    // whether or not you have to get on campus connector
    // it is eternal
    let interCampusTravel = itinerary.hasInterCampusTravel()
    const distNode = document.querySelector("#gg-plotter-distance");
    if (!distNode) {
      console.warn('distance div does not exist???????')
    } else {
      distNode.textContent = `Distance: >${(interCampusTravel ? ">>>>" : "")+dist} miles`
    }

    //update the Google Maps link to reflect class sequence
    const link = itinerary.makeGoogleMapsLink();
    const gMapsNode = document.querySelector("#gg-plotter-gmaps")
    // note to self: if this check is removed it never stops updating the page,
    // calling this function, causing an infinite loop; hopefully i will have a
    // more fundamental solution to this problem soon
    if (gMapsNode.href !== link) {
      gMapsNode.href = link
    }

    //warning that reports if there are any sections that do not have a location
    const reportNode = document.querySelector("#gg-plotter-report")
    const invalidCount = schedule.countInvalidSections()
    if (invalidCount > 0) {
      console.warn("sections without locations: " + invalidCount)
      reportNode.textContent = `Warning: ${invalidCount} section${invalidCount === 1 ? " does" : "s do"} not have a location`
    }
  }

  const strms = function () {
    let terms = {}
    //future-proofing
    for (let i = 20; i < 50; i++) {
      const year = 2000 + i
      const strm = 1000 + 10 * i
      terms["Spring " + year] = strm + 3
      terms["Summer " + year] = strm + 5
      terms["Fall " + year] = strm + 9
    }
    return terms
  }()

  /**
   * gets term from page's breadcrumb element and converts it to strm for use in API
   *
   * @returns {?string}
   */
  function getTermStrm() {
    //getting term from breadcrumbs (or so they're called)
    let term = document.querySelector(
        "#app-header > div > div.row.app-crumbs.hidden-print > div > ol > li:nth-child(2) > a")
    if (term) {
      term = term.textContent
      term = strms[term]
    } else {
      term = null
    }

    return term
  }

  /**
   * generates the schedule presented using local information and information
   * retrieved from the Schedule Builder API
   * 
   * @returns {Promise<SBUtil.Schedule>}
   */
  async function compileScheduleInfo() {

    //information scraped from webpage
    const scrapedSchedule = scrapeScheduleSections()
    const section_nbrs = scrapedSchedule.sections.map(s => s.id)
    const term = Number(getTermStrm())
    //data fetched from API
    const section_data = await SBAPI.fetchSectionInformation(section_nbrs, term)

    //compile local and API information into Section objects into a Schedule
    const compiled_sections = scrapedSchedule.sections.map(section => {
      const api_info = section_data.find(s => s.id === section.id)
      const {
        id, location, days, startTime, endTime
      } = api_info
      const locationObject = SBUtil.getLocation(location)
      return new SBUtil.Meeting(id, locationObject, days, startTime, endTime, section.color);
    })

    return new SBUtil.Schedule(compiled_sections, scrapedSchedule.selected);
  }

  /**
   * scrapes locally available information about the current schedule's sections
   * (section number, color)
   *
   * @returns {sections: {id: string, color: string}[], selected: string?} array of section objects with section, location,
   * and color attributes
   */
  function scrapeScheduleSections() {
    const scheduleBody = document.querySelector(
        "#schedule-courses > div > div > table > tbody");
    const scheduleList = Array.from(scheduleBody.children)

    let sections = []
    let currColor = null
    let selected = null

    function scrapeSectionInfo(element) {
      const tds = element.children

      //class header
      if (tds.length === 3) {
        currColor = tds[0].style.backgroundColor
        return
      }

      //section (id/location)
      let sectionNbr = tds[1]
      //check this td for highlighting (could check any other than the first)
      const highlighted = sectionNbr.classList.contains("info")
      if (sectionNbr) {
        sectionNbr = sectionNbr.firstElementChild.textContent.trim();
        try {
          sectionNbr = Number(sectionNbr)
        } catch {
          console.warn("could not read section number " + sectionNbr)
          sectionNbr = null
        }
      } else {
        sectionNbr = null;
        console.warn("could not obtain section no. (very weird)")
      }
      //this should only evaluate to true once, but shouldn't cause problems
      // if this statement doesn't hold
      if (highlighted) selected = sectionNbr;

      // SBAPI is now being used for location info
      // const location = tds[4].firstElementChild.textContent.trim();
      // const locationObject = SBUtil.getLocation(location)

      const newSection = {id: sectionNbr, color: currColor};
      sections.push(newSection)
    }
    scheduleList.forEach(scrapeSectionInfo);

    return {sections, selected};
  }

  //load map image as an img tag
  // (this seems to be the most valid way for some reason)
  function loadMapImage() {
    const imageTemplate = (imageURL, id) => `
    <img src="${imageURL}" id="${id}" style="display: none;">`

    const mapURL = chrome.runtime.getURL('static/walking.png')
    const mapTag = htmlToElement(imageTemplate(mapURL, "gg-map-image"))
    document.body.appendChild(mapTag)

    const logoURL = chrome.runtime.getURL('static/icons/icon-128.png')
    const logoTag = htmlToElement(imageTemplate(logoURL, "gg-logo-image"))
    document.body.appendChild(logoTag)
  }

  new MutationObserver(onChange).observe(document, {
    childList: true,
    attributes: true,
    subtree: true
  });

  //load only once
  loadMapImage()
})();