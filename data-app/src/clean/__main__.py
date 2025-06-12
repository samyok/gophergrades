import sys
import pandas as pd
from scheduleBuilder import ScheduleBuilderCleaner

def drop_columns(x: pd.DataFrame) -> pd.DataFrame:
    columns_to_drop = [
        "TERM_DESCR",
        "COMPONENT_MAIN",
        "INSTR_ROLE",
        "JOBCODE_DESCR",
        "UM_JOBCODE_GROUP",
        "CLASS_HDCNT",
    ]
    x = x.loc[~(x["CRSE_GRADE_OFF"] == "NR")]
    return x.drop(columns=columns_to_drop, errors='ignore')

def add_term(x: pd.DataFrame, term: int) -> pd.DataFrame:
    x["TERM"] = term
    return x

def add_columns(x: pd.DataFrame) -> pd.DataFrame:
    x["FULL_NAME"] = x["SUBJECT"] + " " + x["CATALOG_NBR"]
    x["CLASS_SECTION"] = x["CLASS_SECTION"].apply(lambda section: section.zfill(3))
    return x

def main():
    if len(sys.argv) != 4:
        print("Usage: python -m clean <file_name> <output_file> <term>")
        return 1
    
    fileName = sys.argv[1]
    outputFile = sys.argv[2]
    term = int(sys.argv[3])
    print(f"Processing file: {fileName} for term: {term}")

    df = pd.read_csv(fileName, dtype={"CLASS_SECTION": str})
    df = drop_columns(df)
    df = add_term(df, term)
    df = add_columns(df)

    cleaner = ScheduleBuilderCleaner()
    df = df.groupby(["TERM", "FULL_NAME", "CAMPUS"]).apply(
        cleaner.fetch_unknown_prof
    )

    df["NAME"] = df["NAME"].apply(cleaner.format_name)

    df.to_csv(outputFile, index=False)
    print(f"Output written to: {outputFile}")
    return 0


if __name__ == "__main__":
    sys.exit(main())