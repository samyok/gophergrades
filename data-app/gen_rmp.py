from multiprocessing import Pool

import ratemyprofessor as rmp

from db.Models import Professor, Session

# Tries to find the University of Minnesota - Twin Cities on RateMyProfessor.
SCHOOL = rmp.School(school_id=1257)


def update(prof):
    session = Session()
    try:
        # Retrieve all potential matches for the professor's name at the specified school
        potential_profs = rmp.get_professors_by_school_and_name(SCHOOL, prof.name)
        best_match = None
        for candidate in potential_profs:
            # Check if the candidate's school ID matches the desired school ID
            if candidate.school.id == SCHOOL.id and candidate.name == prof.name and candidate.rating > 0:
                best_match = candidate
                break  # Assuming you want the first correct match, otherwise you can use other criteria

        if best_match:
            # Fetch the professor object to update
            prof = session.query(Professor).filter(Professor.id == prof.id).first()
            prev = prof.RMP_score
            prof.RMP_score = best_match.rating
            prof.RMP_diff = best_match.difficulty
            prof.RMP_link = f"https://www.ratemyprofessors.com/professor/{best_match.id}"
            session.commit()
            print(f"Updated {prof.name} with RMP score {prof.RMP_score} (prev: {prev})")
        else:
            print(f"No suitable match found for {prof.name} at the correct school")
            prof = session.query(Professor).filter(Professor.id == prof.id).first()
            prev = prof.RMP_score
            prev_link = prof.RMP_link
            prof.RMP_score = None
            prof.RMP_diff = None
            prof.RMP_link = None
            session.commit()
            print(f"Removed {prof.name}'s RMP score (prev: {prev} @ {prev_link})")
    except Exception as e:
        print(f"Failed to update {prof.name} with error: {e}")
    finally:
        session.close()

def RMP_Update_Multiprocess():
    session = Session()
    profs = session.query(Professor).order_by(Professor.name).all()
    session.close()
    with Pool(10) as p:
        p.map(update, profs)


if __name__ == "__main__":
    RMP_Update_Multiprocess()
