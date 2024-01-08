import { Heading, Text } from "@chakra-ui/react";
import React from "react";

export function useMDXComponents(components) {
  const chakraComponents = {
    h1: (params) => (
      <Heading
        fontSize={["50px", "55px", "90px"]}
        pt={20}
        pb={10}
        textAlign={["center", "left", "left"]}
        {...params}
      />
    ),
    h2: (params) => <Heading py={2} fontSize={"xl"} {...params} />,
    h3: (params) => <Heading py={2} fontSize={"lg"} {...params} />,
    h4: (params) => <Heading py={2} fontSize={"md"} {...params} />,
    p: (params) => <Text py={1} {...params} />,
  };
  return { ...components, ...chakraComponents };
}
