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

  // mutations.forEach(mutation => {
  //   switch(mutation.type) {
  //     case "childList":
  //       break;
  //     case "attributes":
  //       switch(mutation.attributeName) {
  //         case "status":
  //         case "username":
  //         default:
  //             break;
  //       }
  //       break;
  //   }
  // })
}


//todo: minor detail, but the selection outline remains after clicking the
// button, which is because the button isn't deleted from existence and rebuilt.
// i think removing the old button and replacing it with the new one is the only
// way to replicate the behavior of the other buttons that don't even do it
// consistently ugh whatever
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

// todo make this persistent that would be cool
//  it appears the only way to accomplish that would require the storage
//  permission which is icky
//  popup.html is using storage so i guess that means we're in woOOOO
let plotter_ui = chrome.storage.local.get(["plotter_ui"]).then((result) => {
  console.log("Value currently is " + result.key);
})

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

const plotter_template = `
<div id="gg-plotter">
    <div id="gg-plotter-distance">unknown</div>
    <canvas id="gg-plotter-map" width="2304" height="1296" class="card"></canvas>
</div>
`

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
  //prepare map to be drawn on
  const plotter = htmlToElement(plotter_template)
  if (!plotter_presented) {
    plotter.style.display = "none"
  }
  right.insertBefore(plotter, right.children[1])

}

function update_map() {
  const canvas = document.querySelector("#gg-plotter-map");
  // canvas not loaded yet
  if (!canvas) return

  let sections = get_schedule_info()
  // classes not loaded yet
  // there shouldn't be a case where the scheduler is loaded without sections
  if (sections.length === 0) return;

  //todo test
  const section_nbrs = sections.map(s => s.section)
  log(section_nbrs)
  //how do i make network requests without roadblocking the browser
  //do i just change the app structure to be a gigantic chain of .then?
  // get_section_data(section_nbrs)
  //     .then((data) => {
  //
  //     })

  // monitor changes and update map
  const ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const img_tag = document.querySelector("#gg-map-image")
  ctx.drawImage(img_tag, 0, 0)
  const logo_tag = document.querySelector("#gg-logo-image")
  ctx.drawImage(logo_tag, 60, 400)
  ctx.lineWidth = 8

  //use only sections that have a valid location
  sections = sections.filter(loc => loc.location)
  // todo use this to tell user what sections do not have classrooms yet
  // const invalid_sections = sections.filter(loc => !loc.location)

  //no sections have classrooms yet
  if (sections.length === 0) {
    log("no classes have assigned classrooms yet")
    return
  }

  let dist = 0
  //draw connecting lines between locations
  for (let i = 1; i < sections.length; i++) {
    const loc0 = sections[i - 1].location
    const loc1 = sections[i].location
    dist += Math.sqrt(Math.pow(loc1.x - loc0.x, 2) + Math.pow(loc1.y - loc0.y, 2))
    do_line(ctx, loc0, loc1)
  }
  //scale pixels to miles
  dist = dist/144*500/5280

  const dist_node = document.querySelector("#gg-plotter-distance");

  if (!dist_node) {
    log('distance div does not exist???????')
  } else {
    dist_node.textContent = ""+dist
  }

  //todo: a way to implement section highlighting is reading the background
  // color of the section (it turns blue)

  //draw uncolored, then colored circles so colored ones appear on top
  // it is purely a coincidence hover works after observing style changes
  //draw blank circles
  sections.forEach(section => {
    if (section.color === "rgb(221, 221, 221)")
      do_circle(ctx, section);
  });
  //draw colored circles
  sections.forEach(section => {
    if (section.color !== "rgb(221, 221, 221)")
      do_circle(ctx, section);
  });
}

/**
 * scrapes information about the current schedule's sections
 *
 * @returns {*[]} array of section objects with section, location, and color attributes
 */
function get_schedule_info() {
  let sections = []
  let curr_color = null
  const schedule = document.querySelector(
      "#schedule-courses > div > div > table > tbody");
  const schedule_list = Array.from(schedule.children)

  schedule_list.forEach(element => {
    const tds = element.children
    if (tds.length === 3) {
      curr_color = tds[0].style.backgroundColor
    } else if (tds.length === 6) {
      //section (id/location)
      let section = tds[1]
      if (section)
        section = section.firstElementChild.textContent.trim();
      else {
        section = null;
        log("could not obtain section no. (very weird)")
      }
      //location (excl. room no. (for now))
      let location = tds[4].firstElementChild.textContent.trim();
      if (location === "No room listed.") {
        location = null
      } else if (location === "Remote Class") {
        log("Remote Class detected don't acknowledge")
        //todo: acknowledge
        location = null
      } else {
        const loc_o = locations.find(loc => loc.location === location);
        if (!loc_o) {
          log("could not find location " + location)
        }
        location = loc_o
      }

      sections.push({section, location, color: curr_color})
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
  //how does this work
  new MutationObserver(on_change).observe(document, {
    childList: true,
    attributes: true,
    subtree: true
  });

  //load only once
  load_map_image()
}
