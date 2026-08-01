"""Generate the canonical mark for each app, in every format anything asks for.

System D — EMBLEM. One 96-unit grid; a silhouette per app so the shape alone
separates them at 16px; an ornamented medallion inside it (knurled field,
double hairline, guilloche fan, deco quarter-chevrons, a gem at the crown);
one exclusive hue each.

Outputs per app:
  icon.svg             master, full-bleed, no transparency
  favicon.ico          16/24/32/48/64/128/256 in one container
  apple-touch-icon.png 180, opaque (iOS renders alpha as black)
  icon-192.png         manifest, purpose:any
  icon-512.png         manifest, purpose:any
  icon-mask.png        512 maskable — art inside the 40%-radius safe circle
  manifest.webmanifest

Rasterising shells out to headless Chrome, which is this machine's screenshot
harness and renders exactly what the browser will. (It replaced Playwright,
which is no longer installed in any interpreter here.)

This is the whole generator, not the partial reconstruction that used to live
here: the marks are shared between five projects that do not share a
repository, so the one file that draws them is kept in the one repository that
draws all five of them into a page. TARGETS below is this machine's checkout
layout — the only thing to edit if the tree moves.

    python icons/gen.py              # rebuild every brand directory
    python icons/gen.py autopilot    # rebuild one, then rewrite the hall's defs
"""
import io
import json
import math
import os
import subprocess
import sys
import tempfile

from PIL import Image

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
if not os.path.exists(CHROME):
    CHROME = r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'

# --------------------------------------------------------------------------
# Palette. One exclusive hue per app; `field`/`deep` are the medallion faces,
# `ink` the engraved subject, `pop` the single accent.
#
# Autopilot was a violet-and-cyan mark from before its panel became a
# writing desk, and it read as pasted on next to everything it labelled. It is
# now bound the way the app binds its shows: oxblood cloth, warm ivory, and one
# band of brass — the three materials the desk is actually made of.
# --------------------------------------------------------------------------
HUE = {
    'autopilot':     {'field': '#8c2f28', 'deep': '#4a1512', 'ink': '#f7ecd0', 'pop': '#e2b248'},
    'groundstation': {'field': '#c8781f', 'deep': '#8d5210', 'ink': '#fff3e2', 'pop': '#ffd79a'},
    'outreach':      {'field': '#2f6d97', 'deep': '#1d4767', 'ink': '#eaf5fd', 'pop': '#e8c968'},
    'atrium':        {'field': '#c9a227', 'deep': '#8a6c12', 'ink': '#1a1409', 'pop': '#fff8e1'},
    # Not built into a brand directory of its own — it exists here so the hall's
    # <defs> keeps all five marks when this script rewrites them.
    'pressroom':     {'field': '#2d6428', 'deep': '#1c2f10', 'ink': '#eef4e6', 'pop': '#7ab870'},
}

APPS = {
    'autopilot':     {'name': 'Anime Autopilot', 'short': 'Autopilot'},
    'groundstation': {'name': 'Ground Station',  'short': 'Ground Stn'},
    'outreach':      {'name': 'Outreach Desk',   'short': 'Outreach'},
    'atrium':        {'name': 'Atrium',          'short': 'Atrium'},
    'pressroom':     {'name': 'Press Room',      'short': 'Press Room'},
}

# The colour the browser paints its own chrome with. It defaults to the mark's
# deep tone, which is right for a service whose page is that colour — but
# Autopilot's page is a mahogany room, and the manifest has to match the room,
# not the badge, or the standalone window shows a seam at the title bar.
CHROME_BG = {'autopilot': '#1a0e06'}


def reel(R=46, r=9, n=6):
    """Film-reel disc: one closed path whose rim is scalloped by n concave
    bites. Drawing the bites as separate circles would leave the lobes that
    fall outside the disc filled — the outline has to be cut, not overlaid,
    or the scaled inner copies read as bubbles instead of notches."""
    half = math.degrees(math.acos(1 - (r * r) / (2.0 * R * R)))   # bite half-angle at O
    P = lambda deg: (48 + R * math.cos(math.radians(deg)),
                     48 + R * math.sin(math.radians(deg)))
    start = -90 + half
    d = ['M%.3f %.3f' % P(start)]
    for i in range(n):
        a_end = -90 + (i + 1) * (360.0 / n) - half        # end of this rim arc
        d.append('A%d %d 0 0 1 %.3f %.3f' % ((R, R) + P(a_end)))
        a_out = -90 + (i + 1) * (360.0 / n) + half        # far side of the bite
        d.append('A%d %d 0 0 0 %.3f %.3f' % ((r, r) + P(a_out)))
    d.append('Z')
    return '<path d="%s"/>' % ' '.join(d)


DISC = '<circle cx="48" cy="48" r="46"/>'
OCT = '<polygon points="30,2 66,2 94,30 94,66 66,94 30,94 2,66 2,30"/>'
SHIELD = '<path d="M4 4 H92 V64 L48 94 L4 64 Z"/>'
KEYSTONE = '<path d="M4 94 V44 A44 44 0 0 1 92 44 V94 Z"/>'
PLAQUE = '<path d="M20 4 H76 L92 20 V92 H4 V20 Z"/>'

SIL = {
    'autopilot': reel(),
    'groundstation': OCT,
    'outreach': SHIELD,
    'atrium': KEYSTONE,
    'pressroom': PLAQUE,
}


def glyph(app, ink, pop, deep):
    """The engraved subject. Drawn for a 96 grid, centred on (48,48)."""
    return {
        # An open volume on the shelf every subject in this array stands on,
        # inside the reel that says what kind of volume it is. The app shelves
        # a season of anime; the mark now says so in one shape, where it used
        # to show an abstract bar chart with a play wedge through it.
        #
        # Open, not closed: a closed book seen face on is a tall rectangle, and
        # at gate size a tall rectangle is a monolith. Two boards splayed from
        # a raised binding are the one book shape that survives 16px, because
        # what carries it is the silhouette's notch, not any detail inside.
        'autopilot':
            '<g fill="%s">'
            '<rect x="21" y="66" width="54" height="6"/>'                # the shelf
            '<polygon points="23,24 45,30 45,63 23,57"/>'                # left board
            '<polygon points="73,24 51,30 51,63 73,57"/>'                # right board
            '</g>'
            '<g fill="%s">'                                              # ruled text on both leaves
            '<rect x="27" y="37" width="14" height="3.4"/>'
            '<rect x="27" y="45" width="14" height="3.4"/>'
            '<rect x="55" y="37" width="14" height="3.4"/>'
            '<rect x="55" y="45" width="14" height="3.4"/>'
            '</g>'
            '<rect x="44" y="27" width="8" height="34" fill="%s"/>'      # the binding
            % (ink, deep, pop),
        'groundstation':
            '<g fill="%s">'
            '<rect x="24" y="64" width="48" height="6"/>'
            '<rect x="43" y="48" width="10" height="16"/>'
            '<path d="M67.5 27.5 A19 19 0 1 1 41.2 53.8 Z"/>'
            '<path d="M53.8 41.6 L41 28.8" stroke="%s" stroke-width="5" fill="none"/>'
            '<circle cx="39.5" cy="27.3" r="7" fill="%s"/>'
            '</g>' % (ink, ink, pop),
        'outreach':
            '<g fill="%s">'
            '<rect x="24" y="66" width="48" height="6"/>'
            '<path fill-rule="evenodd" d="M35 22 L61 22 L65 42 L48 66 L31 42 Z '
            'M45.6 46 L50.4 46 L48 62 Z"/>'
            '<circle cx="48" cy="39" r="7" fill="%s"/>'
            '</g>' % (ink, pop),
        'atrium':
            '<g fill="%s">'
            '<rect x="22" y="66" width="52" height="6"/>'
            '<path d="M28 66 L28 47 A20 20 0 0 1 68 47 L68 66 L59 66 L59 47 '
            'A11 11 0 0 0 37 47 L37 66 Z"/>'
            '<polygon points="48,16 58,26 48,36 38,26" fill="%s"/>'
            '</g>' % (ink, pop),
        # A single broadsheet with its corner turned, over the base bar. Four
        # heavy rules, not nine hairlines: at directory size a 1.6-unit rule is
        # a third of a pixel.
        'pressroom':
            '<g fill="%s"><rect x="22" y="66" width="52" height="6"/>'
            '<path d="M28 21 H58 L70 33 V61 H28 Z"/></g>'
            '<g fill="%s"><path d="M58 21 L70 33 H58 Z"/>'
            '<rect x="33" y="27" width="18" height="5.5"/>'
            '<rect x="33" y="38" width="30" height="3.2"/>'
            '<rect x="33" y="44" width="30" height="3.2"/>'
            '<rect x="33" y="50" width="17" height="3.2"/></g>' % (ink, deep),
    }[app]


def guilloche(ink):
    out = []
    for i in range(36):
        a = math.radians(i * 10)
        out.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" '
                   'stroke-width="0.7" stroke-opacity=".26"/>'
                   % (48 + 17 * math.cos(a), 48 + 17 * math.sin(a),
                      48 + 37 * math.cos(a), 48 + 37 * math.sin(a), ink))
    return ''.join(out)


def chevrons(ink):
    return ''.join(
        '<g transform="rotate(%d 48 48)" fill="none" stroke="%s" '
        'stroke-opacity=".5" stroke-width="1.4">'
        '<path d="M41 12.5 L48 7 L55 12.5"/>'
        '<path d="M43 17.5 L48 13.5 L53 17.5"/></g>' % (i * 90 + 45, ink)
        for i in range(4))


def emblem(app, fill=0.86):
    """The full mark, as SVG body markup on a 0 0 96 96 viewBox."""
    h, sil = HUE[app], SIL[app]
    scale = lambda s, f: ('<g transform="translate(48,48) scale(%s) translate(-48,-48)" '
                          'fill="%s">%s</g>' % (s, f, sil))
    hair = lambda s, op: ('<g transform="translate(48,48) scale(%s) translate(-48,-48)" '
                          'fill="none" stroke="%s" stroke-opacity="%s" '
                          'stroke-width="1.4">%s</g>' % (s, h['ink'], op, sil))
    subject = ('<g transform="translate(48,48) scale(%s) translate(-48,-48)">%s</g>'
               % (fill, glyph(app, h['ink'], h['pop'], h['deep'])))
    # Atrium's subject already carries a keystone gem; a second one at the
    # crown reads as a stutter, so the hall wears its jewel in the arch.
    crown = ('' if app == 'atrium'
             else '<polygon points="48,3.5 53,8.5 48,13.5 43,8.5" fill="%s"/>' % h['pop'])
    return (scale(1, h['deep']) + scale(0.855, h['field'])
            + hair(0.80, '.55') + hair(0.755, '.3')
            + guilloche(h['ink']) + chevrons(h['ink']) + subject + crown)


def svg_doc(app, body=None, pad=0, bg=None):
    """A standalone SVG. `pad` insets the mark for maskable safe-zone use."""
    body = body if body is not None else emblem(app)
    if pad:
        k = 1 - 2 * pad / 96.0
        body = ('<g transform="translate(48,48) scale(%.4f) translate(-48,-48)">%s</g>'
                % (k, body))
    ground = ('<rect width="96" height="96" fill="%s"/>' % bg) if bg else ''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" '
            'width="96" height="96">%s%s</svg>' % (ground, body))


# --------------------------------------------------------------------------
RASTER = [16, 24, 32, 48, 64, 128, 180, 192, 256, 512]


def render(svg, size):
    """Rasterise one SVG at one size, through headless Chrome.

    --default-background-color=00000000 is what keeps the page transparent;
    without it Chrome paints white and every mark ships on a white tile.
    """
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, 'm.html')
        out = os.path.join(tmp, 'm.png')
        with io.open(page, 'w', encoding='utf-8') as f:
            f.write('<!DOCTYPE html><meta charset="utf-8">'
                    '<style>html,body{margin:0;padding:0;background:transparent}'
                    'svg{display:block;width:%dpx;height:%dpx}</style>%s'
                    % (size, size, svg))
        r = subprocess.run(
            [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
             '--run-all-compositor-stages-before-draw',
             '--default-background-color=00000000',
             '--force-device-scale-factor=1',
             '--window-size=%d,%d' % (size, size),
             '--virtual-time-budget=3000',
             '--screenshot=' + out, 'file:///' + page.replace('\\', '/')],
            capture_output=True, timeout=120)
        if not os.path.exists(out):
            raise SystemExit('chrome wrote nothing at %dpx: %s'
                             % (size, r.stderr.decode('utf-8', 'replace')[-800:]))
        return io.open(out, 'rb').read()


def build(app, outdir):
    os.makedirs(outdir, exist_ok=True)
    h = HUE[app]
    svg = svg_doc(app)
    with io.open(os.path.join(outdir, 'icon.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)

    pngs = {}
    for s in RASTER:
        pngs[s] = Image.open(io.BytesIO(render(svg, s))).convert('RGBA')

    # apple-touch must be opaque — iOS paints alpha black.
    flat = Image.new('RGB', (180, 180), h['deep'])
    flat.paste(pngs[180], (0, 0), pngs[180])
    flat.save(os.path.join(outdir, 'apple-touch-icon.png'))

    pngs[192].save(os.path.join(outdir, 'icon-192.png'))
    pngs[512].save(os.path.join(outdir, 'icon-512.png'))

    # Maskable: art inside the r=40% safe circle, brand ground to the corners.
    mask_svg = svg_doc(app, pad=18, bg=h['deep'])
    Image.open(io.BytesIO(render(mask_svg, 512))).convert('RGB') \
        .save(os.path.join(outdir, 'icon-mask.png'))

    # Windows wants 256 in the container or it upscales the 48 for Start pins.
    ico = [pngs[s] for s in (256, 128, 64, 48, 32, 24, 16)]
    ico[0].save(os.path.join(outdir, 'favicon.ico'),
                format='ICO', sizes=[(s, s) for s in (256, 128, 64, 48, 32, 24, 16)],
                append_images=ico[1:])

    chrome_bg = CHROME_BG.get(app, h['deep'])
    with io.open(os.path.join(outdir, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
        json.dump({
            'name': APPS[app]['name'],
            'short_name': APPS[app]['short'],
            'start_url': '/',
            'display': 'standalone',
            'background_color': chrome_bg,
            'theme_color': chrome_bg,
            'icons': [
                {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                {'src': 'icon-mask.png', 'sizes': '512x512', 'type': 'image/png',
                 'purpose': 'maskable'},
            ],
        }, f, indent=2)
        f.write('\n')
    print('  %-14s -> %s' % (app, outdir))


TARGETS = {
    'autopilot':     r'X:\Github\anime-rss-auto\static\brand',
    'groundstation': r'X:\Github\pdx-mod-hub\web\public\brand',
    'outreach':      r'X:\Github\linkedin-networking\static\brand',
    'atrium':        r'X:\Github\atrium\static\brand',
}

ATRIUM_INDEX = r'X:\Github\atrium\static\index.html'
BEGIN = '  <!-- BEGIN generated marks (icons/gen.py) -->'
END = '  <!-- END generated marks -->'


def write_atrium_defs():
    """Inline every mark into Atrium's shared <defs>.

    The hall shows the very same mark the app's own favicon shows — one
    identity per service, everywhere. They go in as generated markup between
    sentinels so re-running this script is the only way they ever change.

    The block is rewritten wholesale, so this must emit every mark the hall
    knows about, not just the ones with a brand directory: leave one out and
    the next run silently deletes that gate's sigil from the concourse.
    """
    body = '\n'.join(
        '  <g id="mark-%s">%s</g>' % (app, emblem(app)) for app in APPS)
    src = io.open(ATRIUM_INDEX, encoding='utf-8').read()
    block = BEGIN + '\n' + body + '\n' + END
    if BEGIN in src:
        head, rest = src.split(BEGIN, 1)
        src = head + block + rest.split(END, 1)[1]
    else:
        src = src.replace('</defs>', block + '\n\n</defs>', 1)
    io.open(ATRIUM_INDEX, 'w', encoding='utf-8').write(src)
    print('  atrium defs -> %s' % ATRIUM_INDEX)


if __name__ == '__main__':
    only = [a for a in sys.argv[1:] if a in TARGETS] or list(TARGETS)
    for app in only:
        build(app, TARGETS[app])
    write_atrium_defs()
    print('done')
