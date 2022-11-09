import { Box, Flex } from "@chakra-ui/react";
import React from "react";
import MyHeading from "./MyHeading";
import PageBackground from "../PageBackground";
import { Footer } from "./Footer";

const PageLayout = ({ children, ...props }) => (
  <Box>
    <MyHeading {...props} />
    <PageBackground />
    <Flex direction={"row"} justifyContent={"center"}>
      <Box px={[2, 5, 10]} maxW={"1300px"} width={"100%"}>
        {children}

        <Footer />
      </Box>
    </Flex>
  </Box>
);

export default PageLayout;
