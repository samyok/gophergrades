#coundn't edit the db directly
import sqlite3
import sys

def delete_row():
    db_path = input("Enter database path (e.g., ProcessedData.db): ")
    table_name = input("Enter table name: ")
    condition = input("Enter WHERE condition (e.g., id = 123): ")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT * FROM {table_name} WHERE {condition}")
        rows = cursor.fetchall()
        
        if not rows:
            print("No rows match the condition.")
            return
            
        print(f"Found {len(rows)} row(s) to delete:")
        for row in rows:
            print(row)
        
        confirm = input("Delete these rows? (y/N): ")
        if confirm.lower() == 'y':
            cursor.execute(f"DELETE FROM {table_name} WHERE {condition}")
            conn.commit()
            print(f"Deleted {cursor.rowcount} row(s)")
        else:
            print("Deletion cancelled")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    delete_row()
