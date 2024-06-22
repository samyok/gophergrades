import requests
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
from mapping.mappings import libed_mapping, catalog_mapping

from multiprocessing import Pool
from time import time


def fetch_traditional(dept_dist:DepartmentDistribution) -> None:
    """
    Uses the ASR Api: https://github.com/umn-asr/courses
    to fetch class information for relavent classes, classes that are recently being conducted +- 2 terms
    from current semester. This is because these are the bounds of data held by the server, any before or
    futher are not guarenteed to be found. 

    :param dept_dist: The department distribution that we might modify depending on the results returned.
    :type dept_dist: DepartmentDistribution
    :param term: A term id
    :type term: int
    """
    dept = dept_dist.dept_abbr
    campus = dept_dist.campus

    link=f"https://app.coursedog.com/api/v1/cm/umn_{'umntc_rochester' if campus == 'UMNRO' else str.lower(campus)}_peoplesoft/courses/?subjectCode={dept}"

    with requests.get(link) as url:
        try:
            req=url.json()
        except ValueError:
            print("Json malformed, icky!")
            req={}
            return
        
    for course in req.values():
        course_nbr = course["courseNumber"]
        session = Session()
        class_dist = session.query(ClassDistribution).filter(and_(ClassDistribution.dept_abbr == dept, ClassDistribution.course_num == course_nbr, ClassDistribution.campus == campus)).first()
        if class_dist:
            class_dist.class_desc = course["longName"]
            class_dist.onestop_desc = course["description"]
            class_dist.cred_min = course["credits"]["creditHours"]["min"]
            class_dist.cred_max = course["credits"]["creditHours"]["max"]
            class_dist.onestop = f"https://{catalog_mapping.get(campus)}.catalog.prod.coursedog.com/courses/{course['sisId']}"
            for attribute in course["attributes"]:
                libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute]).first()
                if libed_dist == None:
                    print(attribute, libed_mapping[attribute])
                if class_dist not in libed_dist.class_dists:
                    libed_dist.class_dists.append(class_dist)
            print(f"Updated [{class_dist.campus}] {class_dist.dept_abbr} {class_dist.course_num} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
        session.commit()
        session.close()


def fetch_multiprocess(dept_dists:DepartmentDistribution) -> None:
    with Pool(10) as p:
        p.map(fetch_traditional, dept_dists)



if __name__ == "__main__":
    session = Session()
    dists = session.query(DepartmentDistribution).all()
    mapped_libeds = set(libed_mapping.values())
    current_libeds = set([lib.name for lib in session.query(Libed).all()])
    for libed in mapped_libeds.difference(current_libeds):
        session.add(Libed(name=libed))
        session.commit()
        print(f"Added {libed}")
    session.close()
    start = time()
    # fetch_multiprocess(dists)
    end = time()
    print(f"Time Elapsed: {end-start}")
    









