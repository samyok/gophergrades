import { Heading, VStack } from "@chakra-ui/react";
import React from "react";
import Card from "./Card";

export default function SearchResults({ search, searchResults }) {
  return (
    <VStack spacing={4} width={"100%"} align={"start"} px={2} py={2}>
      <Heading pt={4}>Search Results for &ldquo;{search}&rdquo;</Heading>
      <pre>{JSON.stringify(searchResults, null, 4)}</pre>
      <VStack spacing={2} width={"100%"} align={"start"}>
        <Heading size={"md"} pt={4}>
          Departments
        </Heading>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
      </VStack>
      <VStack spacing={2} width={"100%"} align={"start"}>
        <Heading size={"md"} pt={4}>
          Classes
        </Heading>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
      </VStack>
      <VStack spacing={2} width={"100%"} align={"start"}>
        <Heading size={"md"} pt={4}>
          Instructors
        </Heading>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
        <Card href={"https://google.com"}>Testing</Card>
      </VStack>
    </VStack>
  );
}
