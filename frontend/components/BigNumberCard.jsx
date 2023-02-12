import { Badge, Heading, HStack, VStack } from "@chakra-ui/react";
import React from "react";
import Card from "./Card";

const BigNumberCard = ({ val, outOf, source, href }) => (
  <Card
    isSummary
    style={{
      paddingTop: 20,
      paddingBottom: 20,
    }}
    href={href}
    isExternal
  >
    <VStack align={"center"} spacing={0}>
      <HStack align={"start"}>
        <Heading color={"black"} size={"4xl"} m={0}>
          {val}
        </Heading>
        <Heading color={"black"} size={"md"} pt={2}>
          /{outOf}
        </Heading>
      </HStack>
      <Badge color={"gray.500"} background={"transparent"}>
        {source}
      </Badge>
    </VStack>
  </Card>
);

export default BigNumberCard;
