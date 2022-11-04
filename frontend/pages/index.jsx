import { Box, Heading } from "@chakra-ui/react";
import PageLayout from "../components/Layout/PageLayout";

const Home = () => {
  return (
    <PageLayout>
      <Box px={[5, 10]}>
        <Heading as={"h1"}>GopherGrades</Heading>
      </Box>
    </PageLayout>
  );
};

export default Home;
