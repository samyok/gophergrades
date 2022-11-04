import { Box } from "@chakra-ui/react";
import MyHeading from "./MyHeading";

const PageLayout = ({ children, ...props }) => (
  <Box>
    <MyHeading {...props} />
    {children}
  </Box>
);

export default PageLayout;
