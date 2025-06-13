import { Wrap } from "@chakra-ui/react";
import React from "react";
import BigNumberCard from "./BigNumberCard";

const parseJSON = (str) => {
  let result = {};
  try {
    result = JSON.parse(str);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error parsing JSON", e);
  }
  return result;
};

const SRTValues = ({ srtValues }) => {
  const parsedJson = parseJSON(srtValues);
  if (!parsedJson) return null;

  console.log(parsedJson)

  const {
    DEEP_UND: deepUnderstanding,
    STIM_INT: interestStimulated,
    // TECH_EFF: techEfficient,
    ACC_SUP: activitiesSupported,
    EFFORT: effort,
    // GRAD_STAND: gradStanding,
    RECC: recommend,
    RESP: respondents
  } = parsedJson;

  return (
    <Wrap spacing={"8px"} width={"100%"} overflow={"visible"} mb={2}>
      {recommend && (
        <BigNumberCard
          source={"Recommend"}
          tooltip={`I would recommend this class to a friend. (${respondents} responses)`}
          val={recommend?.toFixed(2)}
          outOf={6}
        />
      )}
      {effort && (
        <BigNumberCard
          source={"Effort"}
          tooltip={`Effort needed to succeed is reasonable. (${respondents} responses)`}
          val={effort?.toFixed(2)}
          outOf={6}
        />
      )}
      {deepUnderstanding && (
        <BigNumberCard
          source={"Understanding"}
          tooltip={`Deeper understanding of the subject matter. (${respondents} responses)`}
          val={deepUnderstanding?.toFixed(2)}
          outOf={6}
        />
      )}
      {interestStimulated && (
        <BigNumberCard
          source={"Interesting"}
          tooltip={`Interest in the subject matter was stimulated. (${respondents} responses)`}
          val={interestStimulated?.toFixed(2)}
          outOf={6}
        />
      )}
      {activitiesSupported && (
        <BigNumberCard
          source={"Activities"}
          tooltip={`Activities supported learning. (${respondents} responses)`}
          val={activitiesSupported?.toFixed(2)}
          outOf={6}
        />
      )}
    </Wrap>
  );
};

export default SRTValues;
