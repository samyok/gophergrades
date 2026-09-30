/**
 * Abstraction layer over the Schedule Builder API (schedulebuilder.umn.edu).
 *
 * Responsibilities:
 *  - form well-shaped requests for section information
 *  - cache results locally to avoid repeated network requests
 *  - provide small, well-typed SBSection objects to the plotter UI
 *
 * Important notes:
 *  - This module intentionally validates HTTP responses and JSON shape
 *    before assuming an array of sections is returned.
 *  - Errors are surfaced via `errorLog` and re-thrown so callers may
 *    apply backoff/guarding behavior.
 */
class SBAPI {
  /**
   * Private in-memory cache for fetched SBSection objects. Keys are
   * numeric section IDs.
   * @type {Map<number, SBSection>}
   */
  static #cache = new Map()

  /**
   * Fetch section details from the Schedule Builder API for the provided
   * `sections` list and `semesterStrm` term.
   *
   * Behavior:
   *  - Uses an internal cache to avoid re-fetching previously requested
   *    sections.
   *  - Validates HTTP response status and JSON shape; if the response is
   *    not OK or not an array the function logs debug information and
   *    throws an error.
   *  - When new data is received, it is converted to `SBSection` objects
   *    and stored in the cache.
   *
   * @param {number[]} sections - list of class_nbrs to fetch
   * @param {number|string} semesterStrm - Schedule Builder term code
   * @returns {Promise<SBSection[]>} array of SBSection objects in the same order as `sections`
   */
  static async fetchSectionInformation(sections, semesterStrm) {
    // determine which sections still need to be fetched
    const fetchSections = sections.filter(s => !SBAPI.#cache.has(s))

    try {
      debug(`SBAPI.fetchSectionInformation: requested ${sections.length} sections; need fetch ${fetchSections.length}`)

      if (fetchSections.length !== 0) {
        // class_nbrs are comma-encoded in the API; join with %2C to be safe
        let requestNbrs = fetchSections.join("%2C")
        // Construct URL; historically the API is a simple GET interface
        const url = "https://schedulebuilder.umn.edu/api.php" +
            "?type=sections" +
            "&institution=UMNTC" +
            "&campus=UMNTC" +
            "&term=" + semesterStrm +
            "&class_nbrs=" + requestNbrs

        debug(`SBAPI fetching url: ${url}`)
        const response = await fetch(url)

        // If HTTP status is not OK, capture the response body for debugging
        if (!response.ok) {
          let text = "<no body>"
          try { text = await response.text() } catch (e) { /* ignore read errors */ }
          debug(`SBAPI fetch failed: ${response.status} ${response.statusText} - ${text}`)
          throw new Error(`SBAPI fetch failed: ${response.status} ${response.statusText}`)
        }

        // Parse JSON safely and validate expected structure (array)
        let data
        try {
          data = await response.json()
        } catch (e) {
          errorLog(e, 'SBAPI.parseJSON')
          throw e
        }

        if (!Array.isArray(data)) {
          // API returned an unexpected shape (often an error object).
          debug('SBAPI returned non-array response: ' + JSON.stringify(data).slice(0, 500))
          throw new TypeError('SBAPI returned non-array response')
        }

        // Convert received raw objects into SBSection instances and cache
        for (const s of data) {
          const section_data = this.#constructSectionFromData(s)
          SBAPI.#cache.set(s.id, section_data)
        }
      }

      // Return an array of SBSection objects in the original order
      return sections.map(s => SBAPI.#cache.get(s))
    } catch (e) {
      // Surface helpful debugging info then rethrow so callers can apply
      // their own backoff/guard logic.
      try { errorLog(e, 'SBAPI.fetchSectionInformation') } catch (ee) { console.error('[GG/plotter] error logging failed', ee) }
      throw e
    }
  }

  /**
   * example from which the shape of api data is being elucidated:
   * https://schedulebuilder.umn.edu/api.php?type=sections&institution=UMNTC&campus=UMNTC&term=1233&class_nbrs=60085%2C60076%2C60200%2C57982%2C60367%2C59712%2C58026%2C58027%2C57985%2C57986%2C66368%2C66373%2C59261%2C59518
   *
   * @param data
   * @returns {SBSection}
   */
  static #constructSectionFromData(data) {
    // Extract only the fields we care about for plotting. The API's
    // `meetings` array may contain multiple meeting times; for the
    // purposes of the map we take the first meeting entry (most common
    // case: lecture meeting).
    const {
        id,
        campus,
        component, // lecture, discussion, laboratory, etc.
        credits,
        meetings,
    } = data;

    // TODO: If sections with multiple meetings become important for the
    // map, iterate `meetings` and return multiple SBSection-like entries.
    const {
        start_time,
        end_time,
        // booleans representing whether a class takes place on a given weekday
        monday, tuesday, wednesday, thursday, friday, saturday, sunday,
    } = meetings[0];

    // Normalize weekday booleans into an array indexed Monday..Sunday
    const days = [monday, tuesday, wednesday, thursday, friday, saturday, sunday]

    return new SBSection(id, days, start_time, end_time)
  }
}

/**
 * object that encapsulates the important information returned by the schedule
 * builder API
 */
class SBSection {
  /**
   * @param id{int}
   * @param days{boolean[]}
   * @param startTime{int} start time in seconds since midnight
   * @param endTime{int} end time in seconds since midnight
   */
  constructor(id, days, startTime, endTime) {
    /** numeric section id (class_nbr) */
    this.id = id
    /** boolean[] Monday..Sunday indicating meeting days */
    this.days = days
    // only works for sections with a meeting time/location
    // (the overwhelming majority of classes, but not all)
    this.startTime = startTime
    this.endTime = endTime
  }
}
