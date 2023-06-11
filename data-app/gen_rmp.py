import pandas as pd
from db.Models import Professor, session
import ratemyprofessor as rmp
from random import sample
import asyncio
from multiprocessing import Pool
from time import time

# Tries to find the Univeristy of Minnesota - Twin Cities on RateMyProfessor.
SCHOOL = rmp.School(1257)

def update(prof):
    RMP_Prof = rmp.get_professor_by_school_and_name(SCHOOL,prof.name)
    try:
        prof.RMP_score = RMP_Prof.rating
        prof.RMP_diff = RMP_Prof.difficulty
        prof.RMP_link = f"https://www.ratemyprofessors.com/professor/{RMP_Prof.id}"
        # print(f"Gave {prof.name} ({RMP_Prof.name}) an RMP score of {prof.RMP_score}")
        session.commit()
    except ValueError:
        pass
        # print(f"Failed to find or update {prof.name}")
    except AttributeError:
        pass
        # print(f"Failed to update {prof.name} with no attributes.")
    except Exception as e:
        pass
        # print(f"Failed to update {prof.name} with unknown error {e}.")

async def async_update(prof):
    update(prof)

async def RMP_Update_ASYNC(profs):
    await asyncio.gather(*[async_update(prof) for prof in profs])

def RMP_Update_Multiprocess(profs):
    with Pool(10) as p:
        p.map(update,profs)

def RMP_Update(profs):
    for prof in profs:
        update(prof)

if __name__ == "__main__":
    # df=pd.read_csv("CLASS_DATA/combined_clean_data.csv")
    # df["RMP_SCORE"],df["RMP_DIFF"],df["RMP_LINK"]=zip(*df["HR_NAME"].map(getRMP))
    # print(df)

    results = {"control":[],"async":[],"multiprocess":[]}

    for i in range(30):
        profs = sample(session.query(Professor).all(),100)
        start = time()
        RMP_Update(profs)
        end = time()
        results["control"].append(end-start)
        print(f"Finished control {end-start} seconds.")

        start = time()
        asyncio.run(RMP_Update_ASYNC(profs))
        end = time()
        results["async"].append(end-start)
        print(f"Finished async {end-start} seconds.")

        start = time()
        RMP_Update_Multiprocess(profs)
        end = time()
        results["multiprocess"].append(end-start)
        print(f"Finished multiprocess {end-start} seconds.")

    df = pd.DataFrame(results)
    df.to_csv("RMP_UPDATE_RESULTS.csv")

    