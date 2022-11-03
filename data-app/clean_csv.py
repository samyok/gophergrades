import pandas as pd

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
df["HR_NAME"] = df["HR_NAME"].fillna("Unknown Professor")
df.to_csv("cleaned_data.csv",index=False)