import { Box } from "@chakra-ui/react";
import React from "react";

// const gridBackground = `165, 0, 0`;

const PageBackground = () => {
  return (
    <Box
      style={{
        zIndex: -1,
        position: "fixed",
        width: "100vw",
        height: "100vh",
        top: 0,
        left: 0,
        background: "url(/images/background.png) no-repeat center center fixed",
        backgroundSize: "cover",
      }}
    >
      {/*  <Box */}
      {/*    style={{ */}
      {/*      width: "1200px", */}
      {/*      height: "600px", */}
      {/*      position: "fixed", */}
      {/*      left: "-550px", */}
      {/*      top: "-200px", */}
      {/*      background: */}
      {/*        "radial-gradient(41.96% 59.58% at 44.33% 30.65%, rgba(111, 19, 29, 0.45) 0%, rgba(111, 19, 29, 0) 100%)", */}
      {/*    }} */}
      {/*  /> */}
      {/*  <Box */}
      {/*    style={{ */}
      {/*      width: "1500px", */}
      {/*      height: "900px", */}
      {/*      position: "fixed", */}
      {/*      left: "-750px", */}
      {/*      bottom: "-450px", */}
      {/*      background: */}
      {/*        "radial-gradient(41.96% 59.58% at 60.65% 44.93%, rgba(196, 160, 36, 0.4) 0%, rgba(182, 126, 42, 0) 75%)", */}
      {/*    }} */}
      {/*  /> */}
      {/*  <Box */}
      {/*    style={{ */}
      {/*      width: "1200px", */}
      {/*      height: "600px", */}
      {/*      position: "fixed", */}
      {/*      bottom: "0px", */}
      {/*      left: "40%", */}
      {/*      background: */}
      {/*        "radial-gradient(41.96% 59.58% at 60.65% 44.93%, rgba(165, 0, 0, 0.4) 0%, rgba(238, 50, 50, 0) 75%)", */}
      {/*    }} */}
      {/*  /> */}
      {/*  <Box */}
      {/*    style={{ */}
      {/*      width: "100vw", */}
      {/*      height: "100vh", */}
      {/*      position: "fixed", */}
      {/*      top: 0, */}
      {/*      left: 0, */}
      {/*      background: "rgba(255, 255, 255, 0.1)", */}
      {/*      backdropFilter: "blur(100px)", */}
      {/*    }} */}
      {/*  /> */}

      {/*  <Box */}
      {/*    style={{ */}
      {/*      width: "100vw", */}
      {/*      height: "100vh", */}
      {/*      position: "fixed", */}
      {/*      top: 0, */}
      {/*      left: 0, */}
      {/*      background: `repeating-radial-gradient( */}
      {/*            circle at 75% 50%, */}
      {/*            rgba(${gridBackground}, 0) 0px, */}
      {/*            rgba(${gridBackground}, 0) 10px, */}
      {/*            rgba(${gridBackground}, 0.02) 100px, */}
      {/*            rgba(${gridBackground}, 0) 101px, */}
      {/*            rgba(${gridBackground}, 0) 350px) */}
      {/*        `, */}
      {/*    }} */}
      {/*  /> */}
    </Box>
  );
};

export default PageBackground;
