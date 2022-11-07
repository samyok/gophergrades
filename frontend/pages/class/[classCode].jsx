import React from "react";
import { Badge, Heading, HStack, Tag, Text, VStack } from "@chakra-ui/react";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/SearchBar";
import { getClassInfo, getDistribution } from "../../lib/db";
import Card from "../../components/Card";
import Stats from "../../components/Stats";

const LetterToColor = {
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
};

export default function Class({ classData }) {
  // const handleChange = (value) => {
  //   console.log(value);
  // };
  const {
    class_name: className,
    class_desc: classDesc,
    // department_id: departmentId,
  } = classData;
  // useEffect(() => {
  //   console.log(classData);
  // }, []);
  const distributions = classData.distributions
    .filter((dist) => dist.professor_name)
    .map((distribution) => ({ ...distribution, ...Stats({ distribution }) }))
    .sort((a, b) => (b.averageGPA < a.averageGPA ? -1 : 1))
    .map((dist) => {
      const profName =
        dist.professor_name?.split(",").reverse().join(" ") ?? "Unknown";
      return (
        <Card key={dist.distribution_id}>
          <HStack justify={"space-between"} align={"center"} width={"100%"}>
            <VStack align={"start"}>
              <Text fontSize={"lg"} fontWeight={"bold"}>
                {profName}
              </Text>
              <HStack>
                <Tag colorScheme={LetterToColor?.[dist.averageGradeLetter]}>
                  {dist.averageGradeLetter} Average ({dist.averageGPA})
                </Tag>
                <Tag colorScheme={LetterToColor?.[dist.mostStudents]}>
                  Most Common: {dist.mostStudents} ({dist.mostStudentsPercent}%)
                </Tag>
              </HStack>
            </VStack>
            <VStack>
              {dist.Component}
              <HStack>
                <Badge>{dist.students} students</Badge>
                <Badge
                  colorScheme={
                    dist.grades.W / dist.students > 0.075 ? "red" : "blackAlpha"
                  }
                >
                  {dist.grades.W} W
                </Badge>
              </HStack>
            </VStack>
          </HStack>
        </Card>
      );
    });
  return (
    <PageLayout title={`${classDesc} (${className}) | GopherGrades`}>
      <VStack spacing={4} py={8} align={"start"}>
        <SearchBar onChange={() => {}} placeholder={"Back to search"} />
        <Heading>
          {className}: {classDesc}
        </Heading>
        <VStack spacing={4} align={"start"} width={"100%"}>
          {distributions}
        </VStack>
      </VStack>
    </PageLayout>
  );
}

export async function getServerSideProps({ res, params }) {
  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${60 * 60 * 24 * 7}, stale-while-revalidate=${
      60 * 60 * 24 * 30 // if loaded within a month, use the stale cache, but re-render in the background
    }`
  );
  if (!params.classCode) {
    return {
      redirect: {
        destination: `/`,
        permanent: false,
      },
    };
  }

  const { classCode } = params;

  const info = await getClassInfo(classCode);

  if (info.length === 0) {
    return {
      redirect: {
        destination: `/?q=${classCode}`,
        permanent: false,
      },
    };
  }

  const distributions = await getDistribution(classCode);

  return {
    props: {
      classData: {
        ...info[0],
        distributions,
      },
    },
  };
}
