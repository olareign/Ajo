#!/usr/bin/env python3
"""
Regenerates every app icon from the logo artwork in public/brand, so they never drift from it.

    python3 apps/web/scripts/generate-icons.py        (needs Pillow: pip install pillow)

What it makes, and why each is different:
  public/icons/icon-192.png, icon-512.png   the whole logo on white, ~76% of the width (manifest "any")
  public/icons/maskable-512.png             the whole logo, ~62% of the width: Android crops this icon to a
                                            circle (or squircle), so everything must sit inside the central
                                            80%. A tight icon would lose the "À" or the "ọ" at the edges.
  src/app/apple-icon.png (180)              the whole logo on white, for the iPhone home screen (the system
                                            rounds the corners itself, and fills any transparency with black)
  src/app/icon.png (192)                    the pig-and-coin mark only: the browser tab shows it at 16 to 32
                                            pixels, where a wordmark cannot be read
  public/splash/ios-WxH.png               the whole logo, centred on white, one per iPhone size, shown while the
                                            installed app starts (list: src/lib/splash.ts)
  public/email/logo.png (480 wide)          the whole logo, cropped to its ink on a transparent ground, for the
                                            emails the API sends (they load it from the web app's address; email
                                            clients cannot show webp or svg)

src/app/icons.test.ts checks the results, so a wrong icon fails the build.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO = Image.open(ROOT / "public/brand/ajo-logo.webp").convert("RGBA")
WHITE = (255, 255, 255, 255)

# Where the pig-and-coin mark starts in the 916 x 562 artwork: the middle of the empty gap between the "j"
# (ends at about x=485) and the pig's ring (starts at about x=499).
MARK_LEFT = 492


def ink(image: Image.Image) -> Image.Image:
    """The artwork cropped to where it has colour, so margins are measured from the logo itself."""
    return image.crop(image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())


def on_square(artwork: Image.Image, size: int, width_share: float | None = None, height_share: float | None = None) -> Image.Image:
    """Centres the artwork on a white square, scaled to a share of the square's width or height."""
    target = size * width_share / artwork.width if width_share else size * height_share / artwork.height
    scaled = artwork.resize((round(artwork.width * target), round(artwork.height * target)), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), WHITE)
    canvas.alpha_composite(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return canvas.convert("RGB")


def save(image: Image.Image, path: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "PNG", optimize=True)
    print(f"{path:34} {image.width}x{image.height}  {target.stat().st_size:>6} bytes")


whole = ink(LOGO)
mark = ink(LOGO.crop((MARK_LEFT, 0, LOGO.width, LOGO.height)))

save(on_square(whole, 192, width_share=0.76), "public/icons/icon-192.png")
save(on_square(whole, 512, width_share=0.76), "public/icons/icon-512.png")
save(on_square(whole, 512, width_share=0.62), "public/icons/maskable-512.png")
save(on_square(whole, 180, width_share=0.76), "src/app/apple-icon.png")
save(on_square(mark, 192, height_share=0.8), "src/app/icon.png")

EMAIL_WIDTH = 480
save(whole.resize((EMAIL_WIDTH, round(whole.height * EMAIL_WIDTH / whole.width)), Image.LANCZOS), "public/email/logo.png")

# iPhone launch screens: the whole logo, centred on white (the manifest's background), one per phone size.
# Keep this list the same as src/lib/splash.ts.
SPLASH = [
    (750, 1334), (828, 1792), (1125, 2436), (1170, 2532), (1179, 2556), (1206, 2622),
    (1242, 2208), (1242, 2688), (1284, 2778), (1290, 2796), (1320, 2868),
]
for width, height in SPLASH:
    canvas = Image.new("RGBA", (width, height), WHITE)
    logo = whole.resize((round(width * 0.5), round(whole.height * width * 0.5 / whole.width)), Image.LANCZOS)
    canvas.alpha_composite(logo, ((width - logo.width) // 2, (height - logo.height) // 2))
    save(canvas.convert("RGB"), f"public/splash/ios-{width}x{height}.png")
