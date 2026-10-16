"""Render FormFit's original TV icon artwork. Requires Pillow; no network/fonts."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'packages/shared-ui/src/assets/tv-cards'
DEST.mkdir(parents=True, exist_ok=True)
SIZE = 256
INK = (195, 235, 255, 255)
BLUE = (115, 149, 255, 255)


def draw_icon(name):
    image = Image.new('RGBA', (SIZE, SIZE))
    d = ImageDraw.Draw(image)
    def line(points, fill=INK, width=9):
        d.line(points, fill=fill, width=width, joint='curve')
    def box(bounds, radius=8, fill=None, outline=INK, width=8):
        d.rounded_rectangle(bounds, radius, fill=fill, outline=outline, width=width)
    def circle(bounds, fill=None, outline=INK, width=8):
        d.ellipse(bounds, fill=fill, outline=outline, width=width)

    if name == 'strength':
        line([(70, 128), (186, 128)], BLUE, 14)
        for x in (55, 79, 155, 179): box((x, 82, x + 22, 174), fill=(44, 70, 145, 255))
    elif name == 'cardio':
        d.polygon([(128, 195), (60, 130), (49, 97), (60, 72), (82, 64), (104, 70), (128, 92), (152, 70), (174, 64), (196, 72), (207, 97), (196, 130)], fill=(56, 62, 138, 230))
        line([(128, 195), (60, 130), (49, 97), (60, 72), (82, 64), (104, 70), (128, 92), (152, 70), (174, 64), (196, 72), (207, 97), (196, 130), (128, 195)], BLUE, 7)
        line([(62, 127), (95, 127), (112, 108), (129, 149), (145, 123), (193, 123)], INK, 8)
    elif name in ('person', 'mobility', 'walk'):
        circle((111, 46, 145, 80), fill=INK, outline=None)
        if name == 'mobility':
            line([(128, 89), (128, 146), (90, 196)])
            line([(128, 146), (171, 193)])
            line([(70, 89), (128, 109), (190, 73)], BLUE)
        elif name == 'walk':
            line([(127, 92), (111, 141), (83, 193)])
            line([(111, 141), (156, 156), (181, 194)])
            line([(123, 101), (91, 118), (65, 106)], BLUE)
            line([(124, 104), (158, 124), (183, 112)], BLUE)
        else:
            line([(128, 94), (128, 148), (94, 198)])
            line([(128, 148), (162, 198)])
            line([(72, 113), (128, 101), (184, 113)], BLUE)
    elif name == 'clock':
        circle((50, 50, 206, 206), outline=BLUE)
        line([(128, 79), (128, 130), (164, 151)])
        circle((118, 118, 138, 138), fill=INK, outline=None)
    elif name == 'cloud':
        d.ellipse((65, 81, 151, 163), fill=(46, 69, 142, 255))
        d.ellipse((104, 55, 191, 153), fill=(46, 69, 142, 255))
        box((45, 115, 213, 177), 28, fill=(46, 69, 142, 255), outline=BLUE)
        line([(128, 190), (128, 112)], INK)
        line([(104, 137), (128, 112), (152, 137)], INK)
    elif name == 'chart':
        for x, top, color in [(62, 139, BLUE), (109, 102, INK), (156, 63, BLUE)]:
            box((x, top, x + 31, 194), 6, fill=color, outline=None)
        line([(52, 205), (207, 205)], INK, 5)
    elif name == 'settings':
        circle((79, 79, 177, 177), outline=BLUE, width=20)
        circle((109, 109, 147, 147), fill=INK, outline=None)
        for angle in range(0, 360, 45):
            import math
            a = math.radians(angle)
            line([(128 + 56 * math.cos(a), 128 + 56 * math.sin(a)), (128 + 78 * math.cos(a), 128 + 78 * math.sin(a))], BLUE, 17)
    elif name == 'home':
        line([(42, 118), (128, 49), (214, 118)], BLUE, 11)
        box((65, 111, 191, 204), 8, outline=INK)
        box((110, 152, 147, 205), 3, fill=(70, 94, 178, 255), outline=BLUE, width=5)
    elif name == 'plan':
        box((66, 55, 193, 209), 15, fill=(37, 56, 114, 190), outline=BLUE)
        box((104, 42, 154, 72), 8, fill=BLUE, outline=None)
        for y in (103, 140, 177):
            line([(86, y), (94, y + 7), (108, y - 9)], INK, 6)
            line([(124, y), (169, y)], INK, 6)
    elif name == 'back':
        line([(134, 66), (72, 128), (134, 190)], INK, 12)
        line([(76, 128), (203, 128)], BLUE, 12)
    elif name == 'play':
        circle((44, 44, 212, 212), outline=BLUE, width=6)
        d.polygon([(106, 81), (106, 175), (177, 128)], fill=INK)
    elif name == 'pause':
        circle((44, 44, 212, 212), outline=BLUE, width=6)
        box((90, 82, 115, 174), 5, fill=INK, outline=None)
        box((143, 82, 168, 174), 5, fill=INK, outline=None)
    elif name == 'stop':
        circle((44, 44, 212, 212), outline=BLUE, width=6)
        box((91, 91, 165, 165), 10, fill=INK, outline=None)
    elif name == 'skip':
        d.polygon([(65, 81), (65, 175), (142, 128)], fill=INK)
        d.polygon([(125, 81), (125, 175), (201, 128)], fill=BLUE)
        line([(208, 82), (208, 175)], INK, 8)
    elif name == 'check':
        circle((45, 45, 211, 211), outline=BLUE, width=7)
        line([(82, 127), (115, 160), (178, 94)], INK, 13)
    elif name == 'chair':
        box((77, 52, 169, 131), 12, fill=(47, 70, 141, 230), outline=BLUE)
        line([(68, 145), (185, 145)], INK, 12)
        line([(80, 145), (73, 204)], INK, 10)
        line([(175, 145), (183, 204)], INK, 10)
    elif name == 'mat':
        box((53, 98, 206, 174), 20, fill=(43, 65, 133, 240), outline=BLUE)
        for y in (116, 137, 158): line([(76, y), (180, y)], INK, 4)
        circle((51, 100, 90, 173), outline=INK, width=6)
    elif name == 'cycle':
        circle((38, 122, 115, 199), outline=BLUE, width=7)
        circle((149, 122, 226, 199), outline=BLUE, width=7)
        line([(76, 161), (111, 106), (151, 161), (76, 161), (131, 161), (171, 94), (188, 161)], INK, 7)
        line([(96, 95), (124, 95)], INK, 8)
        line([(167, 88), (190, 79), (205, 88)], INK, 7)
    elif name == 'row':
        line([(47, 192), (214, 192)], BLUE, 12)
        circle((154, 65, 184, 95), fill=INK, outline=None)
        line([(166, 105), (139, 139), (93, 153), (72, 184)], INK, 10)
        line([(146, 129), (106, 110), (64, 110)], INK, 9)
        line([(62, 106), (51, 162)], BLUE, 7)
    elif name == 'band':
        d.arc((61, 51, 193, 207), 20, 200, fill=BLUE, width=16)
        d.arc((61, 51, 193, 207), 200, 380, fill=INK, width=10)
        box((47, 124, 88, 173), 9, outline=INK, width=7)
        box((168, 82, 209, 131), 9, outline=INK, width=7)
    elif name == 'kettlebell':
        box((93, 48, 163, 107), 22, outline=INK, width=10)
        d.ellipse((65, 89, 191, 210), fill=(49, 70, 143, 240), outline=BLUE, width=8)
        line([(94, 142), (161, 142)], INK, 8)
    elif name == 'refresh':
        d.arc((51, 51, 205, 205), 38, 320, fill=INK, width=11)
        d.polygon([(179, 52), (211, 80), (172, 92)], fill=BLUE)
    else:
        for x in (63, 141):
            for y in (63, 141): box((x, y, x + 51, y + 51), 12, fill=(45, 66, 135, 200), outline=INK, width=5)
    glow = image.filter(ImageFilter.GaussianBlur(8))
    return Image.alpha_composite(glow, image)


names = ['strength', 'cardio', 'person', 'mobility', 'walk', 'clock', 'cloud', 'chart', 'settings', 'home', 'plan', 'back', 'play', 'pause', 'stop', 'skip', 'check', 'chair', 'mat', 'cycle', 'row', 'band', 'kettlebell', 'refresh', 'grid']
for name in names:
    draw_icon(name).save(DEST / f'{name}.png', optimize=True)

preview = Image.new('RGB', (1000, 1000), '#10172C')
d = ImageDraw.Draw(preview)
for index, name in enumerate(names):
    x, y = (index % 5) * 200, (index // 5) * 200
    preview.paste(draw_icon(name).resize((160, 160)), (x + 20, y + 5), draw_icon(name).resize((160, 160)))
    d.text((x + 20, y + 177), name, fill='#DDEBFF')
(ROOT / '.validation').mkdir(exist_ok=True)
preview.save(ROOT / '.validation/tv-card-art-preview.png')
print(f'Generated {len(names)} original TV card illustrations in {DEST}')
