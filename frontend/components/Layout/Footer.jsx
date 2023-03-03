import {
  Avatar,
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  IconButton,
  Text,
  Tooltip,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import NextLink from "next/link";
import React, { useEffect, useState } from "react";
import { FaGithub, FaHome, FaLinkedinIn } from "react-icons/fa";
import LinkButton from "../LinkButton";
import { footerOverrides } from "../../lib/config";

const getContributors = async () => {
  return fetch("/api/contributors").then((r) => r.json());
};

const GithubAvatar = ({ name, ...props }) => (
  <WrapItem>
    <Tooltip label={name} placement={"top"} hasArrow>
      <Avatar size={"lg"} name={name} {...props} />
    </Tooltip>
  </WrapItem>
);

const ContributorGroup = () => {
  const [contributors, setContributors] = useState([]);
  const [bigContributors, setBigContributors] = useState([]);
  useEffect(() => {
    getContributors().then((c) => {
      const rowContributors = c.data.filter(
        (contrib) => !footerOverrides[contrib?.login]?.big
      );
      const filteredBigContributors = c.data
        .filter((contrib) => footerOverrides[contrib?.login]?.big)
        .map((contrib) => ({
          ...contrib,
          ...footerOverrides[contrib?.login],
        }))
        .sort((a, b) => (a.index > b.index ? 1 : -1));
      setBigContributors(filteredBigContributors);
      setContributors(rowContributors);
    });
  }, []);

  return (
    <VStack spacing={0}>
      <Wrap spacing={10} overflow={"visible"} justify={"center"} mb={4}>
        {bigContributors.map((c) => (
          <WrapItem>
            <VStack
              boxShadow={"0px 0px 8px rgba(111, 19, 29, 0.1)"}
              backgroundColor={"rgba(255,255,255,0.4)"}
              width={250}
              py={8}
              borderRadius={10}
            >
              <Avatar size={"xl"} name={c.name} src={c.avatar_url} />
              <Heading fontSize={20}>{c.name}</Heading>
              <Text fontSize={14} fontWeight={300}>
                {c.role}
              </Text>
              <HStack spacing={4}>
                {c.linkedin && (
                  <IconButton
                    href={c.linkedin}
                    target={"_blank"}
                    onClick={() => {
                      window?.umami?.trackEvent(
                        `button.${c.login}.linkedin.click`,
                        "footer"
                      );
                    }}
                    as={"a"}
                    size={"sm"}
                    aria-label={"LinkedIn"}
                    icon={<FaLinkedinIn size={20} />}
                  />
                )}
                {c.website && (
                  <IconButton
                    href={c.website}
                    target={"_blank"}
                    onClick={() => {
                      window?.umami?.trackEvent(
                        `button.${c.login}.website.click`,
                        "footer"
                      );
                    }}
                    as={"a"}
                    size={"sm"}
                    aria-label={"Website"}
                    icon={<FaHome size={20} />}
                  />
                )}
                {c.github && (
                  <IconButton
                    href={c.github}
                    target={"_blank"}
                    onClick={() => {
                      window?.umami?.trackEvent(
                        `button.${c.login}.github.click`,
                        "footer"
                      );
                    }}
                    as={"a"}
                    size={"sm"}
                    aria-label={"Github"}
                    icon={<FaGithub size={20} />}
                  />
                )}
              </HStack>
            </VStack>
          </WrapItem>
        ))}
      </Wrap>

      <Wrap justify={"center"} pb={4}>
        {contributors.map((c) => (
          <GithubAvatar
            key={c.login}
            name={c.name ? `${c.name} (${c.login})` : c.login}
            src={c.avatar_url}
            href={c.html_url}
            as={"a"}
            onClick={() => {
              window?.umami?.trackEvent(`avatar.${c.login}.click`, "footer");
            }}
            target={"_blank"}
            opacity={0.7}
            transitionDuration={"200ms"}
            _hover={{
              opacity: 1,
            }}
          />
        ))}
      </Wrap>
      <Button
        size={"xs"}
        fontWeight={300}
        variant={"outline"}
        as={"a"}
        target={"_blank"}
        onClick={() => {
          window?.umami?.trackEvent(`button.github_contribute.click`, "footer");
        }}
        href={"https://github.com/samyok/gophergrades"}
      >
        Contribute on our Github
      </Button>
    </VStack>
  );
};

export const Footer = () => {
  return (
    <Box pt={10} pb={5}>
      <Divider borderColor={"rgba(91,0,19,0.42)"} mb={4} />
      <VStack spacing={4}>
        <ContributorGroup />
        <Text
          textAlign={"center"}
          fontSize={"sm"}
          fontWeight={300}
          color={"gray.600"}
        >
          <NextLink href={"/"}>Gopher Grades</NextLink> is maintained by{" "}
          <LinkButton target={"_blank"} href={"/social-coding"}>
            Social Coding
          </LinkButton>{" "}
          with data from Summer 2017 to Fall 2022 provided by the{" "}
          <LinkButton
            target={"_blank"}
            href={"https://ogc.umn.edu/data-access-and-privacy"}
          >
            Office of Data Access and Privacy
          </LinkButton>
        </Text>
        <LinkButton
          color={"gray.500"}
          fontWeight={"300"}
          target={"_blank"}
          href={"https://gophergrades.com"}
        >
          Inspired by the original Gopher Grades project
        </LinkButton>
      </VStack>
    </Box>
  );
};
