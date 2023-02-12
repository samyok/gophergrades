import {
  Badge,
  Box,
  chakra,
  Collapse,
  HStack,
  IconButton,
  Tag,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import React from "react";
import { ChevronDownIcon, ChevronRightIcon, StarIcon } from "@chakra-ui/icons";
import Stats from "./Stats";
import Card from "./Card";
import { letterToColor, RMPToColor, termToName } from "../lib/letterTo";

const sortingFunctions = {
  NONE: (array) => array,
  AVERAGE_GPA: (array) =>
    array
      .sort((a, b) => (b.mostStudentsPercent < a.mostStudentsPercent ? -1 : 1))
      .sort((a, b) => (b.averageGPA < a.averageGPA ? -1 : 1)),
  RECENCY: (a, b) => (a.term < b.term ? 1 : -1),
};

const SingleDistribution = ({ dist, isMobile, isStatic }) => {
  const { isOpen, onToggle } = useDisclosure();
  const title = dist.title ?? "Unknown";
  let { subtitle } = dist;
  if (!subtitle && dist.terms?.length > 1) {
    const sortedTerms = dist.terms.sort((a, b) => (a.term < b.term ? -1 : 1));
    const startTerm = termToName(sortedTerms[0].term);
    const endTerm = termToName(sortedTerms[sortedTerms.length - 1].term);
    subtitle = `${dist.terms.length} terms from ${startTerm} to ${endTerm}`;
  } else if (!subtitle && dist.terms?.length === 1) {
    subtitle = termToName(dist.term);
  }
  return (
    <Box pos={"relative"} width={"full"}>
      <Card
        key={dist.distribution_id}
        isSummary={dist.isSummary}
        href={isStatic ? "#" : dist.href}
        isStatic={isStatic}
      >
        <HStack
          justify={"center"}
          align={"center"}
          width={"100%"}
          flexWrap={"wrap"}
        >
          <VStack
            align={"start"}
            flexGrow={1}
            pb={2}
            width={"50%"}
            justifyContent={"center"}
            height={"100%"}
            spacing={0}
          >
            {!dist.hideTitle && (
              <Text
                fontSize={dist.isSummary ? "3xl" : "lg"}
                fontWeight={"bold"}
              >
                {(!isStatic || !dist.isSummary) && title}
              </Text>
            )}
            {subtitle && (
              <Text fontSize={"xs"} fontWeight={"200"}>
                {subtitle}
              </Text>
            )}
            <HStack pt={3}>
              {dist.rating && (
                <Tag
                  size={"sm"}
                  variant={"outline"}
                  textAlign={"center"}
                  colorScheme={RMPToColor(dist.rating)}
                  py={1}
                >
                  {dist.rating.toFixed(1)}
                  <chakra.span pl={1} mt={-0.5}>
                    {Array(Math.round(dist.rating)).fill(<StarIcon />)}
                  </chakra.span>
                </Tag>
              )}

              {dist.averageGPA > 0 && (
                <Tag
                  size={"sm"}
                  textAlign={"center"}
                  colorScheme={letterToColor(dist.averageGradeLetter)}
                  py={1}
                >
                  {dist.averageGradeLetter} Average ({dist.averageGPA})
                </Tag>
              )}
              <Tag
                size={"sm"}
                textAlign={"center"}
                colorScheme={letterToColor(dist.mostStudents)}
                py={1}
              >
                Most Common: {dist.mostStudents} ({dist.mostStudentsPercent}
                %)
              </Tag>
            </HStack>
            {dist.info && (
              <Text fontSize={"sm"} color={"gray.600"} pt={2}>
                {dist.info}
              </Text>
            )}
          </VStack>

          <VStack>
            <HStack>
              <Badge>{dist.students} students</Badge>
            </HStack>
            <HStack>
              {dist.BarChart}
              {dist.averageGPA > 0 && dist.Component}
            </HStack>
          </VStack>
        </HStack>
        {dist.terms && dist.terms.length > 1 && (
          <Collapse in={isOpen} animateOpacity>
            <VStack spacing={3} p={2} pt={3}>
              {dist.terms?.sort(sortingFunctions.RECENCY).map((term) => (
                <SingleDistribution
                  dist={{
                    ...term,
                    ...Stats({ distribution: term, isMobile }),
                    subtitle: termToName(term.term),
                    hideTitle: true,
                  }}
                  isMobile={isMobile}
                  isStatic={isStatic}
                />
              ))}
            </VStack>
          </Collapse>
        )}
      </Card>
      {!isStatic && !isMobile && dist.terms && dist.terms.length > 1 && (
        <IconButton
          pos={"absolute"}
          size={"xs"}
          top={"35.5px"}
          left={"1px"}
          aria-label={"toggle dropdown"}
          variant={"ghost"}
          colorScheme={"blackAlpha"}
          rounded={"full"}
          onClick={onToggle}
        >
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </IconButton>
      )}
    </Box>
  );
};

export const distributionsToCards = (
  array,
  isMobile,
  sortingFunc = "AVERAGE_GPA",
  isStatic = false
) =>
  array &&
  sortingFunctions[sortingFunc](
    array
      .filter((dist) => dist.title)
      .map((distribution) => ({
        ...distribution,
        ...Stats({ distribution, isMobile }),
      }))
  ).map((dist) => (
    <SingleDistribution
      key={dist.id ?? dist.title}
      dist={dist}
      isMobile={isMobile}
      isStatic={isStatic}
    />
  ));
