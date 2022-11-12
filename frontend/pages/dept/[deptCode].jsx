import React from "react";
import {
  Box,
  Collapse,
  Divider,
  Heading,
  useMediaQuery,
  VStack,
} from "@chakra-ui/react";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/Search/SearchBar";
import { getClassDistribtionsInDept, getDeptInfo } from "../../lib/db";
import { distributionsToCards } from "../../components/distributionsToCards";
import { useSearch } from "../../components/Search/useSearch";
import SearchResults from "../../components/Search/SearchResults";

export default function Dept({ deptData }) {
  const { dept_abbr: deptAbbr, dept_name: deptName, distributions } = deptData;
  const [isMobile] = useMediaQuery("(max-width: 550px)");

  const {
    search,
    searchResults,
    pageShown: [showPage, setShowPage],
    handleChange,
  } = useSearch();

  // map all class distribution to a proper format:
  const formattedDistributions = distributions.map((dist) => ({
    ...dist,
    grades: dist.total_grades,
    students: dist.total_students,
    title: `${dist.class_name}: ${dist.class_desc}`,
    href: `/class/${dist.class_name.replace(" ", "")}`,
  }));

  const totalDistribution = {
    // take every distributions grades map and sum up each key
    grades: formattedDistributions.reduce(
      (acc, curr) => ({
        ...acc,
        ...Object.fromEntries(
          Object.entries(curr.grades).map(([key, val]) => [
            key,
            (acc[key] || 0) + val,
          ])
        ),
      }),
      {}
    ),
    students: distributions.reduce(
      (acc, curr) => acc + (curr.total_students || 0),
      0
    ),
    title: `Overall Classes in ${deptAbbr}`,
    isSummary: true,
    info: "This total also includes classes that may not currently be offered.",
    distribution_id: deptAbbr,
  };

  const totalDistributions = distributionsToCards(
    [totalDistribution],
    isMobile
  );

  const renderedDistributions = distributionsToCards(
    formattedDistributions,
    isMobile,
    "NONE"
  );

  return (
    <PageLayout
      title={`${deptAbbr}: ${deptName} | GopherGrades`}
      imageURL={`${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : ""
      }/api/image/dept/${deptAbbr}`}
    >
      <Box py={8} align={"start"} width={"100%"}>
        <SearchBar placeholder={search || undefined} onChange={handleChange} />
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
          <Heading my={4}>
            {deptAbbr}: {deptName}
          </Heading>
          <VStack spacing={4} align={"start"} pb={4} minH={"60vh"}>
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
  if (!params.deptCode) {
    return {
      redirect: {
        destination: `/`,
        permanent: false,
      },
    };
  }

  const { deptCode } = params;

  const info = await getDeptInfo(deptCode);

  if (info.length === 0) {
    return {
      redirect: {
        destination: `/?q=${deptCode}`,
        permanent: false,
      },
    };
  }

  const distributions = await getClassDistribtionsInDept(deptCode);

  return {
    props: {
      deptData: {
        ...info[0],
        distributions,
      },
    },
  };
}
