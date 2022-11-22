import { Alert, Badge, Link as ChakraLink, Text } from "@chakra-ui/react";

const voidFunc = () => {};
const ChromeExtensionBanner = ({ setShowAlert = voidFunc, source }) => {
  return (
    <Alert
      borderRadius={"lg"}
      colorScheme={"blackAlpha"}
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
      <Badge mr={2} colorScheme={"purple"} variant={"solid"}>
        New
      </Badge>
      <Text>
        See grades directly in ScheduleBuilder with our{" "}
        <ChakraLink>new Chrome extension</ChakraLink>!
      </Text>
    </Alert>
  );
};

export default ChromeExtensionBanner;
