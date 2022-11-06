import { Box } from "@chakra-ui/react";
import Link from "next/link";

export default function Card({ children, href = "", style, ...props }) {
  const extraStyles = style || {};
  const hoverStyles = href
    ? {
        cursor: "pointer",
        boxShadow: "0px 0px 8px rgba(111, 19, 29, 0.175)",
        background: "rgba(255,255,255,0.95)",
        transition: "opacity 0.1s",
      }
    : {};
  const card = (
    <Box
      background={"rgba(255,255,255,0.6)"}
      boxShadow={"0px 0px 8px rgba(111, 19, 29, 0.1)"}
      style={{
        borderRadius: 8,
        width: "100%",
        padding: "12px 20px",
        backdropFilter: "blur(10px)",
        ...extraStyles,
      }}
      _hover={hoverStyles}
      {...props}
    >
      {children}
    </Box>
  );

  if (href)
    return (
      <Link
        href={href}
        style={{
          width: "100%",
        }}
      >
        {card}
      </Link>
    );
  return card;
}
