import React from "react";
import {
  Box,
  Collapse,
  Divider,
  Heading,
  Link as ChakraLink,
  Stack,
  Tag,
  useMediaQuery,
  VStack,
  Wrap,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageLayout from "../../components/Layout/PageLayout";
import SearchBar from "../../components/Search/SearchBar";
import { getClassInfo, getDistribution } from "../../lib/db";
import { distributionsToCards } from "../../components/distributionsToCards";
import { useSearch } from "../../components/Search/useSearch";
import SearchResults from "../../components/Search/SearchResults";
import BigNumberCard from "../../components/BigNumberCard";

const SPECIAL_TAGS = ["Honors", "Freshman Seminar"];

export default function Class({ classData, query }) {
  const {
    class_name: className,
    class_desc: classDesc,
    distributions,
    libEds,
    onestop,
    cred_min: creditMin,
    cred_max: creditMax,
    deep_und: deepUnderstanding,
    stim_int: interestStimulated,
    // tech_eff: techEfficient,
    acc_sup: activitiesSupported,
    effort,
    // grad_stand: gradStanding,
    recommend,
    responses: srtResponses,
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
    isMobile,
    "NONE",
    !!query.static
  );

  const pageLayoutProps = {
    title: `${classDesc} (${className}) | GopherGrades`,
    imageURL: `${
      process.env.NEXT_PUBLIC_VERCEL_URL
    }/api/image/class/${className.replace(" ", "")}`,
  };

  const formattedDistributions = distributions.map((dist) => ({
    ...dist,
    href: `/prof/${dist.professor_id}`,
    title: dist.professor_name,
    rating: dist.professor_RMP_score,
  }));

  if (query.static === "all")
    return (
      <PageLayout {...pageLayoutProps} scriptOnly>
        {totalDistributions}
      </PageLayout>
    );
  if (query.static) {
    const filtered = formattedDistributions.filter((dist) =>
      dist.title.toLowerCase().includes(query.static.toLowerCase())
    );

    return (
      <PageLayout {...pageLayoutProps} scriptOnly>
        {distributionsToCards(filtered, isMobile, "NONE", true)}
      </PageLayout>
    );
  }

  const renderedDistributions = distributionsToCards(
    formattedDistributions,
    isMobile
  );

  const libEdTags = libEds
    .sort(
      (a, b) =>
        SPECIAL_TAGS.includes(b.name) - SPECIAL_TAGS.includes(a.name) ||
        a.name.localeCompare(b.name)
    )
    .map((libEd) => (
      <Tag
        key={libEd.id}
        colorScheme={SPECIAL_TAGS.includes(libEd.name) ? "yellow" : "blue"}
        variant={"solid"}
        size={"sm"}
      >
        {libEd.name}
      </Tag>
    ));

  return (
    <PageLayout {...pageLayoutProps}>
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
          <Heading mt={4}>
            {className}: {classDesc}
          </Heading>
          <Stack direction={["column", "row"]} mt={1} spacing={2} wrap={"wrap"}>
            {creditMin !== null && (
              <Tag size={"md"}>
                {creditMin + (creditMax > creditMin ? `-${creditMax}` : "")}{" "}
                Credit{creditMax > 1 ? "s" : ""}
              </Tag>
            )}
            {libEdTags}
          </Stack>
          <Stack my={4} direction={["column", "row"]}>
            {onestop && (
              <ChakraLink as={NextLink} href={onestop} isExternal>
                OneStop
                <ExternalLinkIcon mx={1} mb={1} />
              </ChakraLink>
            )}
            <ChakraLink as={NextLink} href={`/dept/${classData.dept_abbr}`}>
              {classData.dept_name} Department
              <ExternalLinkIcon mx={1} mb={1} />
            </ChakraLink>
          </Stack>
          <VStack spacing={4} align={"start"} pb={4} minH={"60vh"}>
            {totalDistributions}
            <Wrap spacing={"8px"} width={"100%"} overflow={"visible"} mb={2}>
              {recommend && (
                <BigNumberCard
                  source={"Recommend"}
                  tooltip={`I would recommend this class to a friend. (${srtResponses} responses)`}
                  val={recommend.toFixed(2)}
                  outOf={5}
                />
              )}
              {effort && (
                <BigNumberCard
                  source={"Effort"}
                  tooltip={`Effort needed to succeed is reasonable. (${srtResponses} responses)`}
                  val={effort.toFixed(2)}
                  outOf={5}
                />
              )}
              {/* {gradStanding && ( */}
              {/*  <BigNumberCard */}
              {/*    source={"Graduate Standing"} */}
              {/*    val={gradStanding.toFixed(2)} */}
              {/*    outOf={5} */}
              {/*  /> */}
              {/* )} */}
              {deepUnderstanding && (
                <BigNumberCard
                  source={"Understanding"}
                  tooltip={`Deeper understanding of the subject matter. (${srtResponses} responses)`}
                  val={deepUnderstanding.toFixed(2)}
                  outOf={5}
                />
              )}
              {interestStimulated && (
                <BigNumberCard
                  source={"Interesting"}
                  tooltip={`Interest in the subject matter was stimulated. (${srtResponses} responses)`}
                  val={interestStimulated.toFixed(2)}
                  outOf={5}
                />
              )}
              {/* {techEfficient && ( */}
              {/*  <BigNumberCard */}
              {/*    source={"Technology Efficient"} */}
              {/*    val={techEfficient.toFixed(2)} */}
              {/*    outOf={5} */}
              {/*  /> */}
              {/* )} */}
              {activitiesSupported && (
                <BigNumberCard
                  source={"Activities"}
                  tooltip={"Activities in course supported learning."}
                  val={activitiesSupported.toFixed(2)}
                  outOf={5}
                />
              )}
            </Wrap>
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

export async function getServerSideProps({ res, params, query }) {
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

  if (info.length === 0 && !query.static) {
    return {
      redirect: {
        destination: `/?q=${classCode}`,
        permanent: false,
      },
    };
  }
  if (info.length === 0 && query.static) {
    return {
      notFound: true,
    };
  }

  const distributions = await getDistribution(classCode);

  if (query.static && query.static !== "all") {
    const filtered = distributions.filter((dist) =>
      dist.professor_name.toLowerCase().includes(query.static.toLowerCase())
    );
    if (filtered.length === 0) {
      return {
        notFound: true,
      };
    }
  }

  return {
    props: {
      classData: {
        ...info[0],
        distributions,
      },
      query,
    },
  };
}
