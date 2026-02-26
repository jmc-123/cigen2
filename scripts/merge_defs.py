import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
SRC = os.path.join(ROOT, "data", "roots_affixes-2.json")

with open(SRC, "r", encoding="utf-8") as f:
    data = json.load(f)

# Load all definition batch files
all_defs = {}
for i in range(1, 6):
    path = os.path.join(BASE, f"defs_{i}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            batch = json.load(f)
            all_defs.update(batch)
        print(f"Loaded defs_{i}.json: {len(batch)} entries")
    else:
        print(f"WARNING: defs_{i}.json not found!")

# Apply definitions to entries
applied = 0
missing = 0
for entry in data["entries"]:
    eid = entry["id"]
    if eid in all_defs:
        entry["definition"] = all_defs[eid].get("definition", "")
        entry["exampleSentence"] = all_defs[eid].get("exampleSentence", "")
        applied += 1
    else:
        # Not in any batch - add empty strings
        entry["definition"] = ""
        entry["exampleSentence"] = ""
        missing += 1

print(f"\nApplied: {applied}, Missing (empty): {missing}, Total: {len(data['entries'])}")

# Write output
OUT = os.path.join(ROOT, "data", "roots_affixes-2.json")
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Written to {OUT}")
