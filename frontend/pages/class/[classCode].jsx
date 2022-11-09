import React from "react";
import {
  Box,
  Text,
  Collapse,
  Divider,
  Heading,
  Link as ChakraLink,
  useMediaQuery,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/Search/SearchBar";
import { getClassInfo, getDistribution } from "../../lib/db";
import { distributionsToCards } from "../../components/distributionsToCards";
import { useSearch } from "../../components/Search/useSearch";
import SearchResults from "../../components/Search/SearchResults";

export default function Class({ classData }) {
  const {
    class_name: className,
    class_desc: classDesc,
    distributions,
  } = classData;
  const [isMobile] = useMediaQuery("(max-width: 550px)");
  const {
    search,
    searchResults,
    pageShown: [showPage, setShowPage],
    handleChange,
  } = useSearch();

  const totalDistributions = distributionsToCards(
    [
      {
        grades: classData.total_grades,
        students: classData.total_students,
        title: "All Instructors",
        distribution_id: classData.id,
        isSummary: true,
        info: "This total also includes data from semesters with unknown instructors.",
      },
    ],
    isMobile
  );

  const formattedDistributions = distributions.map((dist) => ({
    ...dist,
    href: `/prof/${dist.professor_id}`,
    title: dist.professor_name,
  }));

  const renderedDistributions = distributionsToCards(
    formattedDistributions,
    isMobile
  );

  return (
    <PageLayout
      title={`${classDesc} (${className}) | GopherGrades`}
      imageURL={`${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : ""
      }/api/image/class/${className.replace(" ", "")}`}
    >
      <Box py={8} align={"start"} width={"100%"}>
        <SearchBar onChange={handleChange} />
        <SearchResults
          searchResults={searchResults}
          search={search}
          pageShown={[showPage, setShowPage]}
        />
        <Collapse
          in={showPage}
          animateOpacity
          style={{
            width: "100%",
            paddingRight: 10,
            paddingLeft: 10,
          }}
        >
          <Heading mt={4}>
            {className}: {classDesc}
          </Heading>
          <Text mb={4} mt={2} opacity={0.8}>
            <NextLink href={`/dept/${classData.dept_abbr}`} passHref>
              <ChakraLink>View {classData.dept_name} Department</ChakraLink>
            </NextLink>
          </Text>
          <VStack spacing={4} align={"start"}>
            {totalDistributions}
            <Divider
              orientation={"horizontal"}
              style={{
                borderColor: "#49080F",
                borderBottomWidth: 1,
                opacity: 0.15,
              }}
            />
            {renderedDistributions}
          </VStack>
        </Collapse>
      </Box>
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
