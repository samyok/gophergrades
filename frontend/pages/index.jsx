import React from "react";
import {
  Box,
  chakra,
  Collapse,
  Flex,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import PageLayout from "../components/Layout/PageLayout";
import SearchBar from "../components/Search/SearchBar";
import SearchResults from "../components/Search/SearchResults";
import { useSearch } from "../components/Search/useSearch";
import { searchDurations } from "../lib/config";
import ChromeExtensionBanner from "../components/ChromeExtensionBanner";

const Home = () => {
  const {
    search,
    searchResults,
    pageShown: [rawShowPage, setShowPage],
    handleChange,
  } = useSearch();

  const showPage = rawShowPage && !search;

  return (
    <PageLayout
      imageUrl={`${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/images/advert.png`
          : "/images/advert.png"
      }`}
    >
      <Flex
        alignItems={"start"}
        justifyContent={"space-between"}
        flexDirection={["column-reverse", "row", "row"]}
      >
        <VStack alignItems={["center", "start", "start"]} spacing={[0, 8, 8]}>
          <Collapse
            unmountOnExit={false}
            in={showPage}
            startingHeight={0.01}
            animateOpacity
            transition={{
              exit: { duration: searchDurations.exit },
              enter: { duration: searchDurations.enter },
            }}
          >
            <Heading
              fontSize={["50px", "55px", "90px"]}
              paddingTop={[0, 10, "calc(50vh - 185px)"]}
              textAlign={["center", "left", "left"]}
            >
              Gopher Grades
            </Heading>
            <Text
              maxW={["100%", "50%", "100%"]}
              style={{
                color: "black",
              }}
              textAlign={["center", "left", "left"]}
              py={[8, 10, 2]}
              fontWeight={300}
            >
              View all the past grades for classes taken at the University of
              Minnesota, Twin Cities.
            </Text>
          </Collapse>
          <Box pt={[0, 5, 2]} maxW={"calc(100vw - 50px)"} width={"100%"}>
            <SearchBar
              placeholder={search || undefined}
              onChange={handleChange}
            />
          </Box>
          <Collapse in={showPage} animateOpacity>
            <ChromeExtensionBanner source={"chrome.index"} />
          </Collapse>
        </VStack>
        <Box ml={[0, -200, -75]} zIndex={-1} alignSelf={"center"}>
          <Collapse
            in={showPage}
            transition={{
              exit: { duration: searchDurations.exit / 2 },
              enter: {
                duration: (3 * searchDurations.enter) / 4,
                delay: searchDurations.enter / 4,
              },
            }}
          >
            <Box
              pt={[0, 0, showPage ? "calc(50vh - 267px)" : "5px"]}
              width={"650px"}
              transitionDuration={"0.2s"}
              transitionDelay={"0.2s"}
              maxW={["75vw", "50vw", "50vw"]}
              opacity={0.34}
              style={{
                aspectRatio: "1762/1403",
              }}
              alignSelf={"center"}
            >
              <chakra.img
                src={"images/Goldy.png"}
                alt={""}
                style={{
                  aspectRatio: "1762/1403",
                }}
              />
            </Box>
          </Collapse>
        </Box>
      </Flex>
      <SearchResults
        search={search}
        searchResults={searchResults}
        pageShown={[showPage, setShowPage]}
      />
      <Box pb={[200, 250, 100]} />
    </PageLayout>
  );
};

export default Home;
