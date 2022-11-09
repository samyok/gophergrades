import React from "react";
import { Divider, Heading, useMediaQuery, VStack } from "@chakra-ui/react";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/SearchBar";
import { getClassInfo, getDistribution } from "../../lib/db";
import { distributionsToCards } from "../../components/distributionsToCards";

export default function Class({ classData }) {
  const { class_name: className, class_desc: classDesc } = classData;
  const [isMobile] = useMediaQuery("(max-width: 550px)");

  const totalDistributions = distributionsToCards(
    [
      {
        grades: classData.total_grades,
        students: classData.total_students,
        professor_name: "All Instructors",
        distribution_id: classData.id,
        isSummary: true,
        info: "This total also includes data from semesters with unknown instructors.",
      },
    ],
    isMobile
  );

  const distributions = distributionsToCards(classData.distributions, isMobile);

  return (
    <PageLayout
      title={`${classDesc} (${className}) | GopherGrades`}
      imageURL={`${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : ""
      }/api/image/class/${className.replace(" ", "")}`}
    >
      <VStack spacing={4} py={8} align={"start"}>
        <SearchBar onChange={() => {}} placeholder={"Back to search"} />
        <Heading>
          {className}: {classDesc}
        </Heading>
        <VStack spacing={4} align={"start"} width={"100%"}>
          {totalDistributions}
          <Divider
            orientation={"horizontal"}
            style={{
              borderColor: "#49080F",
              borderBottomWidth: 1,
              opacity: 0.15,
            }}
          />
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
