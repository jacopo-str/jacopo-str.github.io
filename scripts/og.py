"""Génère src/og.png (FR) et src/og-en.png (EN), 1200x630, pour le partage Open Graph."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
TEXTS = {
    "og.png": (["Je construis des outils", "intelligents, sur un seul", "portable de 8 Go."],
               "L2 Informatique · Université Côte d'Azur", "ATLAS · IA locale · projets personnels"),
    "og-en.png": (["I build intelligent tools", "on an 8 GB", "laptop."],
                  "Second-year CS student · Université Côte d'Azur, France", "ATLAS · local AI · personal projects"),
}

def font(sz, bold=False):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else ""), sz)
    except OSError:
        return ImageFont.load_default()

for name, (lines, l1, l2) in TEXTS.items():
    im = Image.new("RGB", (W, H), "#070b16")
    d = ImageDraw.Draw(im)
    for r, c in ((520, (20, 34, 58)), (360, (16, 30, 54))):
        d.ellipse((W - 380 - r // 2, -120 - r // 2 + 200, W - 380 + r // 2, -120 + r // 2 + 200), fill=c)
    d.ellipse((80, 90, 100, 110), fill="#5eead4")
    d.text((116, 86), "JACOPO", font=font(26, True), fill="#e6ebf7")
    for i, t in enumerate(lines):
        d.text((80, 190 + 80 * i), t, font=font(66, True), fill="#5eead4" if i == 2 else "#e6ebf7")
    d.text((80, 490), l1, font=font(30), fill="#9aa6c4")
    d.text((80, 535), l2, font=font(30), fill="#9aa6c4")
    im.save("src/" + name, optimize=True)
