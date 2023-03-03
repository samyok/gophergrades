import {
  Alert,
  Badge,
  Link as ChakraLink,
  Text,
  VStack,
} from "@chakra-ui/react";

const voidFunc = () => {};
const ChromeExtensionBanner = ({ setShowAlert = voidFunc, source }) => {
  const colorScheme = "green";
  return (
    <Alert
      borderRadius={"lg"}
      colorScheme={colorScheme}
      variant={"left-accent"}
      cursor={"pointer"}
      _hover={{ opacity: 0.9 }}
      as={"button"}
      onClick={() => {
        setShowAlert(false);
        window.open("/chrome", "_blank");
        window.umami?.trackEvent(source, "download");
        window.localStorage.setItem("downloadedChromeExtension", "true");
      }}
    >
      <Badge mr={2} colorScheme={colorScheme} variant={"solid"}>
        New
      </Badge>
      <VStack spacing={0} pl={2} align={"start"}>
        <Text color={"green.900"} textAlign={"left"}>
          Check out our <ChakraLink>Chrome extension</ChakraLink>!
        </Text>
        <Text fontSize={"xs"} color={"green.500"}>
          Now with data from Fall 2022.
        </Text>
      </VStack>
    </Alert>
  );
};

export default ChromeExtensionBanner;
