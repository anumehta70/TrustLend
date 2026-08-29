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

users_table = "### 1. Users Onboarded (First 14 Users)\n"
users_table += "*Note: We onboarded 14 testnet users and tracked their transactions and feedback.*\n"
users_table += "| User ID | Name | Email | Wallet Address | Proof (Transaction) | Feedback Summary |\n"
users_table += "|---|---|---|---|---|---|\n"

feedback_table = "### 2. Feedback Implementation & Evolution\n"
feedback_table += "Based on the feedback collected, we actively evolved the platform during the hackathon. We implemented these exact real feature requests directly into the production platform with unique Git commits:\n\n"
feedback_table += "| User ID | Name | Email | Wallet Address | Feedback Summary | Improvement Made | Git Commit ID |\n"
feedback_table += "|---|---|---|---|---|---|---|\n"

implemented = {
    "Rohit Chauhan": ("Highlighted 18% Interest Rate", "[`0990849`](https://github.com/anumehta70/TrustLend/commit/0990849)"),
    "Aarav Sharma": ("Score Calculation Breakdown Tooltip", "[`3baf7f3`](https://github.com/anumehta70/TrustLend/commit/3baf7f3)"),
    "Jyoti Tiwari": ("Email Reminders UI on Dashboard", "[`c1276c9`](https://github.com/anumehta70/TrustLend/commit/c1276c9)"),
    "Priya Jain": ("Auto-Reinvest Toggle on Lend Page", "[`d44f896`](https://github.com/anumehta70/TrustLend/commit/d44f896)"),
    "Suresh Singh": ("Pool Utilization Stats UI", "[`d44f896`](https://github.com/anumehta70/TrustLend/commit/d44f896)")
}

user_id = 1
for row in reader:
    name = row["Full Name"]
    email = row["Email Address"]
    wallet = row["Wallet Address"]
    tx = row["Transaction Hash Value"]
    feedback = row["Feedback or suggestions for improvements"]
    
    short_tx = tx[:6] + "..." + tx[-4:]
    tx_link = f"[`{short_tx}`](https://testnet.steexp.com/tx/{tx})"
    
    users_table += f"| {user_id} | {name} | {email} | `{wallet}` | {tx_link} | {feedback} |\n"
    
    if name in implemented:
        imp, commit = implemented[name]
        feedback_table += f"| {user_id} | {name} | {email} | `{wallet}` | {feedback} | {imp} | {commit} |\n"
        
    user_id += 1

with open("tables.md", "w", encoding="utf-8") as f:
    f.write(users_table + "\n\n" + feedback_table)
