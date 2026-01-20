import pandas as pd
from courseInfo import CourseInfoCleaner
import requests
import warnings

warnings.filterwarnings("ignore")

class ScheduleBuilderCleaner(CourseInfoCleaner):
    def fetch_unknown_prof(self, x: pd.DataFrame) -> pd.DataFrame:
        dept = x["SUBJECT"].iloc[0]
        catalog_nbr = x["CATALOG_NBR"].iloc[0]
        if not x["NAME"].isnull().any():
            print(f"[SB PRESENT] Skipping search for {dept} {catalog_nbr}")
            return x
        
        term = str(x["TERM"].iloc[0])
        institution = str(x["INSTITUTION"].iloc[0])
        campus = str(x["CAMPUS"].iloc[0])

        course_resp = requests.get(
            "https://schedulebuilder.umn.edu/api.php",
            params={
                "type": "course",
                "institution": institution,
                "campus": campus,
                "term": term,
                "subject": dept,
                "catalog_nbr": catalog_nbr,
            },
        )

        if course_resp.status_code != 200:
            print(f"Failed to fetch section data for {dept} {catalog_nbr}")
            return x

        data = course_resp.json()

        if len(data["sections"]) == 0:
            # No data to work with, fall back to old method.
            # print(f"Failed to fetch overall data for {dept} {catalog_nbr}: {course_resp.url}")
            retVal =  x.groupby(["CLASS_SECTION"], group_keys=False).apply(
                super().fetch_unknown_prof
            )
            retVal["NAME"].fillna("Unknown Instructor", inplace=True)
            return retVal

        sections_resp = requests.get(
            "https://schedulebuilder.umn.edu/api.php",
            params={
                "type": "sections",
                "institution": institution,
                "campus": campus,
                "term": term,
                "class_nbrs": ", ".join([str(x) for x in data["sections"]]),
            },
        )

        if sections_resp.status_code != 200:
            print(f"Failed to fetch section data for {dept} {catalog_nbr}")
            return x

        root = []
        children = []
        for item in sections_resp.json():
            if not item.get("auto_enroll_sections?"):
                if not item.get("meetings"):
                    # This course just doesn't meet so skip it
                    continue

                for meeting in item["meetings"]:
                    if meeting.get("instructors"):
                        instructor_info = meeting["instructors"][0]
                        root.append(
                            (
                                item["id"],
                                instructor_info.get("label_name", "Unknown Instructor"),
                                instructor_info.get("internet_id", ""),
                                item.get('section_number',"")
                            )
                        )
                        break
            else:
                children.append((item["section_number"], item["auto_enroll_sections"][0]))

        root_df = pd.DataFrame(root, columns=['id', 'NAME', 'INTERNET_ID', "CLASS_SECTION"])
        children_df = pd.DataFrame(children, columns=['CLASS_SECTION', 'root_id'])

        merged_instructors = pd.merge(root_df, children_df, left_on='id', right_on='root_id', how='outer')

        del merged_instructors['root_id']
        del merged_instructors['id']

        merged_instructors["CLASS_SECTION_y"].fillna(merged_instructors["CLASS_SECTION_x"], inplace=True)
        del merged_instructors["CLASS_SECTION_x"]
        merged_instructors.rename(columns={"CLASS_SECTION_y": "CLASS_SECTION"}, inplace=True)

        merged_total = pd.merge(x, merged_instructors, on='CLASS_SECTION', how='left')
        merged_total["NAME_x"].fillna(merged_total["NAME_y"], inplace=True)
        del merged_total["NAME_y"]
        merged_total.rename(columns={"NAME_x": "NAME"}, inplace=True)

        merged_total["INTERNET_ID_x"].fillna(merged_total["INTERNET_ID_y"], inplace=True)
        del merged_total["INTERNET_ID_y"]
        merged_total.rename(columns={"INTERNET_ID_x": "INTERNET_ID"}, inplace=True)

        merged_total["NAME"] = merged_total["NAME"].astype("string")
        merged_total["INTERNET_ID"] = merged_total["INTERNET_ID"].astype("string")

        merged_total["NAME"].fillna("Unknown Instructor", inplace=True)

        print(f"[SB SEARCH] Filled data for {dept} {catalog_nbr}")

        return merged_total

