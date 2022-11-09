export const StaticBarChart = ({ distribution }) => {
  const scale = 3.5;
  const BAR_GRAPH_HEIGHT = 50 * scale;
  const BAR_GRAPH_WIDTH = 30 * scale;

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

  return (
    <svg
      height={BAR_GRAPH_HEIGHT}
      width={BAR_GRAPH_WIDTH}
      viewBox={`0 0 ${BAR_GRAPH_WIDTH} ${BAR_GRAPH_HEIGHT}`}
      fill={"#5B0013"}
    >
      {barHeights.map(([grade, , height, color], i) => (
        <g key={grade}>
          <rect
            x={i * barWidth}
            y={BAR_GRAPH_HEIGHT - height}
            width={barWidth}
            height={height}
            style={{
              fill: color,
              opacity: 0.1,
            }}
          />
        </g>
      ))}
    </svg>
  );
};
