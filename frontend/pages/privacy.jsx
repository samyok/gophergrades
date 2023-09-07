import React from "react";
import { Heading, Text } from "@chakra-ui/react";
import { MDXProvider } from "@mdx-js/react";
import PageLayout from "../components/Layout/PageLayout";
import PrivacyPolicy from "../components/privacy.mdx";

const components = {
  h1: (params) => <Heading py={2} fontSize={"2xl"} {...params} />,
  h2: (params) => <Heading py={2} fontSize={"xl"} {...params} />,
  h3: (params) => <Heading py={2} fontSize={"lg"} {...params} />,
  h4: (params) => <Heading py={2} fontSize={"md"} {...params} />,
  p: (params) => <Text py={1} {...params} />,
};

const Privacy = () => {
  return (
    <PageLayout
      imageUrl={`${
        process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/images/advert.png`
          : "/images/advert.png"
      }`}
    >
      <Heading
        fontSize={["50px", "55px", "90px"]}
        py={20}
        textAlign={["center", "left", "left"]}
      >
        Privacy Policy
      </Heading>

      <MDXProvider components={components}>
        <PrivacyPolicy />
      </MDXProvider>
    </PageLayout>
  );
};

export default Privacy;
