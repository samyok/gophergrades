let schedule_presented = false
//todo use chrome storage
let plotter_presented = false

/**
 * updates the UI to match the current state of the page
 * this is where all the decisions on when to refresh different components are
 * made:
 *    UI creation
 *    UI updates
 *
 * @param mutations mutations from MutationObserver
 */
function on_change(mutations) {
  const schedule = document.querySelector("#schedule-main");

  //create elements if change is detected
  if (schedule !== schedule_presented) {
    schedule_presented = schedule
    if (schedule) {
      log("schedule has just appeared; creating UI")
      create_UI()
    }
  }

  //update iff schedule view is present
  if (!schedule) return;

  // update button only when necessary (changes to DOM structure, e.g. button is removed)
  let do_update_button = mutations.find(m => m.type === "childList")
  //update map when DOM changes or attributes change (for color hover """"feature"""")
  let do_update_map = do_update_button || mutations.find(m => m.type === "attributes")

  if (do_update_button) update_button();
  if (do_update_map && plotter_presented) update_map();

  mutations.forEach(mutation => {
    switch(mutation.type) {
      case "childList":
        break;
      case "attributes":
        switch(mutation.attributeName) {
          case "status":
          case "username":
          default:
              break;
        }
        break;
    }
  })
}

function update_button() {
  log('updating button')
  const group = document.querySelector("div#rightside div.btn-group")
  const button_present = document.querySelector("#gg-map-btn")
  //button bar not loaded yet or button already exists
  if (!group || button_present) return;

  const button_template = (active) => `
  <div id="gg-map-btn" class="btn-group">
    <button id="gg-map-btn-btn" type="button" class="btn btn-default ${active ? "active" : ""}">
      <i class="fa fa-map"></i> Map
    </button>
  </div>
  `;

  const new_button = htmlToElement(button_template(plotter_presented))
  group.insertBefore(new_button, group.children[2])
  document.querySelector("#gg-map-btn-btn").onclick = toggle_map
}

function toggle_map() {
  plotter_presented = !plotter_presented
  const plotter = document.querySelector("#gg-plotter")
  // const map = document.querySelector("#gg-plotter-map")
  const button = document.querySelector("div#rightside div.btn-group")
      .children[2].children[0]
  if (plotter_presented) {
    plotter.style.display = "block";
    button.className = "btn btn-default active"
  } else {
    plotter.style.display = "none";
    button.className = "btn btn-default"
  }

  //todo: consider map an option like the schedule and agenda?
  // as in: replace the agenda/schedule when the map button is pressed
  // i don't really like it
  // you can hover over scheduler items and see where they are on the map
  // it's a feature
}

/**
 * creates the plotter UI
 *
 * reasons to call this function:
 *  - loading a schedule view for the first time
 *  - changing from agenda view to calendar view
 *    - (buttons obliterate entire main content view and replace it)
 */
function create_UI() {
  const right = document.querySelector("#rightside");

  //we must know from update_UI this is already false
  // if (!right) return

  //prepare map to be drawn on
  //todo: needs to detect sat and sun, but always add mon-fri by default
  // or maybe it doesn't need to add all 5 by default? wouldn't be useful
  const plotter_template = `
<div id="gg-plotter">
    <div class="btn-group btn-group-justified hidden-print visible-lg visible-md" style="margin-bottom: 1em;">
    ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => { 
      //NOW WE'rE CODING
      return `
        <div class="btn-group">
            <button id="gg-plotter-${day}-btn" type="button" class="btn btn-default">
                ${day}
            </button>
        </div>
      ` 
    }).join("")}
    </div>
    <div id="gg-plotter-distance">unknown</div>
    <canvas id="gg-plotter-map" width="2304" height="1296" class="card"></canvas>
</div>
  `
  const plotter = htmlToElement(plotter_template)
  if (!plotter_presented) {
    plotter.style.display = "none"
  }
  //insert as second child (before the second object; the schedule)
  right.insertBefore(plotter, right.children[1])
}

/**
 * plots on the map the representation of all the classes in a schedule from
 * information on the page (namely the section list in the left column)
 */
function update_map() {
  const canvas = document.querySelector("#gg-plotter-map");
  // canvas not loaded yet
  if (!canvas) return

  let sections = get_schedule_sections()
  //use only sections that have a valid location
  sections = sections.filter(sec => sec.location)
  // todo use this to tell user what sections do not have classrooms yet
  // const invalid_sections = sections.filter(loc => !loc.location)

  // classes not loaded yet
  // there shouldn't be a case where the scheduler is loaded without sections
  if (sections.length === 0) {
    log("no classes have assigned classrooms yet")
    return
  }

  // monitor changes and update map
  const ctx = canvas.getContext("2d")
  const mapper = new Mapper(ctx)
  mapper.draw_map(sections)

  const dist = calculate_distances(sections)
  const dist_node = document.querySelector("#gg-plotter-distance");
  if (!dist_node) {
    log('distance div does not exist???????')
  } else {
    dist_node.textContent = ""+dist
  }
}

/**
 * scrapes locally available information about the current schedule's sections
 * (section number, location, color)
 *
 * @returns {PlotterSection[]} array of section objects with section, location, and color attributes
 */
function get_schedule_sections() {
  let curr_color = null
  const schedule = document.querySelector(
      "#schedule-courses > div > div > table > tbody");
  const schedule_list = Array.from(schedule.children)

  let sections = []

  schedule_list.forEach(element => {
    const tds = element.children
    if (tds.length === 3) {
      curr_color = tds[0].style.backgroundColor
    } else if (tds.length === 6) {
      //todo: a way to implement section highlighting is reading the background
      // color of the section (it turns blue) but you need a rule where if none
      // of the sections are highlighted then they should all be colored in
      //section (id/location)
      let section_nbr = tds[1]
      if (section_nbr) {
        section_nbr = section_nbr.firstElementChild.textContent.trim();
        try {
          section_nbr = Number(section_nbr)
        } catch {
          log("could not read section number "+section_nbr)
          section_nbr = null
        }
      } else {
        section_nbr = null;
        log("could not obtain section no. (very weird)")
      }
      //location (excl. room no. (for now))
      //a section can have multiple locations for different meeting times
      let location = tds[4].firstElementChild.textContent.trim();
      if (location === "No room listed.") {
        location = undefined
      } else if (location === "Remote Class" || location === "Online Only") {
        log("Remote Class detected don't acknowledge")
        //todo: acknowledge
        location = undefined
      } else {
        const loc_o = locations.find(loc => loc.location === location);
        if (!loc_o) {
          log("could not find location " + location)
          location = undefined
        } else {
          location = loc_o
        }
      }
      const new_section = new PlotterSection(section_nbr, location, curr_color);
      sections.push(new_section)
    }
  });

  return sections
}

//load map image as an img tag (this seems to be the most valid way for some reason)
function load_map_image() {
  const image_template = (imageURL, id) => `
  <img src="${imageURL}" id="${id}" style="display: none;">`

  const map_url = chrome.runtime.getURL('plotter/walking.png')
  const map_tag = htmlToElement(image_template(map_url, "gg-map-image"))
  document.body.appendChild(map_tag)

  const logo_url = chrome.runtime.getURL('icons/icon-128.png')
  const logo_tag = htmlToElement(image_template(logo_url, "gg-logo-image"))
  document.body.appendChild(logo_tag)
}

// initialization; keep out of global scope
{
  new MutationObserver(on_change).observe(document, {
    childList: true,
    attributes: true,
    subtree: true
  });

  //load only once
  load_map_image()
}
