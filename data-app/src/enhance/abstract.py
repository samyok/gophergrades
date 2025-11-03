from abc import ABC, abstractmethod
from db.Models import DepartmentDistribution
from multiprocessing import Pool

class EnhanceBase(ABC):
    """Base class for data enhancement operations."""

    def __init__(self):
        pass

    @abstractmethod
    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        """Abstract method to be implemented by subclasses for enhancing data."""
        pass

    def enhance(self, dept_dists: list[DepartmentDistribution]) -> None:
        """Enhance the data for a list of department distributions in a multiprocessing pool."""
        with Pool() as pool:
            pool.map(self.enhance_helper, dept_dists)