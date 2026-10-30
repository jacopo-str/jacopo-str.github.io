"""Génère src/og.png (1200x630) pour le partage Open Graph."""
from PIL import Image, ImageDraw, ImageFont
W, H = 1200, 630
im = Image.new("RGB", (W, H), "#070b16")
d = ImageDraw.Draw(im)
for r, c in ((520, (20, 34, 58)), (360, (16, 30, 54))):
    d.ellipse((W - 380 - r // 2, -120 - r // 2 + 200, W - 380 + r // 2, -120 + r // 2 + 200), fill=c)
def font(sz, bold=False):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else ""),):
        try: return ImageFont.truetype(p, sz)
        except OSError: pass
    return ImageFont.load_default()
d.ellipse((80, 90, 100, 110), fill="#5eead4")
d.text((116, 86), "JACOPO", font=font(26, True), fill="#e6ebf7")
d.text((80, 190), "Je construis des outils", font=font(66, True), fill="#e6ebf7")
d.text((80, 270), "intelligents, sur un seul", font=font(66, True), fill="#e6ebf7")
d.text((80, 350), "portable de 8 Go.", font=font(66, True), fill="#5eead4")
d.text((80, 490), "L2 Informatique · Université Côte d'Azur", font=font(30), fill="#9aa6c4")
d.text((80, 535), "ATLAS · IA locale · projets personnels", font=font(30), fill="#9aa6c4")
im.save("src/og.png", optimize=True)
