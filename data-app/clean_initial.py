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
    :return: A new same sized dataframe with updated professor name, "Unknown Professor", or no change.
    :rtype: pd.DataFrame
    """
    global CACHED_REQ
    global CACHED_LINK
    dept = x["SUBJECT"].iloc[0]
    catalog_nbr = x["CATALOG_NBR"].iloc[0]
    term = str(x["TERM"].iloc[0])
    section = x["CLASS_SECTION"].iloc[0]
    level=catalog_nbr[0]
    professor="Unknown Professor"

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
                print("Json malformed, icky!")
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
        print("No instructor data, :(")
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

    if not x["HR_NAME"].isnull().all() and professor != "Unknown Professor":
        print(f"{dept} {catalog_nbr} section {section} taught on term {term} which is a level {catalog_nbr[0]} class and was taught by {professor}.")
        x["HR_NAME"] = professor
        return x
    elif not x["HR_NAME"].isnull().all():
        print(f"{dept} {catalog_nbr} section {section} taught on term {term} which is a level {catalog_nbr[0]} class and was taught by {x['HR_NAME'].iloc[0]}.")
        return x
    else: 
        print(f"{dept} {catalog_nbr} section {section} taught on term {term} which is a level {catalog_nbr[0]} class and was taught by {professor}.")
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
    if not x == "Unknown Professor":
        name = HumanName(x)
        name.string_format = "{first} {last}"
        retVal = str(name)
    else:
        retVal = x
    return retVal

def term_desc_to_val(x:pd.Dataframe):
    """
    This function is technically feature engineering. New data from the university might not have
    term ids and only a term description. The purpose of this function is to add that to the dataframe grouped by
    Term Description.

    :param x: The dataframe grouped by term description
    :type x: _type_
    :return: The new dataframe with a series of data all containing the proper term mapping.
    :rtype: _type_
    """
    mapping = {
        "Fall 2020": 1209,
        "Spr 2021" : 1213,
        "Sum 2021" : 1215,
        "Fall 2021" : 1219,
        "Spr 2022" : 1223,
        "Sum 2022" : 1225
    }
    x["TERM"] = mapping[x["TERM_DESCR"].iloc[0]]
    return x


"""
WARNING:
ANY CODE BEYOND THIS POINT IS VOLATILE AND MAY CHANGE DEPENDING ON THE DATA PROVIDED TO US BY THE UNIVERSITY
THIS WILL LIKELY NOT STAY CONSISTENT.
"""


df = pd.read_csv("CLASS_DATA/SUM2017-FALL2020_raw_data.csv",dtype={"CLASS_SECTION":str,"Unnamed: 14":str})
# Unneeded Data
del df["INSTITUTION"]
del df["CAMPUS"]
del df["Unnamed: 14"]
del df["JOBCODE_DESCR"]
del df["CLASS_HDCNT"]
del df["INSTR_ROLE"]
df = df[~(df["CRSE_GRADE_OFF"] == "NR")]
# Add missing term numbers for most recent semester, cast to take from float to int.
df = df.groupby("TERM_DESCR",group_keys=False).apply(term_desc_to_val)
df = df.astype({"TERM":int})
del df["TERM_DESCR"]
# Write class name as the proper full name that students are accustomed to.
df["FULL_NAME"] = df["SUBJECT"] + ' ' + df["CATALOG_NBR"]
# Replace unknown professor values with either a correct name or "Unknown Professor"
df["CLASS_SECTION"] = df["CLASS_SECTION"].apply(lambda x: x.zfill(3))
df = df.groupby(["TERM","FULL_NAME","CLASS_SECTION"],group_keys=False).apply(fetch_unknown_prof)
df["HR_NAME"] = df["HR_NAME"].apply(format_name)
print(df)
df.to_csv("CLASS_DATA/SUM2017-FALL2020_cleaned_data.csv",index=False)
