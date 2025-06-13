from .abstract import AbstractRMP
from db.Models import Professor, Session

class RMP(AbstractRMP):
    """Concrete implementation of the AbstractRMP interface."""

    def update_prof_by_name(self, prof: Professor) -> None:
        profMatches = []
        for school in self.SCHOOLS:
            profMatches.extend(self.get_prof_by_school_and_name(school, prof.name))

        profMatches = list(filter(lambda x: str.strip(x["node"]["firstName"] + " " + x["node"]["lastName"]) == prof.name, profMatches))
        if len(profMatches) == 0:
            print(f"[RMP Fail] Failed to find {prof.name}")
            return
        elif len(profMatches) > 1:
            print(f"[RMP Fail] Ambiguous match for {prof.name}")
            return
        else:
            RMP_Prof = profMatches[0]["node"]
            try:
                session = Session()
                session.query(Professor).filter(Professor.id == prof.id).update({
                    Professor.RMP_score: RMP_Prof["avgRating"],
                    Professor.RMP_diff: RMP_Prof["avgDifficulty"],
                    Professor.RMP_link: f"https://www.ratemyprofessors.com/professor/{RMP_Prof['legacyId']}"
                })
                session.commit()
                print(f"[RMP Update] Gave {prof.name} an RMP score of {prof.RMP_score}")
            except ValueError:
                print(f"[RMP Fail] Failed to find or update {prof.name}")
            except AttributeError as e:
                print(f"[RMP Fail] Failed to update {prof.name} with no attributes. {e}")
            except Exception as e:
                print(f"[RMP Fail] Failed to update {prof.name} with unknown error {e}.")
            finally:
                session.close()