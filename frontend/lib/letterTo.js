const LETTER_TO_COLOR = {
  "A+": "green",
  A: "green",
  "A-": "green",
  "B+": "yellow",
  B: "yellow",
  "B-": "yellow",
  "C+": "orange",
  C: "orange",
  "C-": "orange",
  "D+": "red",
  D: "red",
  "D-": "red",
  F: "red",
  W: "pink",
  P: "purple",
  S: "blue",
  N: "red",
};

export const GPA_MAP = {
  "A+": 4.333,
  A: 4,
  "A-": 3.667,
  "B+": 3.333,
  B: 3,
  "B-": 2.667,
  "C+": 2.333,
  C: 2,
  "C-": 1.667,
  "D+": 1.333,
  D: 1,
  "D-": 0.667,
  F: 0,
};

export const GRADE_ORDER = [
  "F",
  "D-",
  "D",
  "D+",
  "C-",
  "C",
  "C+",
  "B-",
  "B",
  "B+",
  "A-",
  "A",
  "A+",
];

export const BAR_GRADES = ["NG", "S", "P", "N", "W"];

export const letterToColor = (letter) => {
  if (letter === undefined || !LETTER_TO_COLOR[letter]) return "blackAlpha";
  return LETTER_TO_COLOR[letter];
};

export const RMPToColor = (rating) => {
  if (rating === undefined) return "blackAlpha";
  if (rating >= 4) return "green";
  if (rating >= 3.5) return "yellow";
  if (rating >= 3) return "orange";
  if (rating >= 2.5) return "red";
  return "pink";
};

export const letterToGpa = (letter) => {
  if (letter === undefined || !GPA_MAP[letter]) return 0;
  return GPA_MAP[letter];
};

/**
 * Converts a term number to a pretty name
 * @param term
 * @returns {string}
 */
export const termToName = (term) => {
  const year = 1900 + Math.floor(term / 10);

  switch (term % 10) {
    case 3:
      return `Spring ${year}`;
    case 5:
      return `Summer ${year}`;
    case 9:
      return `Fall ${year}`;
    default:
      return "Invalid Term";
  }
};
