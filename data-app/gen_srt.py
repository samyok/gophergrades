import pandas as pd
from numpy import nansum, nanmean, NaN
from scipy.interpolate import interp1d

def srt_frame() -> pd.DataFrame:
    df = pd.read_csv("SRT_DATA/combined_srt.csv")
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
    interpolator = interp1d([1,6],[1,5])
    df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']] = df[['DEEP_UND','STIM_INT','TECH_EFF','ACC_SUP','EFFORT','GRAD_STAND','RECC']].apply(interpolator)
    return df.reset_index()