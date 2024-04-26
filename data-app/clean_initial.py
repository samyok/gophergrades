import pandas as pd
import requests
from nameparser import HumanName
import re
import json
import sys

# Worry not about the CACHED variables, this is simply to help store previous requests in order to prevent redundant calls to an API
CACHED_REQ = {}
CACHED_LINK = ""


def fetch_unknown_prof_deprecated(x: pd.DataFrame) -> pd.DataFrame:
    """
    Given a dataframe with grouped Term, Class Name, and Section number trace back on the classinfo API
    to find the true lecturer. The purpose of this function is to ensure that TAs are not listed as lecturers
    on the site. Additionally, this corrects information in case the university does not provide information regarding a lecturer.

    :param x: The grouping of Term, Class Name, and Section
    :type x: pd.DataFrame
    :return: A new same sized dataframe with updated professor name, "Unknown Instructor", or no change.
    :rtype: pd.DataFrame
    """
    if not x["HR_NAME"].isnull().all():
        # If an HR_NAME is already defined don't make any modifications.
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
    classLink = f"http://classinfo.umn.edu/?term={term}&subject={dept}&level={level}"
    # print(f"Link to class: " + classLink)

    if link != CACHED_LINK:
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
        classComp = CACHED_REQ[key]["Class Component"]
        if (
            classComp == "Lecture"
            or classComp == "LEC"
            or classComp == "Independent Study"
            or classComp == "Field Work"
        ):
            professor = re.findall("\\t(.*)", CACHED_REQ[key]["Instructor Data"])[0]
        else:
            profSec = re.findall("Section (\d+)", CACHED_REQ[key]["Auto Enrolls With"])[
                0
            ]
            profKey = term + "-" + dept + "-" + catalog_nbr + "-" + profSec
            professor = re.findall("\\t(.*)", CACHED_REQ[profKey]["Instructor Data"])[0]
    except KeyError:
        print(f"Failed to update {dept} {catalog_nbr} {section} with Outdated")
        with open("No-Instructor-data.txt", "a") as f:
            lineNum = sys.exc_info()[-1].tb_lineno
            problem = "Unknown Issue"
            if lineNum == 39:
                problem = "No Class Component, or Key doesn't exist"
                # Generally, this is data that's hard to go through or doesn't exist.
            elif lineNum == 42:
                problem = "No Instructor Data within lecture"
                # No traceback possible
            elif lineNum == 44:
                problem = "No auto enroll data"
                # No traceback possible
            elif lineNum == 46:
                problem = "Auto enroll key may be incorrect"
            f.write(classLink + "\t" + key + " " + problem + "\n")

    x["HR_NAME"] = professor
    return x


def fetch_unknown_prof(x: pd.DataFrame) -> pd.DataFrame:
    if not x["HR_NAME"].isnull().any():
        return x
    
    dept = x["SUBJECT"].iloc[0]
    catalog_nbr = x["CATALOG_NBR"].iloc[0]
    term = str(x["TERM"].iloc[0])
    institution = str(x["INSTITUTION"].iloc[0])
    campus = str(x["CAMPUS"].iloc[0])

    course_resp = requests.get(
        "https://schedulebuilder.umn.edu/api.php",
        params={
            "type": "course",
            "institution": institution,
            "campus": campus,
            "term": term,
            "subject": dept,
            "catalog_nbr": catalog_nbr,
        },
    )

    if course_resp.status_code != 200:
        print(f"Failed to fetch section data for {dept} {catalog_nbr}")
        return x

    data = course_resp.json()

    if len(data["sections"]) == 0:
        # No data to work with, fall back to old method.
        # print(f"Failed to fetch overall data for {dept} {catalog_nbr}: {course_resp.url}")
        retVal =  x.groupby(["CLASS_SECTION"], group_keys=False).apply(
            fetch_unknown_prof_deprecated
        )
        retVal["HR_NAME"].fillna("Unknown Instructor", inplace=True)
        return retVal

    sections_resp = requests.get(
        "https://schedulebuilder.umn.edu/api.php",
        params={
            "type": "sections",
            "institution": institution,
            "campus": campus,
            "term": term,
            "class_nbrs": ", ".join([str(x) for x in data["sections"]]),
        },
    )

    if sections_resp.status_code != 200:
        print(f"Failed to fetch section data for {dept} {catalog_nbr}")
        return x

    root = []
    children = []
    for item in sections_resp.json():
        if not item.get("auto_enroll_sections?"):
            if not item.get("meetings"):
                # This course just doesn't meet so skip it
                continue

            for meeting in item["meetings"]:
                if meeting.get("instructors"):
                    instructor_info = meeting["instructors"][0]
                    root.append(
                        (
                            item["id"],
                            instructor_info.get("label_name", "Unknown Instructor"),
                            instructor_info.get("internet_id", ""),
                            item.get('section_number',"")
                        )
                    )
                    break
        else:
            children.append((item["section_number"], item["auto_enroll_sections"][0]))

    root_df = pd.DataFrame(root, columns=['id', 'HR_NAME', 'INTERNET_ID', "CLASS_SECTION"])
    children_df = pd.DataFrame(children, columns=['CLASS_SECTION', 'root_id'])

    merged_instructors = pd.merge(root_df, children_df, left_on='id', right_on='root_id', how='outer')

    del merged_instructors['root_id']
    del merged_instructors['id']

    merged_instructors["CLASS_SECTION_y"].fillna(merged_instructors["CLASS_SECTION_x"], inplace=True)
    del merged_instructors["CLASS_SECTION_x"]
    merged_instructors.rename(columns={"CLASS_SECTION_y": "CLASS_SECTION"}, inplace=True)
    
    print(f"{dept} {catalog_nbr}")

    merged_total = pd.merge(x, merged_instructors, on='CLASS_SECTION', how='left')
    merged_total["HR_NAME_x"].fillna(merged_total["HR_NAME_y"], inplace=True)
    del merged_total["HR_NAME_y"]
    merged_total.rename(columns={"HR_NAME_x": "HR_NAME"}, inplace=True)

    merged_total["INTERNET_ID_x"].fillna(merged_total["INTERNET_ID_y"], inplace=True)
    del merged_total["INTERNET_ID_y"]
    merged_total.rename(columns={"INTERNET_ID_x": "INTERNET_ID"}, inplace=True)

    merged_total["HR_NAME"] = merged_total["HR_NAME"].astype("string")
    merged_total["INTERNET_ID"] = merged_total["INTERNET_ID"].astype("string")

    merged_total["HR_NAME"].fillna("Unknown Instructor", inplace=True)

    return merged_total


def format_name(x: str):
    """
    Given a string it will use the HumanName library to parse it to better consolidate names.
    Names vary wildly, so not all issues will be corrected some may have to be manually identified and
    cleaned at the worst case.

    :param x: A string that represents a name
    :type x: str
    :return: A parsed string that is formated with a First and Last name.
    :rtype: _type_
    """
    if not x == "Unknown Instructor":
        try:
            name = HumanName(x)
            name.string_format = "{first} {last}"
            retVal = str(name)
        except TypeError:
            print(f"Failed to parse {x}")
            retVal = x
    else:
        retVal = x

    return retVal


"""
WARNING:
ANY CODE BEYOND THIS POINT IS VOLATILE AND MAY CHANGE DEPENDING ON THE DATA PROVIDED TO US BY THE UNIVERSITY
THIS WILL LIKELY NOT STAY CONSISTENT.
"""


df = pd.read_csv("CLASS_DATA/FALL2023_raw_data.csv", dtype={"CLASS_SECTION": str})
# Unneeded Data
del df["TERM_DESCR"]
del df["COMPONENT_MAIN"]
del df["INSTR_ROLE"]
del df["JOBCODE_DESCR"]
del df["UM_JOBCODE_GROUP"]
del df["CLASS_HDCNT"]
df = df[~(df["CRSE_GRADE_OFF"] == "NR")]

df["TERM"] = 1239

# Write class name as the proper full name that students are accustomed to.
df["FULL_NAME"] = df["SUBJECT"] + " " + df["CATALOG_NBR"]

# Write the class section as a 3 digit number
df["CLASS_SECTION"] = df["CLASS_SECTION"].apply(lambda x: x.zfill(3))

# Replace unknown professor values with either a correct name or "Unknown Instructor"

# If you are using multiple terms in a dataset.
df = df.groupby(["TERM", "FULL_NAME"]).apply(fetch_unknown_prof)

del df["INSTITUTION"]

df["HR_NAME"] = df["HR_NAME"].apply(format_name)

df.to_csv("CLASS_DATA/FALL2023_cleaned_data.csv", index=False)
