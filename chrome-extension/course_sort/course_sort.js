const courseSortingLogPrefix = '[Course Sorting Script] ';

console.log(courseSortingLogPrefix + "Course Sorting script loaded");

// dropdown element
const dropdownTemplate = `
<div style="display: inline-block; margin-left: -20px; margin-right: 5px;">
  <select class="size-dropdown" style="border-color: #ccc; border-radius: 3px; height: 34px; transform: translateY(3%); font-size: 14px; padding: 6px 12px;">
    <option value="sortCourseCodeAsc">Sort By Course # (Default)</option>
    <option value="sortSeatsAvailDes">Sort By Seats Available</option>
    <option value="sortMostCommonGradeDes">Sort By A Grade Rate</option>
    <option value="sortAvgGrade">Sort By Average Grade</option>
    <option value="sortPopularityDes">Sort By Popularity</option>
    <option value="sortUnitsDes">Sort By Units</option>
  </select>
</div>
`;

// handle sorting options
const handleDropdownChange = (event) => {
  var selectedValue = event.target.value;
  console.log(courseSortingLogPrefix + "my choice: " + selectedValue);

  const sortingFunctions = {
    sortCourseCodeAsc: () => location.reload(),
    sortSeatsAvailDes: () => 
      {
        const showSectionButtons = document.querySelectorAll('.action-sections.btn.btn-default');    
        showSectionButtons.forEach(button => button.click());
        const loadingElement = `<h2 class='loadingIndicator'><p>Sorting...</p></h2>`;
        let courseListResults = document.querySelector('.course-list-results').parentElement;
        courseListResults.insertBefore(htmlToElement(loadingElement), courseListResults.firstChild);
        setTimeout(() => {
          sortCourses(buildSeatsAvailableDict, 'sortSeatsAvailDes');
        }, 500);
      },
    sortMostCommonGradeDes: () => sortCourses(buildMostCommonGradeDict, 'sortMostCommonGradeDes'),
    sortAvgGrade: () => sortCourses(buildCourseAvgDict, 'sortAvgGrade'),
    sortPopularityDes: () => sortCourses(buildPopularityDict, 'sortPopularityDes'),
    sortUnitsDes: () => sortCourses(buildUnitsDict, 'sortUnitsDes')
  };

  sortingFunctions[selectedValue]?.();
};

const sortCourses = (buildDictFunc, dropdownValue, additionalLogic = () => {}) => {
  sortCoursesTemplate(buildDictFunc, additionalLogic).then(courseDict => {
    let courseListResults = document.querySelector('.course-list-results');
    let courseDivs = Array.from(courseListResults.firstElementChild.children);

    courseDivs.sort((a, b) => {
      let nameA = a.querySelector('a').getAttribute('name');
      let nameB = b.querySelector('a').getAttribute('name');
      return courseDict[nameB] - courseDict[nameA];
    });

    console.log(courseSortingLogPrefix + "Sorted Course Dict: ", courseDict); // For debugging purposes, display the updated dictionary
    console.log(courseSortingLogPrefix + "Sorted Course Divs: ", courseDivs); // For debugging purposes, display the updated divs

    courseListResults.firstElementChild.innerHTML = '';
    courseDivs.forEach(courseDiv => {
      courseListResults.firstElementChild.appendChild(courseDiv);
    });

    document.querySelector('.size-dropdown').value = dropdownValue;
  }).catch(error => {
    console.error(courseSortingLogPrefix + 'Error building course dictionary:', error);
  });
};

const sortCoursesTemplate = (buildDictFunc, additionalLogic) => {
  return buildDictFunc().then(courseDict => {
    additionalLogic();
    return courseDict;
  });
};

let courseSizeDict = {};

const buildSeatsAvailableDict = () => {
  return new Promise((resolve, reject) => {
    let courseListResults = document.querySelector('.course-list-results');
    let courseDivs = Array.from(courseListResults.firstElementChild.children);

    if (Object.keys(courseSizeDict).length === 0) {
      for (let courseDiv of courseDivs) {
        let courseName = courseDiv.querySelector('a').getAttribute('name');
        let targetDiv = courseDiv.querySelector('div:nth-child(2) > div:nth-child(3)');
        let trElements = targetDiv.querySelectorAll('tr');
  
        let sum = 0;
        trElements.forEach(tr => {
          let lastChildText = tr.lastElementChild.innerText;
  
          // Merged extractDifference logic
          let matches = lastChildText.match(/(\d+)\s+of\s+(\d+)/g);
          if (matches) {
            matches.forEach(match => {
              let parts = match.match(/(\d+)\s+of\s+(\d+)/);
              let current = parseInt(parts[1]);
              let total = parseInt(parts[2]);
              sum += (total - current);
            });
          }
        });
  
        courseSizeDict[courseName] = sum;
      }
    }
    
    const hideSectionButtons = document.querySelectorAll('.action-sections.btn.btn-default.pull-right');
    hideSectionButtons.forEach(button => button.click());
    document.querySelector('.loadingIndicator').remove();

    resolve(courseSizeDict);
  });  
};


let courseMostCommonGradeDict = {};
let courseAvgDict = {};
let coursePopularityDict = {};
let courseUnitsDict = {};

const buildDictionary = (fetchDataFunc, dictToUpdate) => {
  const loadingElement = `<h2 class='loadingIndicator'><p>Sorting...</p></h2>`;
  let courseListResults = document.querySelector('.course-list-results').parentElement;
  courseListResults.insertBefore(htmlToElement(loadingElement), courseListResults.firstChild);

  return new Promise((resolve, reject) => {
    let courseListResults = document.querySelector('.course-list-results');
    let courseDivs = Array.from(courseListResults.firstElementChild.children);
    let fetchPromises = [];

    if (Object.keys(dictToUpdate).length === 0) {
      for (let courseDiv of courseDivs) {
        let courseName = courseDiv.querySelector('a').getAttribute('name');
        let fetchPromise = new Promise((resolve, reject) => {
          try {
            fetch(`https://umn.lol/api/class/${courseName}`)
            .then(res => {
              if (!res.ok) {
                dictToUpdate[courseName] = 0;
              }
              return res.json();
            }).then(response => {
              if (response.success && response.data) {
                let result = fetchDataFunc(response.data);
                dictToUpdate[courseName] = result;
              } else {
                dictToUpdate[courseName] = 0;
              }
              resolve();
            }).catch(error => {
              console.error(courseSortingLogPrefix + 'Error fetching data:', error);
            });
          } catch {
            dictToUpdate[courseName] = 0;
            resolve();
          }
          
        });
        fetchPromises.push(fetchPromise);
      }
    }

    Promise.all(fetchPromises)
      .then(() => {
        document.querySelector('.loadingIndicator').remove();
        resolve(dictToUpdate);
      })
      .catch(error => {
        document.querySelector('.loadingIndicator').remove();
        reject(error);
      });
  });
};


const buildMostCommonGradeDict = () => {
  return buildDictionary(
    data => {
      let totalStudents = data.total_students;
      let totalGrades = data.total_grades;
      let numberOfAs = totalGrades["A"];
      return (numberOfAs / totalStudents) * 100;
    },
    courseMostCommonGradeDict
  );
};

const buildCourseAvgDict = () => {
  return buildDictionary(
    data => {
      const gpaValues = {
        "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0,
        "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7,
        "D+": 1.3, "D": 1.0, "F": 0.0
      };

      let allGrades = data.total_grades;
      let totalStudents = 0;
      let totalWeightedGpa = 0;

      for (let grade in allGrades) {
        if (gpaValues.hasOwnProperty(grade)) {
          let numberOfStudents = allGrades[grade];
          let gpaValue = gpaValues[grade];
          totalStudents += numberOfStudents;
          totalWeightedGpa += numberOfStudents * gpaValue;
        }
      }

      return totalWeightedGpa / totalStudents;
    },
    courseAvgDict
  );
};

const buildPopularityDict = () => {
  return buildDictionary(
    data => data.total_students,
    coursePopularityDict
  );
};

const buildUnitsDict = () => {
  return buildDictionary(
    data => data.cred_min,
    courseUnitsDict
  );
};


function resetDictionaries() {
  courseMostCommonGradeDict = {};
  courseAvgDict = {};
  coursePopularityDict = {};
  courseUnitsDict = {};
  courseSizeDict = {};
}
