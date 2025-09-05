from abc import ABC, abstractmethod
from db.Models import DepartmentDistribution
from multiprocessing import Pool
import os

class EnhanceBase(ABC):
    """Base class for data enhancement operations."""

    def __init__(self):
        # Default to multiprocessing unless explicitly disabled
        self.use_multiprocessing = os.getenv('USE_MULTIPROCESSING', 'true').lower() == 'true'

    @abstractmethod
    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        """Abstract method to be implemented by subclasses for enhancing data."""
        pass

    def enhance(self, dept_dists: list[DepartmentDistribution]) -> None:
        """Enhance the data for a list of department distributions."""
        if self.use_multiprocessing and len(dept_dists) > 1:
            print(f"[API Enhance] Using multiprocessing mode with {len(dept_dists)} departments")
            with Pool() as pool:
                pool.map(self.enhance_helper, dept_dists)
        else:
            print(f"[API Enhance] Using sequential processing mode for {len(dept_dists)} departments")
            for dept_dist in dept_dists:
                self.enhance_helper(dept_dist)