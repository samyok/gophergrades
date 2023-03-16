// TIL multiple js files will be loaded in the order specified in manifest.json

// keep initialization out of global scope
{
  console.log("loaded plotter.js")
  const appObserver = new MutationObserver(_ => {
    //todo: move this into its own function for UI
    // would better support expanding/compartmentalizing the UI as a
    // "plotter" suite that will provide info other than the map
    let schedule = document.querySelector("#schedule-courses tbody")
    if (!schedule) return;
    update_button()
    update_map()
  });
  //todo: use multiple observers so only UI gets more frequent updates
  appObserver.observe(document, {
    childList: true,
    attributes: true,
    subtree: true
  });

  //load only once
  load_image()
}

//todo: minor detail, but the selection outline remains after clicking the
// button, which is because the button isn't deleted from existence and rebuilt.
// i think removing the old button and replacing it with the new one is the only
// way to replicate the behavior of the other buttons that don't even do it
// consistently ugh whatever
function update_button() {
  // insert button
  const group = document.querySelector("div#rightside div.btn-group")
  if (!group || group.children.length === 4) {
    return
  }

  const map_button = document.createElement("div")
  map_button.className = "btn-group"
  map_button.id = "map-btn"

  const map_button_button = document.createElement("button")
  map_button_button.type = "button"
  if (showing_map)
    map_button_button.className = "btn btn-default active"
  else
    map_button_button.className = "btn btn-default"
  map_button_button.onclick = toggle_map

  const map_button_button_i = document.createElement("i")
  //the buttons already present use font awesome
  //https://fontawesome.com/icons/map?s=solid&f=classic
  map_button_button_i.className = "fa fa-map"
  map_button_button.appendChild(map_button_button_i)

  let textNode = document.createTextNode(" Map");
  map_button_button.appendChild(textNode);

  map_button.appendChild(map_button_button)

  group.insertBefore(map_button, group.children[2])
}

// todo make this persistent that would be cool
//  it appears the only way to accomplish that would require the storage
//  permission which is icky
let showing_map = false

function toggle_map() {
  showing_map = !showing_map
  const map = document.querySelector("#map")
  const button = document.querySelector("div#rightside div.btn-group")
      .children[2].children[0]
  if (showing_map) {
    map.style.display = "block";
    button.className = "btn btn-default active"
  } else {
    map.style.display = "none";
    button.className = "btn btn-default"
  }
}

function get_section_info() {
  // let request_nbrs = section_nbrs.join("%2C")
  // fetch("https://schedulebuilder.umn.edu/api.php" +
  //     "?type=sections" +
  //     "&institution=UMNTC" +
  //     "&campus=UMNTC" +
  // todo use the right term/semester
  //     "&term=1239" +
  //     "&class_nbrs="+request_nbrs)
  //     .then((response) => response.json())
  //     .then((data) => console.log(data))

  //get section information
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
        console.log("[GG/plotter] could not obtain section no. (very weird)")
      }
      //location (excl. room no. (for now))
      let location = tds[4].firstElementChild.textContent.trim();
      if (location === "No room listed.") {
        location = null
      } else if (location === "Remote Class") {
        console.log("[GG/plotter] Remote Class detected don't acknowledge")
        //todo: acknowledge
        location = null
      } else {
        const loc_o = locations.find(loc => loc.location === location);
        if (!loc_o) {
          console.log("[GG/plotter] could not find location " + location)
        }
        location = loc_o
      }

      sections.push({section, location, color: curr_color})
    }
  });

  return sections
}

function update_map() {
  const right = document.querySelector("#rightside");

  let sections = get_section_info()

  // first time setup of map
  // causes:
  //  - loading a schedule view for the first time
  //  - changing from agenda view to calendar view
  //    - (buttons obliterate entire main content view and replace it)
  if (right.children.length === 2) {
    //prepare map to be drawn on
    let canvas = document.createElement("canvas");
    canvas.id = "map";
    canvas.width = 2304;
    canvas.height = 1296;
    canvas.style.display = "none";
    canvas.style.maxWidth = "100%";
    right.insertBefore(canvas, right.children[1])
  } else if (right.children.length === 3) {
    // classes not loaded yet
    if (sections.length === 0) return;

    // monitor changes and update map
    const canvas = document.querySelector("#map");
    if (showing_map)
      canvas.style.display = null;
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const img_tag = document.querySelector("#map_image")
    ctx.drawImage(img_tag, 0, 0)
    ctx.lineWidth = 8

    //use only sections that have a valid location
    sections = sections.filter(loc => loc.location)
    // todo use this to tell user what sections do not have classrooms yet
    // const invalid_sections = sections.filter(loc => !loc.location)

    //no sections have classrooms yet
    if (sections.length === 0) {
      console.log("[GG/plotter] no classes have assigned classrooms yet")
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

    //draw uncolored, then colored circles so colored ones appear on top
    // it is purely a coincidence hover works after observing style changes
    //draw blank circles
    sections.forEach(section => {
      if (section.color === "rgb(221, 221, 221)") do_circle(ctx, section);
    });
    //draw colored circles
    sections.forEach(section => {
      if (section.color !== "rgb(221, 221, 221)") do_circle(ctx, section);
    });
  }
}

function do_line(ctx, prev, curr) {
  ctx.beginPath()
  ctx.moveTo(prev.x, prev.y);
  ctx.lineTo(curr.x, curr.y);
  ctx.stroke()
  ctx.closePath();
}

function do_circle(ctx, section) {
  const {location, color} = section
  ctx.beginPath()
  ctx.moveTo(location.x, location.y);
  ctx.arc(location.x, location.y, 16, 0, 2 * Math.PI);
  ctx.stroke()
  ctx.fillStyle = color;
  ctx.fill()
  ctx.closePath()
}

//load map image as an img tag (this seems to be the most valid way for some reason)
function load_image() {
  const map_url = chrome.runtime.getURL('sidebar/walking.png')
  const img_tag = document.createElement("img")
  img_tag.src = map_url
  img_tag.id = "map_image"
  img_tag.style.display = "none"
  document.body.appendChild(img_tag)
}

const terms = function () {
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

const locations = [
  {location: "Morrill Hall", x: 913, y: 614},
  {location: "Johnston Hall", x: 778, y: 613},
  {location: "John T. Tate Hall", x: 908, y: 672},
  {location: "Smith Hall", x: 778, y: 749},
  {location: "Vincent Hall", x: 891, y: 752},
  {location: "Murphy Hall", x: 926, y: 751},
  {location: "Ford Hall", x: 912, y: 811},
  {location: "Kolthoff Hall", x: 782, y: 812},
  {location: "Coffman Memorial Union", x: 847, y: 927},
  {location: "Amundson Hall", x: 1013, y: 815},
  {location: "Lind Hall", x: 980, y: 752},
  {location: "Mech Eng Bldg", x: 1006, y: 670},
  {location: "Akerman Hall", x: 1072, y: 671},
  {location: "Kenneth H Keller Hall", x: 1048, y: 748},
  {location: "Physics & Nanotechnology Bldg", x: 1126, y: 661},
  {location: "Shepherd Labs", x: 1068, y: 612},
  {location: "Rapson Hall", x: 1006, y: 583},
  {location: "Pillsbury Hall", x: 916, y: 505},
  {location: "Nicholson Hall", x: 824, y: 477},
  {location: "Williamson Hall", x: 887, y: 423},
  {location: "Jones Hall", x: 850, y: 400},
  {location: "Folwell Hall", x: 913, y: 365},
  {location: "Molecular Cellular Biology", x: 1047, y: 886},
  {location: "Jackson Hall", x: 981, y: 889},
  {location: "Hasselmo Hall", x: 929, y: 923},
  {location: "Bruininks Hall", x: 701, y: 797},
  {location: "Appleby Hall", x: 702, y: 715},
  {location: "Fraser Hall", x: 700, y: 642},
  {location: "Peik Hall", x: 720, y: 300},
  {location: "Cooke Hall", x: 1216, y: 597},
  {location: "Diehl Hall", x: 1143, y: 1035},
  {location: "Weaver-Densford Hall", x: 1176, y: 866},
  {location: "Scott Hall", x: 724, y: 516},
  {location: "Kaufert Laboratory", x: 1736, y: 319},
  {location: "Green Hall", x: 1741, y: 419},
  {location: "Skok Hall", x: 1727, y: 369},
  {location: "Hodson Hall", x: 1864, y: 320},
  {location: "Alderman Hall", x: 1879, y: 385},
  {location: "Borlaug Hall", x: 1913, y: 480},
  {location: "Gortner Lab", x: 1975, y: 585},
  {location: "McNeal Hall", x: 1893, y: 664},
  {location: "Biological Sciences Center", x: 1974, y: 718},
  {location: "Coffey Hall", x: 1729, y: 834},
  {location: "Ruttan Hall", x: 1798, y: 877},
  {location: "Magrath Library", x: 1867, y: 812},
  {location: "Biosystems & Ag. Eng.", x: 1727, y: 956},
  {location: "Haecker Hall", x: 1739, y: 1045},
  {location: "Andrew Boss Laboratory", x: 1772, y: 1104},
  {location: "Food Science/Nutrition", x: 1766, y: 1168},
  {location: "Stakman Hall", x: 1944, y: 470},
  {location: "Hayes Hall", x: 1959, y: 521},
  {location: "Christensen Lab", x: 1993, y: 483},
  {location: "Walter Library", x: 774, y: 673},
  {location: "Mondale Hall", x: 178, y: 887},
  {location: "Willey Hall", x: 232, y: 914},
  {location: "Andersen Library", x: 284, y: 886},
  {location: "Anderson Hall", x: 336, y: 1010},
  {location: "Social Sciences", x: 285, y: 1056},
  {location: "Heller Hall", x: 223, y: 1045},
  {location: "Blegen Hall", x: 257, y: 1045},
  {location: "Wilson Library", x: 234, y: 1118},
  {location: "Rarig Center", x: 314, y: 1171},
  {location: "Ferguson Hall", x: 364, y: 1109},
  {location: "Ted Mann Concert Hall", x: 400, y: 1152},
  {location: "Carlson School of Management", x: 146, y: 1174},
  {location: "Hanson Hall", x: 157, y: 1249},
  {location: "HHH Ctr.", x: 160, y: 1064},
  {location: "Pattee Hall", x: 631, y: 318},
  {location: "Wilkins Hall", x: 601, y: 186},
  {location: "Learning & Environmental Sci.", x: 1990, y: 814},
  {location: "St. Paul Student Center", x: 1721, y: 706},
  {location: "Eng. & Fisheries Lab", x: 1775, y: 961},
  {location: "Animal Sci./Vet. Medicine", x: 1826, y: 1032},
  {location: "Veterinary Science", x: 1889, y: 1182},
  {location: "Peters Hall", x: 2103, y: 890},
  {location: "Continuing Education & Conference Center", x: 2152, y: 846},
  {location: "Chiller Bldg", x: 2202, y: 902},
  {location: "Armory", x: 1078, y: 478},
  {location: "Northrop", x: 850, y: 556},
  {location: "Wulling Hall", x: 695, y: 574},
  {location: "Elliott Hall", x: 666, y: 509},
  {location: "Burton Hall", x: 682, y: 422},
  {location: "Shelvin Hall", x: 651, y: 369},
  {location: "Eddy Hall", x: 754, y: 430}
]
