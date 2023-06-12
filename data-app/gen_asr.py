import requests
from db.Models import DepartmentDistribution, ClassDistribution, Libed
from mapping.mappings import libed_mapping

import pandas as pd
from db.Models import session
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from random import sample
from time import time
import asyncio
import aiohttp
from multiprocessing import Pool


def fetch_traditional(dept_dist:DepartmentDistribution,term:int) -> None:
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

    link=f"https://courses.umn.edu/campuses/UMNTC/terms/{term}/courses.json?q=subject_id={dept}"

    with requests.get(link) as url:
        try:
            req=url.json()
        except ValueError:
            print("Json malformed, icky!")
            req={}
            return
    for course in req["courses"]:
        subj = course["subject"]["subject_id"]
        nbr = course["catalog_number"]
        class_dist = session.query(ClassDistribution).filter(ClassDistribution.class_name == f"{subj} {nbr}").first()
        if class_dist:
            class_dist.class_desc = course["title"]
            class_dist.cred_min = course["credits_minimum"]
            class_dist.cred_max = course["credits_maximum"]
            class_dist.onestop = f"https://onestop2.umn.edu/pcas/viewCatalogCourse.do?courseId={course['course_id']}"
            for attribute in course["course_attributes"]:
                if attribute["family"] in ["CLE","HON","FSEM"]:
                    libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute['attribute_id']]).first()
                    libed_dist.class_dists.append(class_dist)
            # print(f"Updated {class_dist.class_name} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
        session.commit()

async def fetch_async(dept_dists:DepartmentDistribution,term:int = 1233) -> None:
    async def fetch_update(dept, client_sess, **kwargs):
        try:
            resp = await client_sess.request(method="GET",url=f"https://courses.umn.edu/campuses/UMNTC/terms/{term}/courses.json?q=subject_id={dept.dept_abbr}", **kwargs)
            req = await resp.json()
            for course in req["courses"]:
                subj = course["subject"]["subject_id"]
                nbr = course["catalog_number"]
                async with async_session() as session:
                    result = await session.execute(select(ClassDistribution).where(ClassDistribution.class_name == f"{subj} {nbr}"))
                    class_dist = result.scalars().first()
                    if class_dist:
                        class_dist.class_desc = course["title"]
                        class_dist.cred_min = course["credits_minimum"]
                        class_dist.cred_max = course["credits_maximum"]
                        class_dist.onestop = f"https://onestop2.umn.edu/pcas/viewCatalogCourse.do?courseId={course['course_id']}"
                        for attribute in course["course_attributes"]:
                            if attribute["family"] in ["CLE","HON","FSEM"]:
                                libed_dist = await session.execute(select(Libed).where(Libed.name == libed_mapping[attribute['attribute_id']]))
                                libed_dist = libed_dist.scalars().first()
                                libed_dist.class_dists.append(class_dist)
                        # print(f"Updated {class_dist.class_name} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
                    await session.commit()
        except ValueError:
            print("Json malformed, icky!")
            return
        except Exception as e:
            print(e)
            return
        
    async def make_requests(**kwargs):
        async with aiohttp.ClientSession() as session:
            tasks = [fetch_update(dept,session,**kwargs) for dept in dept_dists]
            await asyncio.gather(*tasks)
    
    await make_requests()

def fetch_multiprocess(dept_dists:DepartmentDistribution,term:int) -> None:
    with Pool(10) as p:
        p.starmap(fetch_traditional,[[dept_dist,term] for dept_dist in dept_dists])



if __name__ == "__main__":
    TERM = 1233
    session.expire_on_commit = False
    async_engine = create_async_engine("sqlite+aiosqlite:///../ProcessedData.db",echo=False)
    async_session = sessionmaker(async_engine,expire_on_commit=False,class_=AsyncSession)
    dists = sample(session.query(DepartmentDistribution).all(),30)

    results = {"traditional":[],"async":[],"multiprocess":[]}


    for i in range(30):
        start = time()
        for dist in dists:
            fetch_traditional(dist,TERM)
        end = time()
        results["traditional"].append(end-start)
        print(f"Traditional Fetching took {end-start} seconds")

        start = time()
        asyncio.run(fetch_async(dists,TERM))
        end = time()
        results["async"].append(end-start)
        print(f"Async Fetching took {end-start} seconds")

        start = time()
        fetch_multiprocess(dists,TERM)
        end = time()
        results["multiprocess"].append(end-start)
        print(f"Multiprocess Fetching took {end-start} seconds")

    pd.DataFrame(results).to_csv("fetching_results.csv",index=False)







