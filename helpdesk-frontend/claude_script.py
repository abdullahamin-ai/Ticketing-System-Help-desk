"""
fix_imports.py

Automatically fixes the broken import statements in the helpdesk-frontend
project, where pages import Select/Textarea from "@/components/ui/Input"
instead of their own files.

USAGE:
    Put this file inside your "helpdesk-frontend" folder (same level as
    package.json), then run:

        python fix_imports.py

It will scan every .tsx file under src/, find any import statement that
pulls Select and/or Textarea from "@/components/ui/Input", and rewrite it
to import each component from its own correct file.
"""

import re
from pathlib import Path

SRC_DIR = Path("src")

# Matches things like:
#   import { Input, Select, Textarea } from "@/components/ui/Input";
#   import { Textarea, Select } from "@/components/ui/Input";
#   import { Input, Select } from "@/components/ui/Input";
IMPORT_PATTERN = re.compile(
    r'import\s*\{\s*([^}]+?)\s*\}\s*from\s*["\']@/components/ui/Input["\'];?'
)


def build_replacement(names_raw: str) -> str:
    """Given 'Input, Select, Textarea', build one import line per name,
    pointing each at its own correct file."""
    names = [n.strip() for n in names_raw.split(",") if n.strip()]
    lines = []
    for name in names:
        # Each UI component lives in a file matching its own name.
        lines.append(f'import {{ {name} }} from "@/components/ui/{name}";')
    return "\n".join(lines)


def fix_file(path: Path) -> bool:
    """Fix one file in place. Returns True if a change was made."""
    original = path.read_text(encoding="utf-8")

    def replacer(match: re.Match) -> str:
        return build_replacement(match.group(1))

    updated = IMPORT_PATTERN.sub(replacer, original)

    if updated != original:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def main() -> None:
    if not SRC_DIR.exists():
        print(
            "ERROR: 'src' folder not found. "
            "Run this script from inside your helpdesk-frontend folder."
        )
        return

    tsx_files = list(SRC_DIR.rglob("*.tsx"))
    fixed_files = []

    for path in tsx_files:
        if fix_file(path):
            fixed_files.append(path)
            print(f"  [FIXED] {path}")

    print()
    if fixed_files:
        print(f"Done. Fixed {len(fixed_files)} file(s).")
    else:
        print("No matching broken imports found. Nothing changed.")


if __name__ == "__main__":
    main()