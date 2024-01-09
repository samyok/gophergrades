# Cleaning and Combining SRT Data

## Cleaning

To clean data remove all columns except for the following:

Term: The term the course was taken
DEEP_UND: The value of deeper understanding for the course
STIM_INT: How stimulating and intellectually challenging the course was
TECH_EFF: How effective the technology used in the course was
ACC_SUP: How activities in the course supported the learning objectives
EFFORT: If effort for success was reasonable
GRAD_STAND: If the grading standards were fair and clear
RECC: If the student would recommend the course to others
RESP: The number of responses for the course
FULL_NAME: The full name of the course such as `CSCI 2011`

## Combining

Load both pre-covid Fall 2019 data and post covid Fall 2020 data into dataframes. Use the `pd.concat` function to combine the two dataframes. Then use the `pd.to_csv` function to save the combined dataframe as a csv file. Ensure that when saving to csv that the `index` parameter is set to `False` to avoid saving the index as a column in the csv file.