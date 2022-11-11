import { GRADE_ORDER } from "../../lib/letterTo";

export const StaticAreaChart = ({ distribution, averageGPA }) => {
  const scale = 3.5;
  const AREA_GRAPH_HEIGHT = 50 * scale;
  const AREA_GRAPH_WIDTH = 300 * scale;

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

  return (
    <svg
      height={AREA_GRAPH_HEIGHT}
      width={AREA_GRAPH_WIDTH}
      viewBox={`0 0 ${AREA_GRAPH_WIDTH} ${AREA_GRAPH_HEIGHT}`}
      fill={"#5B0013"}
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
    </svg>
  );
};
