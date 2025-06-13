from rmp import RMP
import sys

def main():
    print("[RMP] Starting to update professors from Rate My Professor...")
    RMP().update_profs()
    print("[RMP] Finished updating professors from Rate My Professor.")
    return 0

if __name__ == "__main__":
    sys.exit(main())