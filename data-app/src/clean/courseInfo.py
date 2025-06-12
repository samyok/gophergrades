from abstract import CleanBase
import pandas as pd
import requests
import json
import re
import sys

class CourseInfoCleaner(CleanBase):
    def fetch_unknown_prof(self, x:pd.DataFrame) -> pd.DataFrame:
        if not x["NAME"].isnull().all():
            # If an NAME is already defined don't make any modifications.
            return x

        global CACHED_REQ
        global CACHED_LINK
        dept = x["SUBJECT"].iloc[0]
        catalog_nbr = x["CATALOG_NBR"].iloc[0]
        term = str(x["TERM"].iloc[0])
        section = x["CLASS_SECTION"].iloc[0]
        level = catalog_nbr[0]
        professor = "Unknown Instructor"

        link = "http://classinfo.umn.edu/?term=" + term + "&subject=" + dept + "&json=1"
        # classLink = f"http://classinfo.umn.edu/?term={term}&subject={dept}&level={level}"
        # print(f"Link to class: " + classLink)

        if link != self.CACHED_LINK:
            with requests.get(link) as url:
                CACHED_LINK = link
                try:
                    decodedContent = url.content.decode("latin-1")
                    CACHED_REQ = json.loads(decodedContent, strict=False)
                except ValueError:
                    # print("Json malformed, icky!")
                    CACHED_REQ = {}

        # Go through lecutres and find professors
        key = ""
        try:
            key = term + "-" + dept + "-" + catalog_nbr + "-" + section
            classComp = self.CACHED_REQ[key]["Class Component"]
            if (
                classComp == "Lecture"
                or classComp == "LEC"
                or classComp == "Independent Study"
                or classComp == "Field Work"
            ):
                professor = re.findall("\\t(.*)", self.CACHED_REQ[key]["Instructor Data"])[0]
            else:
                profSec = re.findall(r"Section (\d+)", self.CACHED_REQ[key]["Auto Enrolls With"])[
                    0
                ]
                profKey = term + "-" + dept + "-" + catalog_nbr + "-" + profSec
                professor = re.findall("\\t(.*)", self.CACHED_REQ[profKey]["Instructor Data"])[0]
                print(f"[CI SEARCH] Filled data for {dept} {catalog_nbr}")
        except KeyError as e:
            print(f"[CI SEARCH] Failed to update {dept} {catalog_nbr} {section}")
            with open("No-Instructor-data.txt", "a") as f:
                f.write(f"Failed to update {dept} {catalog_nbr} {section} with Outdated with error: {e}\n")

        x["NAME"] = professor
        return x