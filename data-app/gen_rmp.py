from db.Models import Professor, session
import ratemyprofessor as rmp
from multiprocessing import Pool

# Tries to find the Univeristy of Minnesota - Twin Cities on RateMyProfessor.
SCHOOL = rmp.School(school_id=1257)

def update(prof):
    # This depends on internet connection, it's possible that fail an update if the internet disconnects.
    RMP_Prof = rmp.get_professor_by_school_and_name(SCHOOL,prof.name)
    try:
        # Original prof is a Query object, doing this gets us the actual object for modification.
        prof = session.query(Professor).filter(Professor.id == prof.id).first()
        prof.RMP_score = RMP_Prof.rating
        prof.RMP_diff = RMP_Prof.difficulty
        prof.RMP_link = f"https://www.ratemyprofessors.com/professor/{RMP_Prof.id}"
        session.commit()
        print(f"Gave {prof.name} ({RMP_Prof.name}) an RMP score of {prof.RMP_score}")
    except ValueError:
        pass
        print(f"Failed to find or update {prof.name}")
    except AttributeError:
        pass
        print(f"Failed to update {prof.name} with no attributes.")
    except Exception as e:
        pass
        print(f"Failed to update {prof.name} with unknown error {e}.")

def RMP_Update_Multiprocess():
    profs = session.query(Professor).all()
    with Pool(10) as p:
        p.map(update, profs)

if __name__ == "__main__":
    # df=pd.read_csv("CLASS_DATA/combined_clean_data.csv")
    # df["RMP_SCORE"],df["RMP_DIFF"],df["RMP_LINK"]=zip(*df["HR_NAME"].map(getRMP))
    # print(df)
    pass  