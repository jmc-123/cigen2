import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

with open(os.path.join(ROOT, "data", "roots_affixes-2.json"), "r", encoding="utf-8") as f:
    data = json.load(f)

non_word_ids = {
    "e911","e912","e914","e915","e917","e919","e920",
    "e929","e930","e931","e932","e933","e934","e935","e936","e937","e938",
    "e939","e940","e941","e942","e943","e944","e945","e946","e947",
    "e948","e949","e950","e951","e952","e953"
}

entries = data["entries"]
batches = [
    ("batch1", 0, 190),
    ("batch2", 190, 380),
    ("batch3", 380, 570),
    ("batch4", 570, 760),
    ("batch5", 760, len(entries)),
]

for name, start, end in batches:
    batch_entries = entries[start:end]
    lines = []
    for e in batch_entries:
        eid = e["id"]
        tag = "SKIP" if eid in non_word_ids else "WORD"
        lines.append(eid + "|" + e["word"] + "|" + e.get("meaning", "") + "|" + tag)
    outpath = os.path.join(BASE, name + ".txt")
    with open(outpath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    nw_count = sum(1 for e in batch_entries if e["id"] in non_word_ids)
    print(name + ": " + str(len(batch_entries)) + " entries, non-words: " + str(nw_count))
