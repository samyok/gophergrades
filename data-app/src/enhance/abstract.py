from abc import ABC, abstractmethod
from db.Models import DepartmentDistribution
import asyncio

class EnhanceBase(ABC):
    """Base class for data enhancement operations."""
    def __init__(self):
        pass

    @abstractmethod
    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        """Abstract method to be implemented by subclasses for enhancing data."""
        pass

    async def enhance(self, dept_dists: list[DepartmentDistribution]) -> None:
        """Enhance the data for a list of department distributions in a multiprocessing pool."""

        semaphore = asyncio.Semaphore(10)  # Limit concurrent tasks to 10
        
        tasks = [self.enhance_helper(dept) for dept in dept_dists]
        await asyncio.gather(*tasks)
