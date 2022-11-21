import { Button } from "@chakra-ui/react";

const LinkButton = ({ children, ...props }) => (
  <Button
    variant={"link"}
    as={"a"}
    fontSize={"sm"}
    fontWeight={400}
    color={"gray.700"}
    {...props}
  >
    {children}
  </Button>
);

export default LinkButton;
