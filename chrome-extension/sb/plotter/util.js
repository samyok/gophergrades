console.log("loaded sb/plotter/util.js")

var SBUtil = (function () {
  /**
   * object which stores the name and corresponding x- and y-coordinates of a
   * location (and by x- and y-coordinates i mean what pixel on the washed out
   * image of the map that's bundled with the extension the location occupies)
   */
  class Location {
    /**
     *
     * @param location{string}
     * @param x{int}
     * @param y{int}
     */
    constructor(location, x, y) {
      this.location = location
      this.x = x
      this.y = y
    }
  }

  /**
   * object which contains the necessary data for the plotter to map out a single
   * section with id, location, and color information
   */
  class Section {
    /**
     *
     * @param id{int?}
     * @param location{Location}
     * @param color
     */
    constructor(id, location, color) {
      this.id = id
      this.location = location
      this.color = color
    }
  }

  /**
   * object which contains the necessary data for the plotter to map out a
   * schedule
   *
   * you pass this object to the mapper when drawing the map
   */
  class Schedule {
    /**
     *
     * @param sections{Section[]}
     * @param highlight{boolean?}
     */
    constructor(sections, highlight) {
      this.sections = sections
      this.highlight = highlight
    }
  }

  /**
   * object that manages how a schedule is represented on the map
   */
  class Mapper {
    /**
     * @param ctx{CanvasRenderingContext2D}
     */
    constructor(ctx) {
      this.ctx = ctx
    }

    doLine(prev, curr) {
      if ((prev.x > 1500) !== (curr.x > 1500)) {
        this.ctx.setLineDash([15, 15]);
      }
      this.ctx.beginPath()
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      this.ctx.stroke();
      this.ctx.closePath();
      this.ctx.setLineDash([]);
    }

    doCircle(section) {
      const {location, color} = section
      this.ctx.beginPath()
      this.ctx.moveTo(location.x, location.y);
      this.ctx.arc(location.x, location.y, 16, 0, 2 * Math.PI);
      this.ctx.stroke()
      this.ctx.fillStyle = color;
      this.ctx.fill()
      this.ctx.closePath()
    }

    /**
     * draws the map based on provided values
     *
     * @param schedule{Schedule}
     */
    drawMap(schedule) {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      const imgTag = document.querySelector("#gg-map-image")
      this.ctx.drawImage(imgTag, 0, 0)
      const logoTag = document.querySelector("#gg-logo-image")
      this.ctx.drawImage(logoTag, 60, 400)
      this.ctx.lineWidth = 8

      const { sections, highlight } = schedule

      //draw connecting lines between locations
      for (let i = 1; i < sections.length; i++) {
        const loc0 = sections[i - 1].location
        const loc1 = sections[i].location
        this.doLine(loc0, loc1)
      }

      //label start node (if there's more than one node)
      if (sections.length > 1) {
        const { location } = sections[0]
        this.ctx.font = "60px Arial";
        this.ctx.strokeStyle = "rgba(40, 40, 40, 0.7)";
        this.ctx.strokeText("Start", location.x-65, location.y+70);
        this.ctx.strokeStyle = "black";
        this.ctx.fillStyle = "rgb(128, 222, 160)";
        this.ctx.fillText("Start", location.x-65, location.y+70);
      } else if (sections.length === 0) {
        this.ctx.font = "360px Arial";
        this.ctx.fillStyle = "rgba(40, 40, 40, 0.25)";
        this.ctx.fillText("No Classes", 250, 800);

      }

      //draw uncolored, then colored circles so colored ones appear on top
      if (highlight) {
        sections.forEach(section => {
          if (section.id !== highlight)
            //a section associated with the highlighted
            // section will still have color
            section.color = "rgb(221, 221, 221)"
            this.doCircle(section);
        });
        const highlightedSection = sections.find(section => section.id === highlight)
        if (highlightedSection) {
          this.doCircle(highlightedSection)
        } // else the section is probably just not in this day's schedule
      } else {
        //when no particular section is highlighted, a class (which groups sections)
        // may be hovered, so still need to draw grayed nodes
        //draw circles in reverse so earlier classes show up on top
        sections.forEach(section => {
          if (section.color === "rgb(221, 221, 221)")
            this.doCircle(section);
        });
        sections.reverse()
        sections.forEach(section => {
          if (section.color !== "rgb(221, 221, 221)")
            this.doCircle(section);
        });
      }
    }
  }

  function calculateDistances(sections) {
    let dist = 0
    for (let i = 1; i < sections.length; i++) {
      const loc0 = sections[i - 1].location
      const loc1 = sections[i].location
      dist += Math.sqrt(Math.pow(loc1.x - loc0.x, 2) + Math.pow(loc1.y - loc0.y, 2))
    }
    //scale pixels to miles
    return dist / 144 * 500 / 5280
  }

  /**
   * determines whether or not subsequent classes take place on different 
   * campuses (mpls vs st paul)
   * 
   * @param {Section[]} sections 
   */
  function scheduleHasInterCampusTravel(sections) {
    let interCampusTravel = false
    let prev = null
    for (let i = 0; i < sections.length; i++) {
      const curr = sections[i].location.x
      if (prev && (curr > 1500) !== (prev > 1500)) {
        interCampusTravel = true
        break
      }
      prev = curr
    }

    return interCampusTravel;
  }

  /**
   * converts the position of a section on the plotter map (image) to actual
   * coordinates in the world
   *
   * @param section{Section}
   * @returns {lat: number, long: number}
   */
  function pixelsToLatLong(section) {
    // anchor points that provide a "bases" for the transformation
    // (yeah, i took Intro to Linear Algebra)
    const anchor = {
      px: { x: 684, y: 306 },
      dg: { long: -93.2375145, lat: 44.9788553 }
    }
    const a2 = {
      px: { x: 1438, y: 1166 },
      dg: { long: -93.2273553, lat: 44.9704473 }
    }
    //degrees per pixel
    const scale = {
      x: (a2.dg.long-anchor.dg.long)/(a2.px.x-anchor.px.x),
      y: (a2.dg.lat-anchor.dg.lat)/(a2.px.y-anchor.px.y)
    }

    let {x, y} = section.location
    //offset st. paul campus
    if (x > 1500) {
      //yea
      x = x*0.83+3140
      y = y*0.83-900
    }
    const lat = anchor.dg.lat + (y - anchor.px.y)*scale.y
    const long = anchor.dg.long + (x - anchor.px.x)*scale.x
    return {lat, long};
  }

  /**
   * generates a Google Maps link representing the order and location of
   * classes in a sections array to show rough pathfinding between classes
   * @param {Section[]} sections 
   * @returns 
   */
  function makeGoogleMapsLink(sections) {
    const latLongs = sections.map(pixelsToLatLong);
    const link = "https://www.google.com/maps/dir/" +
        latLongs.map(c => c.lat+","+c.long).reverse().join("/")
    
    return link;
  }

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
   * 
   * @param {string} loc_str
   */
  function getLocation(loc_str) {
    if (loc_str === "No room listed.") {
      // no room is listed (yet, hopefully)
      return undefined;
    } else if (loc_str === "Remote Class" || loc_str === "Online Only") {
      console.debug("Remote Class detected don't acknowledge")
      //todo: acknowledge
      // when it says remote class that means mandatory attendance which would
      // be important to tell the user about
      return undefined
    }

    const locationObject = locations.find(loc => loc.location === loc_str);
    if (!locationObject) {
      console.warn("could not find location " + loc_str)
    }

    return locationObject
  }

  //todo succeed this garbage
  const locations = function () {
    const locs = [
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
      {location: "Mechanical Engineering", x: 1006, y: 670},
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
      {location: "Biosystems/Agricultural Eng", x: 1727, y: 956},
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
      {location: "Hubert H Humphrey School", x: 160, y: 1064},
      {location: "Pattee Hall", x: 631, y: 318},
      {location: "Wilkins Hall", x: 601, y: 186},
      {location: "Learning & Environmental Sci.", x: 1990, y: 814},
      {location: "St. Paul Student Center", x: 1721, y: 706},
      {location: "Eng. & Fisheries Lab", x: 1775, y: 961},
      {location: "Animal Science/Veterinary Med", x: 1826, y: 1032},
      {location: "Veterinary Science", x: 1889, y: 1182},
      {location: "Peters Hall", x: 2103, y: 890},
      {location: "Continuing Education & Conference Center", x: 2152, y: 846},
      {location: "Chiller Bldg", x: 2202, y: 902},
      {location: "Armory Building", x: 1078, y: 478},
      {location: "Northrop", x: 850, y: 556},
      {location: "Wulling Hall", x: 695, y: 574},
      {location: "Elliott Hall", x: 666, y: 509},
      {location: "Burton Hall", x: 682, y: 422},
      {location: "Shelvin Hall", x: 651, y: 369},
      {location: "Eddy Hall", x: 754, y: 430},
      {location: "10 Church Street SE", x: 1000, y: 420},
      {location: "Health Sciences Education Cent", x: 1190, y: 1010},
      {location: "Civil Engineering Building", x: 1130, y: 582},
      {location: "Phillips-Wangensteen Building", x: 1138, y: 976},
      //leave out for testing purposes (gracefully handle missing locations)
      // {location: "University Field House", x: 1166, y: 516}
    ];

    return locs.map(loc => new Location(loc.location, loc.x, loc.y))
  }()

  return {
    Location,
    Section,
    Schedule,
    Mapper,
    calculateDistances,
    scheduleHasInterCampusTravel,
    makeGoogleMapsLink,
    getTermStrm,
    getLocation
  }
})();