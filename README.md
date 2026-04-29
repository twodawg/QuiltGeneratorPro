# Quilt Generator Pro

A static web app that converts a sequence of images into a **Looking Glass quilt** — the tiled image format used by Looking Glass holographic displays to render 3D light field content.

## What It Does

Looking Glass displays expect a single large image (a "quilt") containing a grid of perspective views arranged in a specific order. This tool takes a folder of sequential frames (e.g. rendered from a 3D scene at different camera angles) and assembles them into the correct quilt layout.

The app runs entirely in the browser — no server, no Node.js, no dependencies. Host it on GitHub Pages or open `index.html` locally.

## How to Use

1. Open the app in a browser
2. Configure the settings for your target device
3. Drop your source images (PNG/JPEG/WebP) onto the drop zone
4. Click **Generate Quilt**
5. Download the resulting quilt PNG(s)

---

## Settings Reference

### Columns

The number of columns in the quilt grid. Together with Rows, this determines how many source views are tiled into the final image.

- **Default:** 11
- **Typical values:** 5–14 depending on the Looking Glass model

### Rows

The number of rows in the quilt grid.

- **Default:** 6
- **Typical values:** 4–9

The total number of views used is `Columns × Rows` (e.g. 11×6 = 66 views). If you provide more source images than needed, the app selects an evenly-spaced subset.

### Scale

A multiplier applied to each tile's resolution before compositing into the quilt. Use values below 1.0 to reduce the final quilt file size.

- **Default:** 0.8
- **Range:** 0.1–1.0
- A scale of 1.0 means each tile keeps its original resolution
- A scale of 0.5 means each tile is rendered at half its native size in the quilt

### Sections

Splits each source image into multiple vertical strips, producing one quilt file per section. This is used for **side-by-side Looking Glass configurations** where a single wide source image contains content for multiple displays placed next to each other.

- **1** — Standard single quilt output (no splitting)
- **2** — Each source frame is split into 2 vertical strips → 2 separate quilt files
- **3** — Each source frame is split into 3 vertical strips → 3 separate quilt files

Each strip is centre-cropped to match the device's aspect ratio (Device Width ÷ Device Height). Click the **?** button next to the field to see a visual diagram.

### Device Width (px)

The native pixel width of the target Looking Glass display. Used to calculate the correct aspect ratio for cropping each tile.

- **Default:** 1440 (Looking Glass Go)

### Device Height (px)

The native pixel height of the target Looking Glass display.

- **Default:** 2560 (Looking Glass Go)

### Invert Order

Reverses the sequence in which source frames are assigned to quilt positions. Enable this if your rendered frames go from right-to-left rather than left-to-right.

- **Default:** Off (unchecked)

---

## Output

The app generates one or more PNG quilt images (one per section). Each output file is named:

```
quilt[_s{N}of{total}]_qs{cols}x{rows}a{aspect}.png
```

| Component | Meaning |
|-----------|---------|
| `_s{N}of{total}` | Section number (omitted if sections = 1) |
| `qs{cols}x{rows}` | Grid dimensions |
| `a{aspect}` | Aspect ratio of each tile (width/height, 4 decimal places) |

**Example:** `quilt_s2of3_qs11x6a0.5625.png` — section 2 of 3, 11×6 grid, 9:16 aspect tiles.

### Quilt Layout

- Tiles are arranged in a grid of `cols × rows`
- Row order is **bottom-up** (row 0 at the bottom) — this is the Looking Glass standard
- Within each row, views go left-to-right

### Auto Zoom-Out

If the source images are too narrow to fit all section strips at the device aspect ratio, the app automatically zooms out (reduces the effective crop height) so the full width is used. A warning is displayed with the zoom factor.

---

## Common Device Presets

| Device | Width | Height | Typical Quilt |
|--------|-------|--------|---------------|
| Looking Glass Go | 1440 | 2560 | 11×6 |
| Looking Glass Portrait | 1536 | 2048 | 8×6 |
| Looking Glass 16" | 3840 | 2160 | 5×9 |
| Looking Glass 32" | 3840 | 2160 | 5×9 |
| Looking Glass 65" | 3840 | 2160 | 8×6 |
