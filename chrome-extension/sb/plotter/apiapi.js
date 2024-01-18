/**
 * abstraction built around the Schedule Builder API to help form requests and
 * form concise objects to represent data for use in the extension's UI
 */

/**
 * object to interface with the API and cache results
 */
var SBAPI = (function() {
  /**
   * private cache to store requested data so it can quickly be retrieved when
   * needed (e.g. user flips through built schedules)
   *
   * @type {Map<int, Section>}
   */
  let cache = new Map()

  /**
   * @param sections{int[]} section numbers
   * @param semesterStrm{int} strm number for user's current semester
   * @returns {Promise<Section[]>} Schedule object with information from all sections
   */
  async function fetchSectionInformation(sections, semesterStrm) {
    // const cacheSections = sections.filter(s => cache.has(s))
    const fetchSections = sections.filter(s => !cache.has(s))

    if (fetchSections.length !== 0) {
      let requestNbrs = fetchSections.join("%2C")
      //todo there's a proper way to form api requests using js objects
      const data = await fetch("https://schedulebuilder.umn.edu/api.php" +
          "?type=sections" +
          "&institution=UMNTC" +
          "&campus=UMNTC" +
          // todo use the right term/semester
          "&term=" + semesterStrm +
          "&class_nbrs=" + requestNbrs)
          .then((response) => response.json())

      //add fetchSections to cache
      data.forEach(s => {
        const section_data = constructSectionFromData(s)
        cache.set(s.id, section_data)
      })
    }

    return sections.map(s => cache.get(s))
  }

  /**
   * example from which the shape of api data is being elucidated:
   * https://schedulebuilder.umn.edu/api.php?type=sections&institution=UMNTC&campus=UMNTC&term=1233&class_nbrs=60085%2C60076%2C60200%2C57982%2C60367%2C59712%2C58026%2C58027%2C57985%2C57986%2C66368%2C66373%2C59261%2C59518
   *
   * @param data
   * @returns {Section}
   */
  function constructSectionFromData(data) {
    const {
        id,
        campus,
        component, // lecture, discussion, laboratory, etc.
        credits,
        meetings,
    } = data;

    //todo replace with foreach for multiple meetings per section
    const {
        start_time,
        end_time,
        // bools representing whether a class takes place on a given weekday
        monday, tuesday, wednesday, thursday, friday, saturday, sunday,
    } = meetings[0];
    //gather meeting info from meetings object
    const days = [monday, tuesday, wednesday, thursday, friday, saturday, sunday]

    return new Section(id, days, start_time, end_time)
  }

  /**
   * object that encapsulates the important information returned by the schedule
   * builder API
   */
  class Section {
    /**
     * @param id{int}
     * @param days{boolean[]}
     * @param startTime{int} start time in seconds since midnight
     * @param endTime{int} end time in seconds since midnight
     */
    constructor(id, days, startTime, endTime) {
      this.id = id
      this.days = days
      //only works for sections with a meeting time/location
      // (the overwhelming majority of classes, but not all unfortunately)
      this.startTime = startTime
      this.endTime = endTime
    }
  }

  return {
    fetchSectionInformation,
    Section
  }
})();
