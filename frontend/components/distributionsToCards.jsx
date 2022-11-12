import { Badge, HStack, Tag, Text, VStack } from "@chakra-ui/react";
import React from "react";
import Stats from "./Stats";
import Card from "./Card";
import { letterToColor } from "../lib/letterTo";

const sortingFunctions = {
  NONE: (array) => array,
  AVERAGE_GPA: (array) =>
    array
      .sort((a, b) => (b.mostStudentsPercent < a.mostStudentsPercent ? -1 : 1))
      .sort((a, b) => (b.averageGPA < a.averageGPA ? -1 : 1)),
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
  ).map((dist) => {
    const title = dist.title ?? "Unknown";
    return (
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
          <VStack align={"start"} flexGrow={1} pb={4} width={"50%"}>
            <Text fontSize={dist.isSummary ? "3xl" : "lg"} fontWeight={"bold"}>
              {(!isStatic || !dist.isSummary) && title}
            </Text>
            <HStack>
              {dist.averageGPA > 0 && (
                <Tag
                  textAlign={"center"}
                  colorScheme={letterToColor(dist.averageGradeLetter)}
                  py={1}
                >
                  {dist.averageGradeLetter} Average ({dist.averageGPA})
                </Tag>
              )}
              <Tag
                textAlign={"center"}
                colorScheme={letterToColor(dist.mostStudents)}
                py={1}
              >
                Most Common: {dist.mostStudents} ({dist.mostStudentsPercent}%)
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
              {dist.terms && (
                <Badge>
                  {dist.terms} term{dist.terms > 1 && "s"}
                </Badge>
              )}
            </HStack>
            <HStack>
              {dist.BarChart}
              {dist.averageGPA > 0 && dist.Component}
            </HStack>
          </VStack>
        </HStack>
      </Card>
    );
  });
