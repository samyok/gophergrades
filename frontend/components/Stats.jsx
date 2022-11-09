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

const GRAPH_HEIGHT = 50;
const AREA_GRAPH_HEIGHT = GRAPH_HEIGHT;
const AREA_GRAPH_WIDTH = 300;

const BAR_GRAPH_HEIGHT = GRAPH_HEIGHT;
const BAR_GRAPH_WIDTH = 75;

const Graph = ({ distribution, averageGPA }) => {
  const [hovered, setHovered] = useState(false);
  const [hoveredGrade, setHoveredGrade] = useState(null);

  const { grades } = distribution;
  const hasAPlus = grades?.["A+"] > 0;

  const maxGrade = Math.max(...Object.values(grades ?? {}));

  const points = `0,${AREA_GRAPH_HEIGHT} ${GRADE_ORDER.filter(
    (grade) => hasAPlus || grade !== "A+"
  )
    .map(
      (grade, index, arr) =>
        `${(AREA_GRAPH_WIDTH * index) / (arr.length - 1)},${
          AREA_GRAPH_HEIGHT * (1 - (grades?.[grade] ?? 0) / maxGrade)
        }`
    )
    .join(" ")} ${AREA_GRAPH_WIDTH},${AREA_GRAPH_HEIGHT}`;

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
    const grade = GRADE_ORDER[Math.floor((x / AREA_GRAPH_WIDTH) * numGrades)];

    // get the number of students that got that grade
    const gradeCount = grades?.[grade] ?? 0;

    // get the GPA that the mouse is over
    const gpa = GPA_MAP[grade];

    // if the mouse is over the graph, show the tooltip
    if (x > 0 && x < AREA_GRAPH_WIDTH && y > 0 && y < AREA_GRAPH_HEIGHT) {
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

  const hoverCoordinates =
    hovered && hoveredGrade
      ? {
          closestGrade: {
            y:
              AREA_GRAPH_HEIGHT *
              (1 - (hoveredGrade.gradeCount ?? 0) / maxGrade),
            x:
              (AREA_GRAPH_WIDTH * GRADE_ORDER.indexOf(hoveredGrade.grade)) /
              (numGrades - 1),
          },
        }
      : {};

  return (
    <svg
      height={AREA_GRAPH_HEIGHT}
      width={AREA_GRAPH_WIDTH}
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
          <stop offset={"65%"} stopColor={"#ecc94b"} />
          <stop offset={"80%"} stopColor={"#ecc94b"} />
          <stop offset={"85%"} stopColor={"#c0c246"} />
          <stop offset={"90%"} stopColor={"#93ba41"} />
          <stop offset={"95%"} stopColor={"#38a169"} />
          <stop offset={"100%"} stopColor={"#38a169"} />
        </linearGradient>
      </defs>
      <line
        x1={(AREA_GRAPH_WIDTH * averageGPA) / maxGPA}
        y1={0}
        x2={(AREA_GRAPH_WIDTH * averageGPA) / maxGPA}
        y2={AREA_GRAPH_HEIGHT}
        style={{
          stroke: "rgba(0, 0, 0, 0.25)",
          strokeWidth: 1,
        }}
      />
      <polygon
        points={points}
        style={{
          opacity: 0.7,
          fill: 'url("#trafficLight")',
        }}
      />
      {hovered && hoveredGrade && (
        <g>
          <line
            x1={0}
            y1={hoverCoordinates.closestGrade.y}
            x2={AREA_GRAPH_WIDTH}
            y2={hoverCoordinates.closestGrade.y}
            style={{
              stroke: "rgba(0, 0, 0, 0.025)",
              strokeWidth: 4,
            }}
          />
          <line
            x1={hoverCoordinates.closestGrade.x}
            y1={0}
            x2={hoverCoordinates.closestGrade.x}
            y2={AREA_GRAPH_HEIGHT}
            style={{
              stroke: "rgba(0, 0, 0, 0.1)",
              strokeWidth: 4,
            }}
          />
          <circle
            cx={hoverCoordinates.closestGrade.x}
            cy={hoverCoordinates.closestGrade.y}
            r={3}
            style={{
              fill: "rgba(0, 0, 0, 0.5)",
            }}
          />
          <text
            x={AREA_GRAPH_WIDTH / 2}
            y={AREA_GRAPH_HEIGHT / 4}
            style={{
              textAnchor: "middle",
              dominantBaseline: "middle",
              fontSize: 12,
              userSelect: "none",
              fontWeight: "bold",
              fill: "#1B202B",
            }}
          >
            {hoveredGrade.gradeCount} student
            {hoveredGrade.gradeCount > 1 && "s"} got a
            {hoveredGrade.grade.startsWith("A") ||
            hoveredGrade.grade.startsWith("F")
              ? "n"
              : ""}{" "}
            {hoveredGrade.grade}
          </text>
        </g>
      )}
    </svg>
  );
};

const BarChart = ({ distribution }) => {
  const { grades } = distribution;
  // create a bar graph of the grade distribution of S, P, N, and W only in that order

  const barGrades = ["S", "P", "N", "W"];

  // filter out grades that aren't in the bar graph, and sort them to be in that order
  // also, if there are no P grades, don't show that bar
  const filteredGrades = Object.entries(grades)
    .filter(([grade]) => barGrades.includes(grade))
    .sort(
      ([gradeA], [gradeB]) =>
        barGrades.indexOf(gradeA) - barGrades.indexOf(gradeB)
    )
    .filter(([grade]) => grade !== "P" || grades.P > 0);

  // get the max value of ALL the grades so the graphs have the same scale
  const maxValue = Math.max(...Object.values(grades));

  const totalStudents = Object.values(grades).reduce(
    (total, gradeCount) => total + gradeCount,
    0
  );

  const barWidth = BAR_GRAPH_WIDTH / filteredGrades.length;

  // leave 10 pixels of padding on the top, and create an array of [grade, count, height, color] for each bar
  // the color should be "red" if the grade is "W" and the number of Ws is greater than 7.5% of the total number of grades, otherwise it should be "rgba(0,0,0,0.5)"
  const barHeights = filteredGrades.map(([grade, count]) => [
    grade,
    count,
    (count / maxValue) * BAR_GRAPH_HEIGHT,
    grade === "W" && count > 0.075 * totalStudents ? "#ff0d14" : "#1B202B",
  ]);

  // if a bar is hovered over, change the color to "rgba(0,0,0,0.5)" and change the text of that bar to be the number of students who got that grade

  const [hovered, setHovered] = useState(false);
  const [hoveredGrade, setHoveredGrade] = useState(null);

  const handleMouseEnter = () => setHovered(true);

  const handleMouseLeave = () => {
    setHovered(false);
    setHoveredGrade(null);
  };

  const handleMouseMove = (event) => {
    const { clientX } = event;
    const { left } = event.currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const barIndex = Math.floor(x / barWidth);
    setHoveredGrade(barIndex);
  };

  return (
    <svg
      height={BAR_GRAPH_HEIGHT}
      width={BAR_GRAPH_WIDTH}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {
        // create a bar and label for each grade
        barHeights.map(([grade, , height, color], i) => (
          <g key={grade}>
            {/*  if it's hovered, show the same sort of vertical line as above */}
            {hovered && hoveredGrade === i && (
              <line
                x1={i * barWidth + barWidth / 2}
                y1={0}
                x2={i * barWidth + barWidth / 2}
                y2={BAR_GRAPH_HEIGHT}
                style={{
                  stroke: "rgba(0, 0, 0, 0.1)",
                  strokeWidth: 4,
                }}
              />
            )}

            <rect
              x={i * barWidth}
              y={BAR_GRAPH_HEIGHT - height}
              width={barWidth}
              height={height}
              style={{
                fill: color,
                opacity: hovered && hoveredGrade === i ? 0.2 : 0.1,
              }}
            />

            <text
              x={i * barWidth + barWidth / 2}
              // if the text is off the top of the graph, move it down
              y={Math.max(BAR_GRAPH_HEIGHT - height - 10, 10)}
              style={{
                textAnchor: "middle",
                dominantBaseline: "middle",
                fontSize: 9,
                userSelect: "none",
                fontWeight: "bold",
                fill: color,
              }}
            >
              {hovered && hoveredGrade === i ? grades[grade] : grade}
            </text>
          </g>
        ))
      }
    </svg>
  );
};

export default function Stats({ distribution = {} }) {
  const { grades } = distribution;

  const impactingGrades = Object.entries(grades ?? {}).filter(([grade]) =>
    Object.keys(GPA_MAP).includes(grade)
  );

  const allGrades = Object.entries(grades ?? {});

  const totalStudents = allGrades.reduce(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (acc, [_, count]) => acc + count,
    0
  );

  const totalImpactingStudents = impactingGrades.reduce(
    (acc, [, count]) => acc + count,
    0
  );

  const averageGPA = (
    impactingGrades.reduce(
      (acc, [grade, count]) => acc + GPA_MAP[grade] * count,
      0
    ) / totalImpactingStudents
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
  const mostStudents = allGrades.reduce(
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
    BarChart: <BarChart distribution={distribution} />,
    averageGPA,
    averageGradeLetter,
    mostStudents,
    mostStudentsPercent,
  };
}
