import json
import os

def format_prompts():
    input_path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\raw_prompts.txt'
    output_path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\QuanFin_Terminal_Prompts_History.txt'
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    with open(input_path, 'r', encoding='utf-16le' if os.name == 'nt' else 'utf-8') as f:
        lines = f.readlines()

    header = [
        "===========================================================",
        "      QUANFIN CAPITAL TERMINAL - PROJECT HISTORY LOG         ",
        "===========================================================",
        f"Total Conversation Sessions: 90",
        f"Major Feature Requests Extracted: {len(lines)}",
        "-----------------------------------------------------------\n"
    ]

    formatted_entries = []
    for line in lines:
        if '|' not in line:
            continue
        
        timestamp, summary = line.strip().split('|', 1)
        # Convert 2026-01-31T09:44:18.360265500Z to [2026-01-31 09:44]
        date_part = timestamp.split('T')[0]
        time_part = timestamp.split('T')[1][:5]
        
        entry = (
            f"DATE: {date_part} {time_part}\n"
            f"GOAL: {summary}\n"
            "-----------------------------------------------------------"
        )
        formatted_entries.append(entry)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(header) + "\n")
        f.write("\n\n".join(formatted_entries))
        f.write("\n\n=== END OF LOG ===")

    print(f"Successfully wrote {len(formatted_entries)} entries to {output_path}")

if __name__ == "__main__":
    format_prompts()
