import requests
import json
import html as h

CACHED_REQ = {}
CACHED_LINK = ""

def fetch_better_course_info(class_dist,session):
    global CACHED_LINK
    global CACHED_REQ
    dept = class_dist.dept.dept_abbr
    catalog_nbr = class_dist.class_name.split(" ")[1]
    level=catalog_nbr[0]

    link=f"http://classinfo.umn.edu/?subject={dept}&level={level}&json=1"

    if link!=CACHED_LINK:
        with requests.get(link) as url:
            CACHED_LINK=link
            try:
                decodedContent=url.content.decode("latin-1")
                CACHED_REQ=json.loads(decodedContent,strict=False)
            except ValueError:
                # print("Json malformed, icky!")
                CACHED_REQ={}
                return

    for key in sorted(CACHED_REQ.keys(),reverse=True):
        splits = key.split("-")
        if splits[1] == dept and splits[2] == catalog_nbr and "Class Title" in CACHED_REQ[key]:
            class_dist.class_desc = h.unescape(CACHED_REQ[key]["Class Title"])
            class_dist.onestop_desc = h.unescape(CACHED_REQ[key]["Course Catalog Description"])
            # print(f"Updated | {class_dist.class_name}")
            session.commit()
            return
    else:
        print(f"Not Found | {class_dist.class_name}")