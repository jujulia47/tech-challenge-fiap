"""Builds the subset of Material Icons used by the apps. How to run it: docs/fase4/performance.md"""
from pathlib import Path
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[3]
FONTS = ROOT / "packages/design-system/fonts"
SOURCE = ROOT / "node_modules/@fontsource/material-icons/files/material-icons-latin-400-normal.woff2"
ICONS = FONTS / "icons.txt"
TARGET = FONTS / "material-icons-subset.woff2"
BUILT_FROM = FONTS / "icons.built.txt"


def ligatures(font):
    """Maps each sequence of glyphs to the icon glyph it turns into."""
    found = {}
    for lookup in font["GSUB"].table.LookupList.Lookup:
        for table in lookup.SubTable:
            table = getattr(table, "ExtSubTable", table)
            for first, entries in getattr(table, "ligatures", {}).items():
                for entry in entries:
                    found[(first, *entry.Component)] = entry.LigGlyph
    return found


def main():
    icons = sorted({line.strip() for line in ICONS.read_text().splitlines() if line.strip()})
    font = TTFont(SOURCE)
    cmap = font.getBestCmap()
    known = ligatures(font)

    letters = {character for icon in icons for character in icon}
    glyphs = [cmap[ord(character)] for character in sorted(letters)]
    missing = []
    for icon in icons:
        glyph = known.get(tuple(cmap[ord(character)] for character in icon))
        if glyph is None:
            missing.append(icon)
        else:
            glyphs.append(glyph)
    if missing:
        sys.exit(f"Not in Material Icons: {', '.join(missing)}")

    options = Options()
    options.flavor = "woff2"
    # This font keeps its ligatures in rlig, not in liga
    options.layout_features = ["rlig", "liga"]
    # Keeps only the ligatures listed here: the letters alone would pull in every icon
    options.layout_closure = False
    options.hinting = False
    options.notdef_outline = True

    subsetter = Subsetter(options)
    subsetter.populate(glyphs=glyphs, unicodes=[ord(character) for character in letters])
    subsetter.subset(font)
    kept = len(ligatures(font))
    if kept != len(icons):
        sys.exit(f"Kept {kept} ligatures for {len(icons)} icons: they would show as text")
    font.flavor = "woff2"
    font.save(TARGET)

    BUILT_FROM.write_text("\n".join(icons) + "\n")
    print(f"{len(icons)} icons, {TARGET.stat().st_size} bytes")


main()
