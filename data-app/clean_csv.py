import pandas as pd
import numpy as np
import requests
import re
import json

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
    print("getting url: "+link)
    data={}

    if link!=CACHED_LINK:
        with requests.get(link) as url:
            CACHED_LINK=link
            try:
                decodedContent=url.content.decode("latin-1")
                CACHED_REQ=json.loads(decodedContent,strict=False)
            except ValueError:
                print("Json malformed, icky!")
                CACHED_REQ={}

    try:
        for key in CACHED_REQ:
            if re.search((term+"-"+dept+"-"+catalog_nbr),key)!=None:
                classComp=CACHED_REQ[key]["Class Component"]
                if classComp=="Lecture" or classComp=="LEC": #Are there any other ways they specifiy lectures?
                    professor=re.findall("\\t(.*)",data[key]["Instructor Data"])[0]
    except KeyError:
        print("No instructor data, :(")


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
