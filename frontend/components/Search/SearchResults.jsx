import { Collapse, Heading, Spinner, VStack } from "@chakra-ui/react";
import React from "react";
import Card from "../Card";
import { searchDurations } from "../../lib/config";

const Classes = ({ searchResults, onClick }) => {
  if (
    searchResults === null ||
    !searchResults.success ||
    searchResults.data.classes?.length === 0
  ) {
    return null;
  }

  return (
    <VStack spacing={2} width={"100%"} align={"start"}>
      <Heading size={"md"} pt={4}>
        Classes
      </Heading>
      {searchResults.data.classes.map((row) => (
        <Card
          key={row.class_name}
          href={`/class/${row.class_name.replace(/ /g, "")}`}
          onClick={onClick}
        >
          {row.class_name} - {row.class_desc}
        </Card>
      ))}
    </VStack>
  );
};

const Departments = ({ searchResults, onClick }) => {
  if (
    searchResults === null ||
    !searchResults.success ||
    searchResults.data.departments?.length === 0
  ) {
    return null;
  }

  return (
    <VStack spacing={2} width={"100%"} align={"start"}>
      <Heading size={"md"} pt={4}>
        Departments
      </Heading>
      {searchResults.data.departments.map((row) => (
        <Card key={row.id} href={`/dept/${row.dept_abbr}`} onClick={onClick}>
          {row.dept_abbr} - {row.dept_name}
        </Card>
      ))}{" "}
    </VStack>
  );
};

const Professors = ({ searchResults, onClick }) => {
  if (
    searchResults === null ||
    !searchResults.success ||
    searchResults.data.professors?.length === 0
  ) {
    return null;
  }

  return (
    <VStack spacing={2} width={"100%"} align={"start"}>
      <Heading size={"md"} pt={4}>
        Professors
      </Heading>
      {searchResults.data.professors.map((row) => (
        <Card key={row.id} href={`/prof/${row.id}`} onClick={onClick}>
          {row.name}
        </Card>
      ))}{" "}
    </VStack>
  );
};

export default function SearchResults({
  search,
  searchResults,
  pageShown: [showPage, setShowPage],
}) {
  const clickHandler = () => {
    setShowPage(true);
  };
  return (
    <Collapse
      in={!showPage}
      transition={{
        exit: { duration: searchDurations.enter },
        enter: {
          duration: (3 * searchDurations.exit) / 4,
          delay: searchDurations.exit / 8,
        },
      }}
      width={"100%"}
    >
      <VStack spacing={4} width={"100%"} align={"start"} px={2} pt={2} pb={16}>
        <Heading pt={4}>
          Search Results for &ldquo;{search.trim()}&rdquo;
        </Heading>
        {/* no results box: */}
        {searchResults !== null &&
          searchResults.data.classes.length +
            searchResults.data.professors.length +
            searchResults.data.departments.length ===
            0 && (
            <Heading size={"md"} pt={4}>
              No results found.
            </Heading>
          )}
        {/* Loading indicator: */}
        {searchResults === null && (
          <Heading size={"md"} pt={4}>
            <Spinner size={"sm"} mr={2} />
            Loading...
          </Heading>
        )}
        <Departments searchResults={searchResults} onClick={clickHandler} />
        <Classes searchResults={searchResults} onClick={clickHandler} />
        <Professors searchResults={searchResults} onClick={clickHandler} />
      </VStack>
    </Collapse>
  );
}
