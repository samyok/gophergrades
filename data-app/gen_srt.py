import pandas as pd
from numpy import NaN
from scipy.interpolate import interp1d

# THIS FILE IS INCREDIBLY INEFFICIENT, NORMALIZE NEEDS TO BE OPTIMIZED SOMEHOW


def srt_frame() -> pd.DataFrame:
    """Accumulates SRT data by class name and performes averages on them. It may be better to only display most recent
    data, however, this is a point of contention to be better ideated upon.

    :return: A dataframe with unique class names containing averages for all SRT columns.
    :rtype: pd.DataFrame
    """
    df = pd.read_csv("SRT_DATA/combined_srt.csv")
    del df["Term"] # Data only for recordkeeping, not important in calculations.
    # Sometimes this divide by zero error occurs in data, replace it with a NaN
    df = df.replace("#DIV/0!",NaN)
    df = df.astype({'DEEP_UND': float,'STIM_INT': float,'TECH_EFF': float,'ACC_SUP': float,'EFFORT': float,'GRAD_STAND': float,'RECC': float,'RESP': int})

    # For some reason we get values smaller than 1 or greater than 6 when those are boundaries set by the SRT. We enforce it here.
    df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']] = df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']].apply(lambda x: x.apply(lambda y: NaN if (y < 1 or y > 6) else y))
    
    # Weight each of the values.
    df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']] = df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']].multiply(df["RESP"],axis="index")

    # Group and sum and divide
    ret_df = df.groupby("FULL_NAME").sum()
    ret_df = df.replace(0,NaN)

    def count_non_nans(row):
        row["DEEP_UND"] = row["RESP"] if row["DEEP_UND"] == row["DEEP_UND"] else 0
        row["STIM_INT"] = row["RESP"] if row["STIM_INT"] == row["STIM_INT"] else 0
        row["TECH_EFF"] = row["RESP"] if row["TECH_EFF"] == row["TECH_EFF"] else 0
        row["ACC_SUP"] = row["RESP"] if row["ACC_SUP"] == row["ACC_SUP"] else 0
        row["EFFORT"] = row["RESP"] if row["EFFORT"] == row["EFFORT"] else 0
        row["GRAD_STAND"] = row["RESP"] if row["GRAD_STAND"] == row["GRAD_STAND"] else 0
        row["RECC"] = row["RESP"] if row["RECC"] == row["RECC"] else 0
        return row

    count_df = df.apply(count_non_nans,axis=1)
    count_df = count_df.groupby("FULL_NAME",group_keys=False,as_index=False).sum()

    def normalize(row):
        loc_row = count_df[count_df["FULL_NAME"] == row["FULL_NAME"]]
        row["DEEP_UND"] = row["DEEP_UND"]/loc_row["DEEP_UND"].sum()
        row["STIM_INT"] = row["STIM_INT"]/loc_row["STIM_INT"].sum()
        row["TECH_EFF"] = row["TECH_EFF"]/loc_row["TECH_EFF"].sum()
        row["ACC_SUP"] = row["ACC_SUP"]/loc_row["ACC_SUP"].sum()
        row["EFFORT"] = row["EFFORT"]/loc_row["EFFORT"].sum()
        row["GRAD_STAND"] = row["GRAD_STAND"]/loc_row["GRAD_STAND"].sum()
        row["RECC"] = row["RECC"]/loc_row["RECC"].sum()
        return row
    
    ret_df = ret_df.groupby("FULL_NAME",as_index=False,group_keys=False).sum()
    ret_df = ret_df.apply(normalize,axis=1)
    

    # Interpolator maps values on a scale of 1 to 6 onto a scale from 0 to 5.
    interpolator = interp1d([1,6],[0,5])
    ret_df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']] = ret_df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']].apply(interpolator)
    return ret_df


if __name__ == "__main__":
    df = srt_frame()
    print(df)