import csv
import io

csv_path = r"C:\Users\91754\.gemini\antigravity-ide\brain\36eae58c-6bad-4057-81c4-77069d4c9352\.system_generated\steps\1247\content.md"

with open(csv_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

csv_start = 0
for i, line in enumerate(lines):
    if "Timestamp,Full Name,Email Address" in line:
        csv_start = i
        break

csv_lines = lines[csv_start:]
reader = csv.DictReader(io.StringIO("".join(csv_lines)))

proof_table = "| User ID | Name | Wallet Address | Proof (Transaction Link) |\n"
proof_table += "|---|---|---|---|\n"

user_id = 1
for row in reader:
    name = row["Full Name"]
    wallet = row["Wallet Address"]
    tx = row["Transaction Hash Value"]
    
    short_tx = tx[:6] + "..." + tx[-4:]
    tx_link = f"[`{short_tx}`](https://testnet.steexp.com/tx/{tx})"
    proof_table += f"| {user_id} | {name} | `{wallet}` | {tx_link} |\n"
        
    user_id += 1

with open("proof_table.md", "w", encoding="utf-8") as f:
    f.write(proof_table)
