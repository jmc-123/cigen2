import json
from pathlib import Path


def build_simple_definition(entry: dict) -> str:
  word = entry.get("word", "").strip()
  meaning = entry.get("meaning", "").strip()

  # Already present, keep user-provided content
  if entry.get("definition"):
    return entry["definition"]

  # Very simple, Simple-English-style fallback
  if word and meaning:
    # `meaning` is Chinese here; keep grammar very simple and generic
    return f"{word.capitalize()} is a simple English word. It is easy to remember with this meaning."

  if word:
    return f"{word.capitalize()} is a simple English word."

  return "This is a simple English word."


def build_simple_example(entry: dict) -> str:
  word = entry.get("word", "").strip()

  if entry.get("exampleSentence"):
    return entry["exampleSentence"]

  if word:
    return f"This is a simple sentence with the word \"{word}\"."

  return "This is a simple example sentence."


def main() -> None:
  root = Path(__file__).resolve().parents[1]
  data_path = root / "data" / "roots_affixes.json"

  with data_path.open("r", encoding="utf-8") as f:
    data = json.load(f)

  entries = data.get("entries", [])
  updated = 0

  for entry in entries:
    before_def = entry.get("definition")
    before_ex = entry.get("exampleSentence")

    entry["definition"] = build_simple_definition(entry)
    entry["exampleSentence"] = build_simple_example(entry)

    if entry.get("definition") != before_def or entry.get("exampleSentence") != before_ex:
      updated += 1

  with data_path.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

  print(f"Updated {updated} entries with simple definitions and example sentences.")


if __name__ == "__main__":
  main()

