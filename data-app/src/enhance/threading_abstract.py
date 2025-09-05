from abc import ABC, abstractmethod
from db.Models import DepartmentDistribution
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import threading
import time

class ThreadingEnhanceBase(ABC):
    """Base class for data enhancement operations using threading instead of multiprocessing."""

    def __init__(self):
        self.use_threading = os.getenv('USE_THREADING', 'true').lower() == 'true'
        self.max_workers = int(os.getenv('MAX_WORKERS', '4'))

    @abstractmethod
    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        """Abstract method to be implemented by subclasses for enhancing data."""
        pass

    def enhance(self, dept_dists: list[DepartmentDistribution]) -> None:
        """Enhance the data for a list of department distributions using threading."""
        if self.use_threading and len(dept_dists) > 1:
            print(f"[API Enhance] Using threading mode with {self.max_workers} workers for {len(dept_dists)} departments")
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit all tasks
                future_to_dept = {
                    executor.submit(self.enhance_helper, dept_dist): dept_dist 
                    for dept_dist in dept_dists
                }
                
                # Process completed tasks
                for future in as_completed(future_to_dept):
                    dept_dist = future_to_dept[future]
                    try:
                        future.result()  # This will raise any exception that occurred
                        print(f"[API Enhance] Completed processing {dept_dist.dept_abbr}")
                    except Exception as e:
                        print(f"[API Enhance] Error processing {dept_dist.dept_abbr}: {e}")
        else:
            print(f"[API Enhance] Using sequential processing mode for {len(dept_dists)} departments")
            for dept_dist in dept_dists:
                self.enhance_helper(dept_dist)
