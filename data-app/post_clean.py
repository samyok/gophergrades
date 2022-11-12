import pandas as pd
import html as h
import json 
import requests

def fetch_better_descr(x):
    global CACHED_REQ
    global CACHED_LINK
    dept = x["SUBJECT"].iloc[0]
    catalog_nbr = x["CATALOG_NBR"].iloc[0]
    term = str(x["TERM"].iloc[0])
    section = x["CLASS_SECTION"].iloc[0]
    level=catalog_nbr[0]

    link="http://classinfo.umn.edu/?subject="+dept+"&level="+level+"&json=1"

    if link!=CACHED_LINK:
        with requests.get(link) as url:
            CACHED_LINK=link
            try:
                decodedContent=url.content.decode("latin-1")
                CACHED_REQ=json.loads(decodedContent,strict=False)
            except ValueError:
                print("Json malformed, icky!")
                CACHED_REQ={}
                return x

    #Go through lecutres and find professors
    key=term+"-"+dept+"-"+catalog_nbr+"-"+section
    for key in sorted(CACHED_REQ.keys(),reverse=True):
        splits = key.split("-")
        if splits[1] == dept and splits[2] == catalog_nbr and "Class Title" in CACHED_REQ[key]:
            print(f"Found | {dept} {catalog_nbr}: {CACHED_REQ[key]['Class Title']}")
            x["DESCR"] = CACHED_REQ[key]["Class Title"]
            return x
    else:
        print(f"Not Found | {dept} {catalog_nbr}: {x['DESCR'].iloc[0]}")
        return x

if __name__ == "__main__":
    df = pd.read_csv("combined_data.csv",dtype={"CLASS_SECTION":str})
    df = df.groupby("FULL_NAME",group_keys=False).apply(fetch_better_descr)
    df.to_csv("combined_clean_data.csv",index=False)