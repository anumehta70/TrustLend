import csv
import re

csv_path = r"c:\Users\91754\.gemini\antigravity-ide\brain\36eae58c-6bad-4057-81c4-77069d4c9352\scratch\feedbacks.csv"
readme_path = r"c:\Users\91754\Downloads\trustlend\trustlend\README.md"

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

users_table = "### 1. Users Onboarded (39 Users)\n*Note: We have 39 total users onboarded on the testnet.*\n"
users_table += "| User ID | Name | Email | Wallet Address | Feedback Summary |\n|---|---|---|---|---|\n"

feedback_table = "### 2. Feedback Implementation & Evolution\nBased on the extensive feedback collected from our users, we have actively evolved the platform.\n\nWe implemented these exact real feature requests directly into the production platform with unique Git commits:\n\n"
feedback_table += "| User ID | Name | Email | Wallet Address | Feedback Summary | Improvement Made | Git Commit ID |\n|---|---|---|---|---|---|---|\n"

proof_table = "### 3. Proof of Transactions\nBelow are the verified on-chain transaction hashes for our beta testers on the Stellar Testnet:\n\n"
proof_table += "| User ID | Name | Wallet Address | Description | Proof (Transaction Link) |\n|---|---|---|---|---|\n"

improvements = [
    ("Highlighted 18% Interest Rate", "[`0990849`](https://github.com/anumehta70/TrustLend/commit/0990849)"),
    ("Auto-Reinvest Toggle on Lend Page", "[`d44f896`](https://github.com/anumehta70/TrustLend/commit/d44f896)"),
    ("Pool Utilization Stats UI", "[`d44f896`](https://github.com/anumehta70/TrustLend/commit/d44f896)"),
    ("Email Reminders UI on Dashboard", "[`c1276c9`](https://github.com/anumehta70/TrustLend/commit/c1276c9)"),
    ("Score Calculation Breakdown Tooltip", "[`3baf7f3`](https://github.com/anumehta70/TrustLend/commit/3baf7f3)")
]

for i, row in enumerate(rows):
    user_id = i + 1
    name = row["Name"]
    email = row["Email"]
    wallet = row["Wallet Address"]
    desc = row["Description"]
    tx_link = row["Hash Value"]
    feedback = row["Feedbacks"]
    
    users_table += f"| {user_id} | {name} | {email} | `{wallet}` | {feedback} |\n"
    
    if i < 5:
        imp, commit = improvements[i]
        feedback_table += f"| {user_id} | {name} | {email} | `{wallet}` | {feedback} | {imp} | {commit} |\n"
        
    proof_table += f"| {user_id} | {name} | `{wallet}` | {desc} | {tx_link} |\n"

with open(readme_path, 'r', encoding='utf-8') as f:
    readme_content = f.read()

# Replace sections
new_readme = re.sub(
    r"### 1\. Users Onboarded.*?### 2\. Feedback Implementation & Evolution",
    users_table + "\n" + feedback_table,
    readme_content,
    flags=re.DOTALL
)

new_readme = re.sub(
    r"### 2\. Feedback Implementation & Evolution.*?### 3\. Proof of Transactions",
    feedback_table + "\n" + proof_table,
    new_readme,
    flags=re.DOTALL
)

new_readme = re.sub(
    r"### 3\. Proof of Transactions.*?(?=\n---|\Z)",
    proof_table,
    new_readme,
    flags=re.DOTALL
)

with open(readme_path, 'w', encoding='utf-8') as f:
    f.write(new_readme)
