import React from "react";
import {
  Alert,
  Badge,
  HStack,
  Link as ChakraLink,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AiOutlineChrome } from "react-icons/ai";
import { BsBrowserEdge, BsBrowserFirefox } from "react-icons/bs";
import trackEvent from "../lib/track";

const voidFunc = () => {};
const ChromeExtensionBanner = ({ setShowAlert = voidFunc, source }) => {
  const isFirefox = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
  const isMicrosoftEdge = navigator.userAgent.toLowerCase().indexOf("edg") > -1;
  const isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
  const colorScheme = isFirefox ? "orange" : "green";

  let browser;
  if (isChrome) {
    browser = "chrome";
  } else if (isMicrosoftEdge) {
    browser = "edge";
  } else if (isFirefox) {
    browser = "firefox";
  } else {
    browser = "Chrome";
  }

  const eventSource = `${browser}.${source}`;

  const browserName = browser.charAt(0).toUpperCase() + browser.slice(1);

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

        if (isFirefox) window.open("/firefox", "_blank");
        else window.open("/chrome", "_blank");

        trackEvent(eventSource + (isFirefox ? ".firefox" : ".chrome"), {
          type: "download",
        });
        window.localStorage.setItem("downloadedChromeExtension", "true");
      }}
    >
      <Badge mr={2} colorScheme={colorScheme} variant={"solid"}>
        <HStack py={1.5} px={3}>
          {isChrome && <AiOutlineChrome size={20} />}
          {isMicrosoftEdge && <BsBrowserEdge size={20} />}
          {isFirefox && <BsBrowserFirefox size={20} />}
          <Text>New</Text>
        </HStack>
      </Badge>
      <VStack spacing={0} pl={2} align={"start"}>
        <Text
          color={`${colorScheme}.900`}
          textAlign={"left"}
          className={"hide-if-extension-downloaded"}
        >
          Check out our <ChakraLink>{browserName} extension</ChakraLink>!
        </Text>
        <Text
          color={`${colorScheme}.900`}
          textAlign={"left"}
          display={"none"}
          className={"show-if-extension-downloaded"}
        >
          Thanks for downloading our extension!
        </Text>
        <Text fontSize={"xs"} color={`${colorScheme}.500`}>
          Now with data from Fall 2022.
        </Text>
      </VStack>
    </Alert>
  );
};

export default ChromeExtensionBanner;
