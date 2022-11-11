import { useState } from "react";
import { BAR_GRADES } from "../../lib/letterTo";

export const BarChart = ({ distribution, isMobile = true }) => {
  const { isSummary } = distribution;
  let scale = isSummary ? 1.3 : 1;
  if (isMobile) scale = 0.8;

  const BAR_GRAPH_HEIGHT = 50 * scale;
  const BAR_GRAPH_WIDTH = 75 * scale;

  const { grades } = distribution;
  // create a bar graph of the grade distribution of S, P, N, and W only in that order

  // filter out grades that aren't in the bar graph, and sort them to be in that order
  // also, for each of P and NG, if there are no students in that grade, don't show that bar
  const filteredGrades = Object.entries(grades)
    .filter(([grade]) => BAR_GRADES.includes(grade))
    .sort(
      ([gradeA], [gradeB]) =>
        BAR_GRADES.indexOf(gradeA) - BAR_GRADES.indexOf(gradeB)
    )
    .filter(([grade]) => grade !== "P" || grades.P > 0)
    .filter(([grade]) => grade !== "NG" || grades.NG > 0);

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
