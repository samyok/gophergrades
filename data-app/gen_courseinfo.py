import requests
import json
import html as h
from db.Models import Session, DepartmentDistribution, ClassDistribution
from mapping.mappings import term_to_name
from multiprocessing import Pool



def fetch_better_course_info(dept_obj, term):
    dept = dept_obj.dept_abbr
    dept_classes = sorted(dept_obj.class_dists, key=lambda x: x.class_name)
    CACHED_LINK = ""
    CACHED_REQ = {}
    for dept_class in dept_classes:
        catalog_nbr = dept_class.class_name.split(" ")[1]
        level=catalog_nbr[0]

        link=f"http://classinfo.umn.edu/?subject={dept}&level={level}&term={term}&json=1"

        if link!=CACHED_LINK:
            CACHED_LINK=link
            with requests.get(link) as url:
                try:
                    decodedContent=url.content.decode("latin-1")
                    CACHED_REQ=json.loads(decodedContent,strict=False)
                    # print(f"Loaded JSON for {dept_class.class_name}")
                except ValueError:
                    print(f"Json malformed for {dept_class.class_name}")
                    CACHED_REQ={}
                    return
        else:
            # print(f"Using cached JSON for {d\ept_class.class_name}")
            pass


        key_name = dept_class.class_name.replace(" ","-")
        valid_keys = list(filter(lambda x: key_name in x,list(CACHED_REQ.keys())))
        if (len(valid_keys) > 0):
            # print(f"Found {dept_class.class_name}")
            for key in valid_keys:
                session = Session()
                class_dist = session.query(ClassDistribution).get(dept_class.id)
                if "Class Title" in CACHED_REQ[key]:
                    class_dist.class_desc = h.unescape(CACHED_REQ[key]["Class Title"])
                    class_dist.onestop_desc = h.unescape(CACHED_REQ[key]["Course Catalog Description"])
                    print(f"Updated Title | {class_dist.class_name}")
                else:
                    print(f"Did not update {class_dist.class_name} because a title was not found in the JSON")

                if "Course Catalog Description" in CACHED_REQ[key]:
                    class_dist.onestop_desc = h.unescape(CACHED_REQ[key]["Course Catalog Description"])
                    print(f"Updated Description | {class_dist.class_name}")
                else:
                    print(f"Did not update {class_dist.class_name} because a description was not found in the JSON")
                session.add(class_dist)
                session.commit()
                session.close()
        else:
            print(f"Did not find {dept_class.class_name} in {term_to_name(term)}")
        
def fetch_better_titles_multi(dept_dists,term):
    with Pool(10) as p:
        p.starmap(fetch_better_course_info,[(dept_dist,term) for dept_dist in dept_dists])

if __name__ == "__main__":
    session = Session()
    dept_dists = session.query(DepartmentDistribution).order_by(DepartmentDistribution.dept_abbr).all()
    session.close()
    #TERMS = [1175, 1179, 1183, 1185, 1189, 1193, 1195, 1199, 1203, 1205, 1209, 1213, 1215, 1219, 1223, 1225, 1229, 1233]
    fetch_better_titles_multi(dept_dists,1233)
        

