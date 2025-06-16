from abc import ABC, abstractmethod
import pandas as pd

class AbstractSRT(ABC):
    """Defines the interface to get reviews from SRT (Student Rating of Teachers)."""
    dataframe = None

    @staticmethod
    @abstractmethod
    def initialize(filename: str) -> None:
        """Fetch reviews for a specific school."""
        pass

    @staticmethod
    @abstractmethod
    def insertReviews() -> None:
        """Insert reviews into the database."""
        pass