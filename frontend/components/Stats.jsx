import { useState } from "react";

const GRADE_ORDER = [
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

const GPA_MAP = {
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

const HEIGHT = 50;
const WIDTH = 300;

const Graph = ({ distribution, averageGPA }) => {
  const [hovered, setHovered] = useState(false);
  const [hoveredGrade, setHoveredGrade] = useState(null);

  const { grades } = distribution;
  const hasAPlus = grades?.["A+"] > 0;

  const maxGrade = Math.max(...Object.values(grades ?? {}));

  const points = `0,${HEIGHT} ${GRADE_ORDER.filter(
    (grade) => hasAPlus || grade !== "A+"
  )
    .map(
      (grade, index, arr) =>
        `${(WIDTH * index) / (arr.length - 1)},${
          HEIGHT * (1 - (grades?.[grade] ?? 0) / maxGrade)
        }`
    )
    .join(" ")} ${WIDTH},${HEIGHT}`;

  const maxGPA = hasAPlus ? 4.333 : 4;

  // get mouse coordinates relative to the graph
  const getMouseCoords = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  const numGrades = GRADE_ORDER.length - (hasAPlus ? 0 : 1);

  const handleMouseMove = (e) => {
    const { x, y } = getMouseCoords(e);

    // get the grade that the mouse is over
    const grade = GRADE_ORDER[Math.floor((x / WIDTH) * numGrades)];

    // get the number of students that got that grade
    const gradeCount = grades?.[grade] ?? 0;

    // get the GPA that the mouse is over
    const gpa = GPA_MAP[grade];

    // if the mouse is over the graph, show the tooltip
    if (x > 0 && x < WIDTH && y > 0 && y < HEIGHT) {
      setHovered(true);
      setHoveredGrade({
        grade,
        gradeCount,
        gpa,
      });
    } else {
      setHoveredGrade(null);
      setHovered(false);
    }
  };
  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);

  return (
    <svg
      height={"50"}
      width={"300"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <defs>
        <linearGradient
          id={"trafficLight"}
          x1={"0"}
          y1={"0.5"}
          x2={"1"}
          y2={"0.5"}
        >
          <stop offset={"0%"} stopColor={"#ff0000"} />
          <stop offset={"40.5%"} stopColor={"#ec6c17"} />
          <stop offset={"50%"} stopColor={"#e89029"} />
          <stop offset={"70%"} stopColor={"#ecc94b"} />
          <stop offset={"80%"} stopColor={"#c0c246"} />
          <stop offset={"90%"} stopColor={"#93ba41"} />
          <stop offset={"100%"} stopColor={"#38a169"} />
        </linearGradient>
      </defs>
      {hovered && hoveredGrade && (
        <g>
          <line
            x1={0}
            y1={HEIGHT * (1 - (hoveredGrade.gradeCount ?? 0) / maxGrade)}
            x2={WIDTH}
            y2={HEIGHT * (1 - (hoveredGrade.gradeCount ?? 0) / maxGrade)}
            style={{
              stroke: "rgba(0, 0, 0, 0.025)",
              strokeWidth: 4,
            }}
          />
          <line
            x1={
              (WIDTH * GRADE_ORDER.indexOf(hoveredGrade.grade)) /
              (numGrades - 1)
            }
            y1={0}
            x2={
              (WIDTH * GRADE_ORDER.indexOf(hoveredGrade.grade)) /
              (numGrades - 1)
            }
            y2={HEIGHT}
            style={{
              stroke: "rgba(0, 0, 0, 0.1)",
              strokeWidth: 4,
            }}
          />
          <circle
            cx={
              (WIDTH * GRADE_ORDER.indexOf(hoveredGrade.grade)) /
              (numGrades - 1)
            }
            cy={HEIGHT * (1 - (hoveredGrade.gradeCount ?? 0) / maxGrade)}
            r={3}
            style={{
              fill: "rgba(0, 0, 0, 0.5)",
            }}
          />
          <text
            x={WIDTH / 2}
            y={HEIGHT / 8}
            style={{
              textAnchor: "middle",
              dominantBaseline: "middle",
              fontSize: 12,
              userSelect: "none",
            }}
          >
            {hoveredGrade.gradeCount} students got a
            {hoveredGrade.grade.startsWith("A") ||
            hoveredGrade.grade.startsWith("F")
              ? "n"
              : ""}{" "}
            {hoveredGrade.grade}
          </text>
        </g>
      )}
      <line
        x1={(WIDTH * averageGPA) / maxGPA}
        y1={0}
        x2={(WIDTH * averageGPA) / maxGPA}
        y2={HEIGHT}
        style={{
          stroke: "rgba(0, 0, 0, 0.25)",
          strokeWidth: 1,
        }}
      />
      <polygon
        points={points}
        style={{
          opacity: 0.7,
          // fill: "rgba(0, 0, 0, 0.1)",
          fill: 'url("#trafficLight")',
        }}
      />
    </svg>
  );
};

export default function Stats({ distribution = {} }) {
  const { grades } = distribution;

  const impactingGrades = Object.entries(grades ?? {}).filter(([grade]) =>
    Object.keys(GPA_MAP).includes(grade)
  );
  const totalStudents = impactingGrades.reduce(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (acc, [_, count]) => acc + count,
    0
  );
  const averageGPA = (
    impactingGrades.reduce(
      (acc, [grade, count]) => acc + GPA_MAP[grade] * count,
      0
    ) / totalStudents
  ).toFixed(3);

  // find closest letter grade to averageGPA
  const averageGradeLetter = Object.entries(GPA_MAP).reduce(
    (acc, [letter, gpa]) => {
      if (Math.abs(gpa - averageGPA) < Math.abs(acc[1] - averageGPA)) {
        return [letter, gpa];
      }
      return acc;
    }
  )[0];

  // get the letter grade with the most students
  const mostStudents = impactingGrades.reduce(
    (acc, [grade, count]) => (count > acc[1] ? [grade, count] : acc),
    ["", 0]
  )[0];

  // what percentage of the students got the most common grade
  const mostStudentsPercent = (
    (100 * (grades?.[mostStudents] ?? 0)) /
    totalStudents
  ).toFixed(0);

  return {
    Component: <Graph distribution={distribution} averageGPA={averageGPA} />,
    averageGPA,
    averageGradeLetter,
    mostStudents,
    mostStudentsPercent,
  };
}
