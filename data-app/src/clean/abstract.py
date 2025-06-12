from abc import ABC, abstractmethod
import pandas as pd
from nameparser import HumanName

class CleanBase(ABC):
    """Base class for data cleaning operations."""

    def __init__(self):
        """Initialize cleaners with an empty cache to speed up lookups."""
        self.CACHED_REQ = {}
        self.CACHED_LINK = ""
    
    @abstractmethod
    def fetch_unknown_prof(self, x: pd.DataFrame) -> pd.DataFrame:
        """Abstract method to find professor names for courses.
        
        Occasionally the data provided is incomplete and is missing professor names. 
        This function looks up the professor name based on the course information provided.
        :param x: DataFrame containing course information.
        :return: DataFrame with updated professor names.
        """
        pass

    def format_name(self, x: str) -> str:
        """This function cleans up professor names to a more standardized format.
        
        Data may contain terms such as "PhD", "MD", etc. which are not needed for display.
        :param x: The name string to be formatted.
        :return: Standardized name string.
        """
        if not x == "Unknown Instructor":
            try:
                name = HumanName(x)
                name.string_format = "{first} {last}"
                retVal = str(name)
            except TypeError:
                print(f"Failed to parse {x}")
                retVal = x
        else:
            retVal = x

        return retVal