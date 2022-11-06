import pandas as pd
import numpy as np
import requests
import re
import json
import sys

CACHED_REQ={}
CACHED_LINK=""

def fetch_unknown_prof(x):
    global CACHED_REQ
    global CACHED_LINK
    dept = x["SUBJECT"].iloc[0]
    catalog_nbr = x["CATALOG_NBR"].iloc[0]
    term = str(x["TERM"].iloc[0])
    section = x["CLASS_SECTION"].iloc[0]
    level=catalog_nbr[0]
    professor="Unknown Professor"

    link="http://classinfo.umn.edu/?term="+term+"&json=1"
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

    print(f"{dept} {catalog_nbr} section {section} taught on term {term} which is a level {catalog_nbr[0]} class and was taught by {professor}.")
    x["HR_NAME"] = professor
    return x

df = pd.read_csv("raw_data.csv",dtype={6:str,14:str})
# Unneeded Data
del df["INSTITUTION"]
del df["CAMPUS"]
del df["Unnamed: 14"]
del df["JOBCODE_DESCR"]
del df["TERM_DESCR"]
del df["CLASS_HDCNT"]
del df["INSTR_ROLE"]
df = df[~(df["CRSE_GRADE_OFF"] == "NR")]
# Add missing term numbers for most recent semester, cast to take from float to int.
df["TERM"] = df["TERM"].fillna(1209)
df = df.astype({"TERM":int})
# Write class name as the proper full name that students are accustomed to.
df["FULL_NAME"] = df["SUBJECT"] + ' ' + df["CATALOG_NBR"]
# Replace unknown professor values with either a correct name or "Unknown Professor"
df.groupby(["TERM","FULL_NAME","CLASS_SECTION"]).apply(lambda x: x if x["HR_NAME"].iloc[0] == np.nan else fetch_unknown_prof(x))
print(df[df["HR_NAME"].isnull()])
df.to_csv("cleaned_data.csv",index=False)
