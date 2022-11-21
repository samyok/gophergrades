import { Box, Button, Heading, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import PageLayout from "../components/Layout/PageLayout";

const REASONS = {
  "listed.":
    "No instructor listed on the schedule yet, so we don't have any data for them.",
  all: "No data for this course. It may be new or recently renamed.",
  default: "No GopherGrades data here :(",
};

export default function NotFound() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState(REASONS.default);
  const [email, setEmail] = useState("");

  useEffect(() => {
    window.addEventListener("message", (event) => {
      setEmail(event.data?.email ?? "unknown");
    });

    const query = new URLSearchParams(window.location.search);
    const r = REASONS[query.get("static") ?? "default"];
    if (r) setReason(r);
  }, []);

  const onClick = async () => {
    setLoading(true);
    window.umami?.trackEvent(
      router.asPath.replaceAll("/", "_"),
      "report-broken-link"
    );
    await fetch("/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: router.asPath,
        email,
        source: window.self === window.top ? "website" : "extension",
      }),
    });
    setLoading(false);
    setSubmitted(true);
  };
  return (
    <PageLayout footer={false}>
      <Box
        display={"flex"}
        flexDirection={"column"}
        position={"fixed"}
        justifyContent={"center"}
        top={0}
        left={0}
        w={"100vw"}
        h={"100vh"}
        background={"rgba(255,255,255,0.8)"}
        mx={2}
      >
        <Heading mb={1} fontSize={"lg"}>
          {reason}
        </Heading>
        <Text fontSize={"sm"}>
          Please click the report button if this is a mistake, and we&apos;ll be
          pinged on Discord.
        </Text>
      </Box>
      <Box
        position={"fixed"}
        top={"50%"}
        right={2}
        transform={"translate(0, -50%)"}
      >
        <Button
          width={"150px"}
          isLoading={loading}
          variant={submitted ? "solid" : "outline"}
          colorScheme={"red"}
          disabled={submitted}
          onClick={onClick}
        >
          {submitted ? "Reported" : "Report"}
        </Button>
      </Box>
    </PageLayout>
  );
}
