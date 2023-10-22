import pandas as pd
import requests
from nameparser import HumanName
import re
import json
import sys

# Worry not about the CACHED variables, this is simply to help store previous requests in order to prevent redundant calls to an API
CACHED_REQ={}
CACHED_LINK=""

def fetch_unknown_prof(x:pd.DataFrame) -> pd.DataFrame:
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
    level=catalog_nbr[0]
    professor="Unknown Instructor"

    link="http://classinfo.umn.edu/?term="+term+"&subject="+dept+"&json=1"
    classLink=f"http://classinfo.umn.edu/?term={term}&subject={dept}&level={level}"
    print(f"Link to class: "+classLink)

    if link!=CACHED_LINK:
        with requests.get(link) as url:
            CACHED_LINK=link
            try:
                decodedContent=url.content.decode("latin-1")
                CACHED_REQ=json.loads(decodedContent,strict=False)
            except ValueError:
                # print("Json malformed, icky!")
                CACHED_REQ={}

    #Go through lecutres and find professors
    key=""
    try:
        key=term+"-"+dept+"-"+catalog_nbr+"-"+section
        classComp=CACHED_REQ[key]["Class Component"]
        if classComp=="Lecture" or classComp=="LEC" or classComp=="Independent Study" or\
        classComp=="Field Work":
            professor=re.findall("\\t(.*)",CACHED_REQ[key]["Instructor Data"])[0]
        else:
            profSec=re.findall("Section (\d+)",CACHED_REQ[key]["Auto Enrolls With"])[0]
            profKey=term+"-"+dept+"-"+catalog_nbr+"-"+profSec
            professor=re.findall("\\t(.*)",CACHED_REQ[profKey]["Instructor Data"])[0]
    except KeyError:
        # print("No instructor data, :(")
        #Create a file with error contained.

        #Also, I don't know how to delete the file between runs,
        #so delete the file or save it before running this part <3
        with open("No-Instructor-data.txt","a") as f:
            lineNum=sys.exc_info()[-1].tb_lineno
            problem="Unknown Issue"
            if lineNum==39:
                problem="No Class Component, or Key doesn't exist"
                #Generally, this is data that's hard to go through or doesn't exist.
            elif lineNum==42:
                problem="No Instructor Data within lecture"
                #No traceback possible
            elif lineNum==44:
                problem="No auto enroll data"
                #No traceback possible
            elif lineNum==46:
                problem="Auto enroll key may be incorrect"
            f.write(classLink+"\t"+key+" "+problem+'\n')

    if not x["HR_NAME"].isnull().all() and professor != "Unknown Instructor":
        # print(f"{dept} {catalog_nbr} section {section} taught on term {term} which is a level {catalog_nbr[0]} class and was taught by {professor}.")
        x["HR_NAME"] = professor
        return x
    else: 
        # print(f"{dept} {catalog_nbr} section {section} taught on term {term} which is a level {catalog_nbr[0]} class and was taught by {professor}.")
        x["HR_NAME"] = professor
        return x

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
        name = HumanName(x)
        name.string_format = "{first} {last}"
        retVal = str(name)
    else:
        retVal = x
    return retVal


"""
WARNING:
ANY CODE BEYOND THIS POINT IS VOLATILE AND MAY CHANGE DEPENDING ON THE DATA PROVIDED TO US BY THE UNIVERSITY
THIS WILL LIKELY NOT STAY CONSISTENT.
"""


df = pd.read_csv("CLASS_DATA/SUM2023_raw_data.csv",dtype={"CLASS_SECTION":str})
# Unneeded Data
del df["INSTITUTION"]
del df["TERM_DESCR"]
del df["COMPONENT_MAIN"]
del df["INSTR_ROLE"]
del df["JOBCODE_DESCR"]
del df["UM_JOBCODE_GROUP"]
del df["CLASS_HDCNT"]
df = df[~(df["CRSE_GRADE_OFF"] == "NR")]

# Write class name as the proper full name that students are accustomed to.
df["FULL_NAME"] = df["SUBJECT"] + ' ' + df["CATALOG_NBR"]

# Write the class section as a 3 digit number
df["CLASS_SECTION"] = df["CLASS_SECTION"].apply(lambda x: x.zfill(3))

# Replace unknown professor values with either a correct name or "Unknown Instructor"
df = df.groupby(["TERM","FULL_NAME","CLASS_SECTION"],group_keys=False).apply(fetch_unknown_prof)
df["HR_NAME"] = df["HR_NAME"].apply(format_name)

df.to_csv("CLASS_DATA/SUM2023_cleaned_data.csv",index=False)
