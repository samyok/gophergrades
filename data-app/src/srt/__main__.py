from srt import SRT
import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python -m srt <file_name>")
        return 1

    fileName = sys.argv[1]
    print(f"Processing file: {fileName}")
    try:
        SRT.initialize(fileName)
        SRT.insertReviews()
    except Exception as e:
        print(f"An error occurred: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())