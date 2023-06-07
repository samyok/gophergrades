# Data Application

This document details the functions and reasons regarding each file present here in the folder including how to (re)generate data for the frontend application.

## clean_initial.py
This file's primary purpose is to cut down the information stored in a CSV to the following column names:

| Column Name    |                                                                                                    Description |
|:---------------|---------------------------------------------------------------------------------------------------------------:|
| TERM           |                 The Term ID Refering to the grade term. Can be found on [Classinfo](http://classinfo.umn.edu/) |
| SUBJECT        |                                                           The department from which this class is offered from |
| CATALOG_NBR    |                                                               The specific course number refering to the class |
| CLASS_SECTION  |                 The specific section for which this data is associated with, used only to traceback professors |
| DESCR          |                                The default - often abbreviated - class name which is expanded in `dist_gen.py` |
| CRSE_GRADE_OFF |                                                                                 The grade given for that class |
| GRADE_HDCNT    |                                      The number of students that recieved the grade listed in `CRSE_GRADE_OFF` |
| HR_NAME        |      The instructor name for that set of grades, keep in mind this is not always the professor and may be a TA |
| FULL_NAME      | This should be data engineered by the file by concatinating the values of `SUBJECT` and `CATALOG_NBR` together |

When you have these, and only these column names you can combine it with old data using [`pandas.concat()`](https://pandas.pydata.oprg/pandas-docs/stable/reference/api/pandas.concat.html).

## getRMP.py
This files primary purpose is to fetch RateMyProfessor, henceafter refered to as RMP, information from their api and provide the function `getRMP(name)` to help query for information regarding a professor. This is often inaccurate as many professors are not listed on RMP or are listed under an alternate or misspelled name. Most of these issues are beyond the scope of any cleaning algorithm and we request that people who notice a mismatch submit a correction to RMP.

## gen_srt.py
Accumulates SRT data by class name and performes averages on them returning this as a dataframe. It may be better to only display most recent data, however, this is a point of contention to be better ideated upon.

## dist_gen.py
The most vital file that handles data insertion into the database. `process_class` does initial insertion of distributions into the database. `srt_updating` associates SRT data with their corresponding class should it exist. `fetch_better_title` searches through classinfo to find non abbreviated names of classes. Lastly we fetch ASR information which gives us data regarding credits, onestop links, class name, and if the class satisfies some libed requirement.