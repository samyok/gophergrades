import { Heading, VStack } from "@chakra-ui/react";
import React from "react";

export default function SearchResults({ search }) {
  return (
    <VStack spacing={8} width={"100%"} align={"start"}>
      <Heading pt={4}>Search Results for &ldquo;{search}&rdquo;</Heading>
    </VStack>
  );
}
