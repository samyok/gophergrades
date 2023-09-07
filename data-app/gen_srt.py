import pandas as pd
from numpy import NaN
from scipy.interpolate import interp1d
from db.Models import ClassDistribution, Session


# THIS FILE IS INCREDIBLY INEFFICIENT, NORMALIZE NEEDS TO BE OPTIMIZED SOMEHOW


def srt_frame() -> pd.DataFrame:
    """Accumulates SRT data by class name and performes averages on them. It may be better to only display most recent
    data, however, this is a point of contention to be better ideated upon.

    :return: A dataframe with unique class names containing averages for all SRT columns.
    :rtype: pd.DataFrame
    """
    df = pd.read_csv("SRT_DATA/combined_srt.csv")
    del df["Term"]  # Data only for recordkeeping, not important in calculations.
    # Sometimes this divide by zero error occurs in data, replace it with a NaN
    df = df.replace("#DIV/0!", NaN)
    df = df.astype(
        {
            "DEEP_UND": float,
            "STIM_INT": float,
            "TECH_EFF": float,
            "ACC_SUP": float,
            "EFFORT": float,
            "GRAD_STAND": float,
            "RECC": float,
            "RESP": int,
        }
    )

    # For some reason we get values smaller than 1 or greater than 6 when those are boundaries set by the SRT. We enforce it here.
    df[
        ["DEEP_UND", "STIM_INT", "TECH_EFF", "ACC_SUP", "EFFORT", "GRAD_STAND", "RECC"]
    ] = df[
        ["DEEP_UND", "STIM_INT", "TECH_EFF", "ACC_SUP", "EFFORT", "GRAD_STAND", "RECC"]
    ].apply(
        lambda x: x.apply(lambda y: NaN if (y < 1 or y > 6) else y)
    )

    # Weight each of the values.
    df[
        ["DEEP_UND", "STIM_INT", "TECH_EFF", "ACC_SUP", "EFFORT", "GRAD_STAND", "RECC"]
    ] = df[
        ["DEEP_UND", "STIM_INT", "TECH_EFF", "ACC_SUP", "EFFORT", "GRAD_STAND", "RECC"]
    ].multiply(
        df["RESP"], axis="index"
    )

    # Group and sum and divide
    ret_df = df.groupby("FULL_NAME").sum()
    ret_df = df.replace(0, NaN)

    def count_non_nans(row):
        row["DEEP_UND"] = row["RESP"] if row["DEEP_UND"] == row["DEEP_UND"] else 0
        row["STIM_INT"] = row["RESP"] if row["STIM_INT"] == row["STIM_INT"] else 0
        row["TECH_EFF"] = row["RESP"] if row["TECH_EFF"] == row["TECH_EFF"] else 0
        row["ACC_SUP"] = row["RESP"] if row["ACC_SUP"] == row["ACC_SUP"] else 0
        row["EFFORT"] = row["RESP"] if row["EFFORT"] == row["EFFORT"] else 0
        row["GRAD_STAND"] = row["RESP"] if row["GRAD_STAND"] == row["GRAD_STAND"] else 0
        row["RECC"] = row["RESP"] if row["RECC"] == row["RECC"] else 0
        return row

    count_df = df.apply(count_non_nans, axis=1)
    count_df = count_df.groupby("FULL_NAME", group_keys=False).sum()
    # Find total number of zeros in the entire dataframe of count_df and print it.
    count_df = count_df.to_dict("index")

    def normalize(row):
        loc_row = count_df[row["FULL_NAME"]]
        row["DEEP_UND"] = (
            row["DEEP_UND"] / loc_row["DEEP_UND"] if loc_row["DEEP_UND"] != 0 else NaN
        )
        row["STIM_INT"] = (
            row["STIM_INT"] / loc_row["STIM_INT"] if loc_row["STIM_INT"] != 0 else NaN
        )
        row["TECH_EFF"] = (
            row["TECH_EFF"] / loc_row["TECH_EFF"] if loc_row["TECH_EFF"] != 0 else NaN
        )
        row["ACC_SUP"] = (
            row["ACC_SUP"] / loc_row["ACC_SUP"] if loc_row["ACC_SUP"] != 0 else NaN
        )
        row["EFFORT"] = (
            row["EFFORT"] / loc_row["EFFORT"] if loc_row["EFFORT"] != 0 else NaN
        )
        row["GRAD_STAND"] = (
            row["GRAD_STAND"] / loc_row["GRAD_STAND"]
            if loc_row["GRAD_STAND"] != 0
            else NaN
        )
        row["RECC"] = row["RECC"] / loc_row["RECC"] if loc_row["RECC"] != 0 else NaN
        return row

    ret_df = ret_df.groupby("FULL_NAME", as_index=False, group_keys=False).sum()
    ret_df = ret_df.apply(normalize, axis=1)

    # Interpolator maps values on a scale of 1 to 6 onto a scale from 0 to 5.
    interpolator = interp1d([1, 6], [0, 5])
    ret_df[
        ["DEEP_UND", "STIM_INT", "TECH_EFF", "ACC_SUP", "EFFORT", "GRAD_STAND", "RECC"]
    ] = ret_df[
        ["DEEP_UND", "STIM_INT", "TECH_EFF", "ACC_SUP", "EFFORT", "GRAD_STAND", "RECC"]
    ].apply(
        interpolator
    )
    del ret_df["RESP"]
    # Split the full name into department and class number
    ret_df["DEPT"] = ret_df["FULL_NAME"].apply(lambda x: x.split()[0])
    ret_df["CLASS_NUM"] = ret_df["FULL_NAME"].apply(lambda x: x.split()[1])
    return ret_df, count_df



def gen_srt():
    ret_df, count_df = srt_frame()

    # Create an overall percentile for each value
    deep_und_overall = interp1d(
        ret_df["DEEP_UND"].dropna().sort_values(),
        ret_df["DEEP_UND"].dropna().index / (len(ret_df["DEEP_UND"].dropna()) - 1),
    )
    stim_int_overall = interp1d(
        ret_df["STIM_INT"].dropna().sort_values(),
        ret_df["STIM_INT"].dropna().index / len(ret_df["STIM_INT"].dropna() - 1),
    )
    tech_eff_overall = interp1d(
        ret_df["TECH_EFF"].dropna().sort_values(),
        ret_df["TECH_EFF"].dropna().index / len(ret_df["TECH_EFF"].dropna() - 1),
    )
    acc_sup_overall = interp1d(
        ret_df["ACC_SUP"].dropna().sort_values(),
        ret_df["ACC_SUP"].dropna().index / len(ret_df["ACC_SUP"].dropna() - 1),
    )
    effort_overall = interp1d(
        ret_df["EFFORT"].dropna().sort_values(),
        ret_df["EFFORT"].dropna().index / len(ret_df["EFFORT"].dropna() - 1),
    )
    grad_stand_overall = interp1d(
        ret_df["GRAD_STAND"].dropna().sort_values(),
        ret_df["GRAD_STAND"].dropna().index / len(ret_df["GRAD_STAND"].dropna() - 1),
    )
    recc_overall = interp1d(
        ret_df["RECC"].dropna().sort_values(),
        ret_df["RECC"].dropna().index / len(ret_df["RECC"].dropna() - 1),
    )

    def dept_percentile(dept: pd.DataFrame) -> None:
        """Iterates through the department dataframe and calculates the percentile of each class in the department.

        :param dept: a grouped dataframe by department.
        :type dept: pd.DataFrame
        """

        # Generate percentiles for the specific department
        dept = dept.reset_index()
        if len(dept["DEEP_UND"].dropna()) > 1:
            # This length check exists in case there are no values or just one for a specific attribute. Hence nothing to interpolate to.
            deep_und_dept = interp1d(
                dept["DEEP_UND"].dropna().sort_values(),
                dept["DEEP_UND"].dropna().index / (len(dept["DEEP_UND"].dropna()) - 1),
            )
        else:
            deep_und_dept = None
        
        if len(dept["STIM_INT"].dropna()) > 1:
            stim_int_dept = interp1d(
                dept["STIM_INT"].dropna().sort_values(),
                dept["STIM_INT"].dropna().index / len(dept["STIM_INT"].dropna() - 1),
            )
        else:
            stim_int_dept = None
        
        if len(dept["TECH_EFF"].dropna()) > 1:
            tech_eff_dept = interp1d(
                dept["TECH_EFF"].dropna().sort_values(),
                dept["TECH_EFF"].dropna().index / len(dept["TECH_EFF"].dropna() - 1),
            )
        else:
            tech_eff_dept = None

        if len(dept["ACC_SUP"].dropna()) > 1:
            acc_sup_dept = interp1d(
                dept["ACC_SUP"].dropna().sort_values(),
                dept["ACC_SUP"].dropna().index / len(dept["ACC_SUP"].dropna() - 1),
            )
        else:
            acc_sup_dept = None
        
        if len(dept["EFFORT"].dropna()) > 1:
            effort_dept = interp1d(
                dept["EFFORT"].dropna().sort_values(),
                dept["EFFORT"].dropna().index / len(dept["EFFORT"].dropna() - 1),
            )
        else:
            effort_dept = None

        if len(dept["GRAD_STAND"].dropna()) > 1:
            grad_stand_dept = interp1d(
                dept["GRAD_STAND"].dropna().sort_values(),
                dept["GRAD_STAND"].dropna().index / len(dept["GRAD_STAND"].dropna() - 1),
            )
        else:
            grad_stand_dept = None
        
        if len(dept["RECC"].dropna()) > 1:
            recc_dept = interp1d(
                dept["RECC"].dropna().sort_values(),
                dept["RECC"].dropna().index / len(dept["RECC"].dropna() - 1),
            )
        else:
            recc_dept = None

        # Create a new session for this iteration
        session = Session()
        
        # Iterate over all rows in the department
        for index, row in dept.iterrows():
            class_dist = session.query(ClassDistribution).filter(ClassDistribution.class_name == row["FULL_NAME"]).first()
            if class_dist:
                gen_val = {}
                if row["DEEP_UND"] == row["DEEP_UND"]:
                    gen_val["DEEP_UND"] = {
                        "val": row["DEEP_UND"],
                        "respondents": count_df[row["FULL_NAME"]]["DEEP_UND"],
                        "overall_percentile": deep_und_overall(row["DEEP_UND"]).sum(),
                        "dept_percentile": deep_und_dept(row["DEEP_UND"]).sum() if deep_und_dept else 1.0, 
                        # If there is no interpolation function, there MUST only exist one class and therefore has a percentile of 1.0
                        # This is because row["DEEP_UND"] == row["DEEP_UND"] checks if there is a value in the first place.
                        # If this value was true that means there must be a value. If deep_und_dept exists then there must be more than one value.
                    }
                if row["STIM_INT"] == row["STIM_INT"]:
                    gen_val["STIM_INT"] = {
                        "val": row["STIM_INT"],
                        "respondents": count_df[row["FULL_NAME"]]["STIM_INT"],
                        "overall_percentile": stim_int_overall(row["STIM_INT"]).sum(),
                        "dept_percentile": stim_int_dept(row["STIM_INT"]).sum() if stim_int_dept else 1.0,
                    }
                if row["TECH_EFF"] == row["TECH_EFF"]:
                    gen_val["TECH_EFF"] = {
                        "val": row["TECH_EFF"],
                        "respondents": count_df[row["FULL_NAME"]]["TECH_EFF"],
                        "overall_percentile": tech_eff_overall(row["TECH_EFF"]).sum(),
                        "dept_percentile": tech_eff_dept(row["TECH_EFF"]).sum() if tech_eff_dept else 1.0,
                    }
                if row["ACC_SUP"] == row["ACC_SUP"]:
                    gen_val["ACC_SUP"] = {
                        "val": row["ACC_SUP"],
                        "respondents": count_df[row["FULL_NAME"]]["ACC_SUP"],
                        "overall_percentile": acc_sup_overall(row["ACC_SUP"]).sum(),
                        "dept_percentile": acc_sup_dept(row["ACC_SUP"]).sum() if acc_sup_dept else 1.0,
                    }
                if row["EFFORT"] == row["EFFORT"]:
                    gen_val["EFFORT"] = {
                        "val": row["EFFORT"],
                        "respondents": count_df[row["FULL_NAME"]]["EFFORT"],
                        "overall_percentile": effort_overall(row["EFFORT"]).sum(),
                        "dept_percentile": effort_dept(row["EFFORT"]).sum() if effort_dept else 1.0,
                    }
                if row["GRAD_STAND"] == row["GRAD_STAND"]:
                    gen_val["GRAD_STAND"] = {
                        "val": row["GRAD_STAND"],
                        "respondents": count_df[row["FULL_NAME"]]["GRAD_STAND"],
                        "overall_percentile": grad_stand_overall(row["GRAD_STAND"]).sum(),
                        "dept_percentile": grad_stand_dept(row["GRAD_STAND"]).sum() if grad_stand_dept else 1.0,
                    }
                if row["RECC"] == row["RECC"]:
                    gen_val["RECC"] = {
                        "val": row["RECC"],
                        "respondents": count_df[row["FULL_NAME"]]["RECC"],
                        "overall_percentile": recc_overall(row["RECC"]).sum(),
                        "dept_percentile": recc_dept(row["RECC"]).sum() if recc_dept else 1.0,
                    }
                class_dist.srt_vals = gen_val
                session.add(class_dist)
                session.commit()

        # Close the session once complete
        session.close()

    # Apply over each department
    ret_df.groupby("DEPT").apply(dept_percentile)

if __name__ == "__main__":
    gen_srt()
    print("Updated SRT Values")
