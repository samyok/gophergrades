from db.Models import Professor, Session
import ratemyprofessor as rmp
from multiprocessing import Pool

# Tries to find the Univeristy of Minnesota - Twin Cities on RateMyProfessor.
SCHOOL = rmp.School(school_id=1257)

def update(prof):
    # This depends on internet connection, it's possible that fail an update if the internet disconnects.
    RMP_Profs = list(filter(lambda rmp_prof: rmp_prof.school.id == 1257,rmp.get_professors_by_school_and_name(SCHOOL,prof.name)))
    
    if (len(RMP_Profs) == 0):
        print(f"Failed to find {prof.name}")
        return 
    elif (len(RMP_Profs) > 1):
        print(f"Ambigious Match {prof.name}")
        return
    else:
        RMP_Prof = RMP_Profs[0]
        try:
            # Original prof is a Query object, doing this gets us the actual object for modification.
            session = Session()
            prof = session.query(Professor).filter(Professor.id == prof.id).first()
            prof.RMP_score = RMP_Prof.rating
            prof.RMP_diff = RMP_Prof.difficulty
            prof.RMP_link = f"https://www.ratemyprofessors.com/professor/{RMP_Prof.id}"
            session.commit()
            print(f"Gave {prof.name} ({RMP_Prof.name}) an RMP score of {prof.RMP_score}")
            session.close()
        except ValueError:
            print(f"Failed to find or update {prof.name}")
            session.close()
        except AttributeError:
            print(f"Failed to update {prof.name} with no attributes.")
            session.close()
        except Exception as e:
            print(f"Failed to update {prof.name} with unknown error {e}.")
            session.close()
    

def RMP_Update_Multiprocess():
    session = Session()
    profs = session.query(Professor).order_by(Professor.name).all()
    session.close()
    with Pool(10) as p:
        p.map(update, profs)

if __name__ == "__main__":
    RMP_Update_Multiprocess()