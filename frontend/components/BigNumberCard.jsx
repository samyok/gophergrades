import {
  Badge,
  Heading,
  HStack,
  Tooltip,
  VStack,
  WrapItem,
} from "@chakra-ui/react";
import React from "react";
import { InfoOutlineIcon } from "@chakra-ui/icons";
import Card from "./Card";

const BigNumberCard = ({ val, outOf, source, href, style, tooltip = "" }) => (
  <WrapItem flexGrow={1}>
    <Card
      isSummary
      style={{
        paddingTop: 20,
        paddingBottom: 20,
        ...style,
      }}
      href={href}
      isExternal
    >
      <VStack align={"center"} spacing={0}>
        <HStack align={"start"}>
          <Heading color={"black"} size={"2xl"} m={0}>
            {val}
          </Heading>
          <Heading color={"black"} size={"md"} pt={2}>
            /{outOf}
          </Heading>
        </HStack>
        <Tooltip label={tooltip} hasArrow textAlign={"center"}>
          <Badge
            color={"gray.500"}
            background={"transparent"}
            display={"flex"}
            alignItems={"center"}
          >
            {source} {tooltip && <InfoOutlineIcon ml={1} />}
          </Badge>
        </Tooltip>
      </VStack>
    </Card>
  </WrapItem>
);

export default BigNumberCard;
