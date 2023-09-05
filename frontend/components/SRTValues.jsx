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

  const {
    DEEP_UND: deepUnderstanding,
    STIM_INT: interestStimulated,
    // TECH_EFF: techEfficient,
    ACC_SUP: activitiesSupported,
    EFFORT: effort,
    // GRAD_STAND: gradStanding,
    RECC: recommend,
  } = parsedJson;

  return (
    <Wrap spacing={"8px"} width={"100%"} overflow={"visible"} mb={2}>
      {recommend && (
        <BigNumberCard
          source={"Recommend"}
          tooltip={`I would recommend this class to a friend. (${recommend.respondents} responses)`}
          val={recommend.val?.toFixed(2)}
          outOf={5}
        />
      )}
      {effort && (
        <BigNumberCard
          source={"Effort"}
          tooltip={`Effort needed to succeed is reasonable. (${effort.respondents} responses)`}
          val={effort.val?.toFixed(2)}
          outOf={5}
        />
      )}
      {deepUnderstanding && (
        <BigNumberCard
          source={"Understanding"}
          tooltip={`Deeper understanding of the subject matter. (${deepUnderstanding.respondents} responses)`}
          val={deepUnderstanding.val?.toFixed(2)}
          outOf={5}
        />
      )}
      {interestStimulated && (
        <BigNumberCard
          source={"Interesting"}
          tooltip={`Interest in the subject matter was stimulated. (${interestStimulated.respondents} responses)`}
          val={interestStimulated.val?.toFixed(2)}
          outOf={5}
        />
      )}
      {activitiesSupported && (
        <BigNumberCard
          source={"Activities"}
          tooltip={`Activities supported learning. (${activitiesSupported.respondents} responses)`}
          val={activitiesSupported.val?.toFixed(2)}
          outOf={5}
        />
      )}
    </Wrap>
  );
};

export default SRTValues;
