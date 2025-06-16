from .abstract import AbstractSRT
import pandas as pd
from db.Models import Session, ClassDistribution

class SRT(AbstractSRT):
    """Implements the interface to get reviews from SRT (Student Rating of Teachers)."""
    
    @staticmethod
    def initialize(filename: str) -> None:
        df = pd.read_csv(filename, encoding='utf-8')
        df.columns = [
            "SUBJECT",
            "CATALOG_NBR",
            "TITLE",
            "TERM",
            "DEEP_UND",
            "STIM_INT",
            "TECH_EFF",
            "ACC_SUP",
            "EFFORT",
            "GRAD_STAND",
            "RECC",
            "RESP"
        ]
        df["FULL_NAME"] = df["SUBJECT"] + " " + df["CATALOG_NBR"]
        df.drop(["SUBJECT", "CATALOG_NBR", "TITLE", "TERM"], axis=1, inplace=True)
        grouped_df = df.groupby("FULL_NAME").aggregate(
            {
                "DEEP_UND": "mean",
                "STIM_INT": "mean",
                "TECH_EFF": "mean",
                "ACC_SUP": "mean",
                "EFFORT": "mean",
                "GRAD_STAND": "mean",
                "RECC": "mean",
                "RESP": "sum"
            }
        )
        SRT.dataframe = grouped_df

    @staticmethod
    def insertHelper(row: pd.Series) -> pd.Series:
        session = Session()
        try:
            subject, crse_nbr = str(row.name).split(" ", 1)
            classDist = session.query(ClassDistribution).filter(
                ClassDistribution.campus == "UMNTC",
                ClassDistribution.dept_abbr == subject,
                ClassDistribution.course_num == crse_nbr
            ).first()
            if classDist:
                classDist.srt_vals = row.to_dict()
                session.commit()
                print(f"[SRT UPDATE] Updated {row.name} with new SRT data")
            else:
                print(f"[SRT FAIL] ClassDistribution for {row.name} not found. Cannot update SRT data.")
        except Exception as e:
            session.rollback()
            print(f"[SRT ERROR] Failed to update {row.name} with SRT data: {e}")
            raise e
        finally:
            session.close()
        return row

    @staticmethod
    def insertReviews() -> None:
        if SRT.dataframe is None:
            raise ValueError("Dataframe is not initialized.")
    
        SRT.dataframe.apply(SRT.insertHelper, axis=1)
