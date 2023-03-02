import pandas as pd
from numpy import nansum, nanmean, NaN
from scipy.interpolate import interp1d

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
    df = df.astype({
        'DEEP_UND': float,
        'STIM_INT': float,
        'TECH_EFF': float,
        'ACC_SUP': float,
        'EFFORT': float,
        'GRAD_STAND': float,
        'RECC': float,
        'RESP': int
    })

    # For some reason we get values smaller than 1 or greater than 6 when those are boundaries set by the SRT. We enforce it here.
    df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']] = \
        df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']]\
            .apply(lambda x: x.apply(lambda y: NaN if (y < 1 or y > 6) else y))
    df = df.groupby("FULL_NAME", group_keys=False).agg({
        'DEEP_UND': nanmean,
        'STIM_INT': nanmean,
        'TECH_EFF': nanmean,
        'ACC_SUP': nanmean,
        'EFFORT': nanmean,
        'GRAD_STAND': nanmean,
        'RECC': nanmean,
        'RESP': nansum
    })
    # Interpolator maps values on a scale of 1 to 6 onto a scale from 1 to 5.
    interpolator = interp1d([1,6],[1,5])
    df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']] = df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']].apply(interpolator)
    return df.reset_index()