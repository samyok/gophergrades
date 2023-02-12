import React from "react";
import {
  Box,
  Collapse,
  Divider,
  Heading,
  HStack,
  useMediaQuery,
  VStack,
} from "@chakra-ui/react";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/Search/SearchBar";
import { getInstructorClasses, getInstructorInfo } from "../../lib/db";
import { distributionsToCards } from "../../components/distributionsToCards";
import { useSearch } from "../../components/Search/useSearch";
import SearchResults from "../../components/Search/SearchResults";
import BigNumberCard from "../../components/BigNumberCard";

export default function Prof({ profData }) {
  const {
    id,
    name,
    distributions,
    RMP_link: RMPLink,
    RMP_score: RMPScore,
    RMP_diff: RMPDiff,
  } = profData;
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
    students: formattedDistributions.reduce(
      (acc, curr) => acc + (curr.students || 0),
      0
    ),
    title: `${name}`,
    isSummary: true,
    info: "This total also includes classes that they may not teach anymore.",
    distribution_id: id,
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
      title={`${name} | GopherGrades`}
      imageURL={`${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : ""
      }/api/image/prof/${id}`}
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
          <Heading my={4}>{name}</Heading>
          <VStack spacing={4} align={"start"} pb={4} minH={"60vh"}>
            {RMPScore && (
              <HStack spacing={4} width={"100%"}>
                <BigNumberCard
                  href={RMPLink}
                  source={"Rate My Professor"}
                  val={RMPScore.toFixed(1)}
                  outOf={5}
                />
                <BigNumberCard
                  href={RMPLink}
                  source={"Difficulty"}
                  val={RMPDiff.toFixed(1)}
                  outOf={5}
                />
              </HStack>
            )}
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
  if (!params.profCode) {
    return {
      redirect: {
        destination: `/`,
        permanent: false,
      },
    };
  }

  const { profCode } = params;

  const info = await getInstructorInfo(profCode);

  if (info.length === 0) {
    return {
      redirect: {
        destination: `/?q=${profCode}`,
        permanent: false,
      },
    };
  }

  const distributions = await getInstructorClasses(profCode);

  return {
    props: {
      profData: {
        ...info[0],
        distributions,
      },
    },
  };
}
