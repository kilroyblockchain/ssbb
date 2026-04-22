from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W = 600
DIR = os.path.dirname(os.path.abspath(__file__))

FONT_BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_BOLD  = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

def load_font(path, size):
    return ImageFont.truetype(path, size)

def crop_center(img, w, h):
    iw, ih = img.size
    left = (iw - w) // 2
    top  = (ih - h) // 2
    return img.crop((left, top, left + w, top + h))

def fade_edges(img, top=0, bottom=0):
    """Add vertical alpha gradient fade at top/bottom."""
    img = img.convert("RGBA")
    fade = Image.new("L", img.size, 255)
    draw = ImageDraw.Draw(fade)
    iw, ih = img.size
    for y in range(top):
        val = int(255 * y / top)
        draw.line([(0, y), (iw, y)], fill=val)
    for i in range(bottom):
        y = ih - bottom + i
        val = int(255 * (bottom - i) / bottom)
        draw.line([(0, y), (iw, y)], fill=val)
    r, g, b, a = img.split()
    new_a = Image.fromarray(__import__("numpy").minimum(
        __import__("numpy").array(a), __import__("numpy").array(fade)
    ))
    return Image.merge("RGBA", (r, g, b, new_a))

def text_block(w, h, bg, lines):
    """lines = list of (text, font, color, y_offset_or_None)
       If y is None, auto-stack from center."""
    img = Image.new("RGBA", (w, h), bg)
    draw = ImageDraw.Draw(img)
    # calc total height for auto-center
    auto = [l for l in lines if l[3] is None]
    fixed = [l for l in lines if l[3] is not None]
    for (text, font, color, y) in fixed:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((w - tw) // 2, y), text, font=font, fill=color)
    return img

# ── load images ──────────────────────────────────────────────────────────────
band_src  = Image.open(os.path.join(DIR, "Screenshot 2026-04-20 at 1.24.43\u202fPM.png")).convert("RGBA")
court_src = Image.open(os.path.join(DIR, "Screenshot 2026-04-20 at 1.24.25\u202fPM.png")).convert("RGBA")

# scale to poster width
def fit_width(img, w):
    iw, ih = img.size
    return img.resize((w, int(ih * w / iw)), Image.LANCZOS)

band_full  = fit_width(band_src,  W)
court_full = fit_width(court_src, W)

# crop heights
BAND_H  = 300
COURT_H = 260

band_crop  = crop_center(band_full,  W, BAND_H)
court_crop = crop_center(court_full, W, COURT_H)

# fades — band fades out at bottom, court fades in at top and out at bottom
import numpy as np

def vfade(img, top_px=0, bottom_px=0):
    img = img.convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    h, w = arr.shape[:2]
    mask = np.ones(h, dtype=np.float32)
    if top_px:
        mask[:top_px] = np.linspace(0, 1, top_px)
    if bottom_px:
        mask[-bottom_px:] = np.linspace(1, 0, bottom_px)
    arr[:, :, 3] *= mask[:, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

band_faded  = vfade(band_crop,  top_px=20, bottom_px=80)
court_faded = vfade(court_crop, top_px=60, bottom_px=60)

# ── fonts ────────────────────────────────────────────────────────────────────
f_title  = load_font(FONT_BLACK, 135)
f_tag    = load_font(FONT_BOLD,  17)
f_label  = load_font(FONT_BOLD,  11)
f_cast   = load_font(FONT_BOLD,  12)
f_small  = load_font(FONT_BOLD,  11)

# ── helper: centered text with glow ──────────────────────────────────────────
def draw_glowing_text(draw, img, text, font, x, y, color, glow_color, glow_radius=18):
    """Draw glowing text by compositing a blurred layer."""
    # glow layer
    glow_img = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_img)
    gd.text((x, y), text, font=font, fill=glow_color)
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=glow_radius))
    img.alpha_composite(glow_img)
    # crisp text on top
    draw.text((x, y), text, font=font, fill=color)

def centered_x(draw, text, font, w):
    bbox = draw.textbbox((0, 0), text, font=font)
    return (w - (bbox[2] - bbox[0])) // 2

# ── header block ─────────────────────────────────────────────────────────────
HEADER_H = 32
header = Image.new("RGBA", (W, HEADER_H), (0, 0, 0, 255))
hd = ImageDraw.Draw(header)
htxt = "THE SCREAMING SMOLDERING BUTT BITCHES PRESENT"
hx = centered_x(hd, htxt, f_label, W)
draw_glowing_text(hd, header, htxt, f_label, hx, 10, (255, 20, 147, 255), (255, 20, 147, 120), glow_radius=8)

# ── title block ───────────────────────────────────────────────────────────────
TITLE_H = 290
title = Image.new("RGBA", (W, TITLE_H), (0, 0, 0, 255))
td = ImageDraw.Draw(title)

# font bbox has 52px top offset, so y=0 → visible glyph at 52–149
# DAB — hot pink
dab_x = centered_x(td, "DAB", f_title, W)
td.text((dab_x + 6, -12 + 6), "DAB", font=f_title, fill=(80, 0, 40, 200))
draw_glowing_text(td, title, "DAB", f_title, dab_x, -12, (255, 20, 147, 255), (255, 20, 147, 180), glow_radius=22)

# DUB — neon green
dub_x = centered_x(td, "DUB", f_title, W)
td.text((dub_x + 6, 88 + 6), "DUB", font=f_title, fill=(15, 60, 0, 200))
draw_glowing_text(td, title, "DUB", f_title, dub_x, 88, (57, 255, 20, 255), (57, 255, 20, 180), glow_radius=22)

# tagline
tag = '"Highly Unconstitutional."'
tx = centered_x(td, tag, f_tag, W)
draw_glowing_text(td, title, tag, f_tag, tx, 252, (255, 230, 109, 220), (255, 230, 109, 80), glow_radius=6)

# ── credits block ────────────────────────────────────────────────────────────
CREDITS_H = 100
credits = Image.new("RGBA", (W, CREDITS_H), (0, 0, 0, 255))
cd = ImageDraw.Draw(credits)

# divider line
for x in range(W):
    alpha = int(255 * (1 - abs(x - W/2) / (W/2)) ** 1.5)
    credits.putpixel((x, 4), (255, 20, 147, alpha))

cast1 = "Spanky  ·  Astro Butt  ·  Jazzy  ·  Booty  ·  L'il Cheeky  ·  BotButt"
cast2 = "and The Honourable Cave Judge in a Bone Powdered Wig"
line3 = "A Prehistoric Legal Drama  ·  A Cannabis Conspiracy  ·  A Vibe"
line4 = "a Screaming Smoldering Butt Bitches production"

cd.text((centered_x(cd, cast1, f_cast, W), 16), cast1, font=f_cast, fill=(130, 130, 130, 255))
draw_glowing_text(cd, credits, cast2, f_cast, centered_x(cd, cast2, f_cast, W), 34, (57, 255, 20, 200), (57, 255, 20, 80), glow_radius=5)
cd.text((centered_x(cd, line3, f_small, W), 58), line3, font=f_small, fill=(70, 70, 70, 255))
draw_glowing_text(cd, credits, line4, f_cast, centered_x(cd, line4, f_cast, W), 76, (255, 20, 147, 220), (255, 20, 147, 100), glow_radius=6)

# ── composite final poster ────────────────────────────────────────────────────
POSTER_H = HEADER_H + BAND_H + TITLE_H + COURT_H + CREDITS_H
poster = Image.new("RGB", (W, POSTER_H), (0, 0, 0))

y = 0
poster.paste(header.convert("RGB"), (0, y)); y += HEADER_H
poster.paste(band_faded.convert("RGB"), (0, y), band_faded.split()[3]); y += BAND_H
poster.paste(title.convert("RGB"), (0, y)); y += TITLE_H
poster.paste(court_faded.convert("RGB"), (0, y), court_faded.split()[3]); y += COURT_H
poster.paste(credits.convert("RGB"), (0, y))

# pink border
border = ImageDraw.Draw(poster)
border.rectangle([(0, 0), (W-1, POSTER_H-1)], outline=(255, 20, 147), width=3)

out = os.path.join(DIR, "dab_dub_poster.png")
poster.save(out, "PNG")
print(f"Saved {W}x{POSTER_H} → {out}")
