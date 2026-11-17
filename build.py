#!/usr/bin/env python3
"""Generate the standalone Exploratorium Events UI prototype and source dossier."""
from __future__ import annotations

import base64
import html
import json
import mimetypes
import shutil
import sys
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path('/home/user/exploratorium-events-ui')
ASSETS = ROOT / 'assets'
SOURCE = ROOT / 'source'
SEARCH = Path('/home/user/image-search')
UPLOADS = Path('/home/user/uploads')
ASSETS.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)

# Clean up failed direct-download placeholders.
for p in list(ASSETS.glob('*')) + list(SOURCE.glob('*')):
    if p.is_file() and p.stat().st_size < 3000 and p.suffix.lower() in {'.webp', '.pdf', '.jpg'}:
        p.unlink()

ASSET_MAP = {
    'holiday_moon': 'exploratorium-rentals-holiday-party-gall-1.jpg',
    'holiday_marquee': 'exploratorium-rentals-holiday-party-gall-2.jpg',
    'holiday_callan': 'exploratorium-rentals-holiday-party-gall-3.jpg',
    'forum_1': 'exploratorium-rentals-kanbar-forum-event-1.jpg',
    'forum_2': 'exploratorium-rentals-kanbar-forum-event-2.jpg',
    'forum_3': 'exploratorium-rentals-kanbar-forum-event-3.jpg',
    'wedding_1': 'exploratorium-fisher-bay-observatory-ter-1.jpg',
    'wedding_2': 'exploratorium-fisher-bay-observatory-ter-2.jpg',
    'wedding_3': 'exploratorium-fisher-bay-observatory-ter-3.jpg',
    'pier_night': 'exploratorium-pier-15-bay-bridge-event-r-1.jpg',
    'pier_callan': 'exploratorium-pier-15-bay-bridge-event-r-2.jpg',
    'pier_event': 'exploratorium-pier-15-bay-bridge-event-r-3.jpg',
    'central_event': 'exploratorium-pier-15-bay-bridge-event-r-4.jpg',
    'afterdark_1': 'exploratorium-after-dark-event-thursday--1.jpg',
    'afterdark_2': 'exploratorium-after-dark-event-thursday--2.jpg',
    'afterdark_3': 'exploratorium-after-dark-event-thursday--3.jpg',
    'daytime_marquee': 'exploratorium-daytime-meetings-events-fi-1.jpg',
    'daytime_card': 'exploratorium-daytime-meetings-events-fi-2.jpg',
    'west_1': 'exploratorium-osher-west-gallery-recepti-1.jpg',
    'west_2': 'exploratorium-osher-west-gallery-recepti-2.jpg',
    'west_3': 'exploratorium-osher-west-gallery-recepti-3.jpg',
    'east_1': 'exploratorium-moore-east-gallery-rentals-1.jpg',
    'east_2': 'exploratorium-moore-east-gallery-rentals-2.jpg',
    'east_3': 'exploratorium-moore-east-gallery-rentals-3.jpg',
    'prom_1': 'exploratorium-students-dancing-prom-nigh-1.jpg',
    'prom_2': 'exploratorium-students-dancing-prom-nigh-2.jpg',
    'prom_3': 'exploratorium-students-dancing-prom-nigh-3.jpg',
    'wedding_shadow_1': 'exploratorium-wedding-colored-shadows-re-1.jpg',
    'wedding_shadow_2': 'exploratorium-wedding-colored-shadows-re-2.jpg',
    'wedding_shadow_3': 'exploratorium-wedding-colored-shadows-re-3.jpg',
}

# Normalize into compact local JPEGs and copy the official video poster.
# Assets are only re-encoded when missing or when --force-assets is passed: re-encoding an
# already-normalized JPEG shifts a few bytes every run and would dirty the git tree each build.
FORCE_ASSETS = '--force-assets' in sys.argv
prepared: dict[str, Path] = {}
for key, filename in ASSET_MAP.items():
    src = SEARCH / filename
    dst = ASSETS / f'{key}.jpg'
    if src.exists() and (FORCE_ASSETS or not dst.exists()):
        with Image.open(src) as raw:
            im = raw.convert('RGB')
            im.thumbnail((760, 760), Image.Resampling.LANCZOS)
            im.save(dst, 'JPEG', quality=76, optimize=True, progressive=True)
        prepared[key] = dst
    elif dst.exists():
        prepared[key] = dst

video_poster = ASSETS / 'video_poster.jpg'
if FORCE_ASSETS or not video_poster.exists():
    if not video_poster.exists():
        shutil.copyfile(ASSETS / 'maxresdefault.jpg', video_poster)
    with Image.open(video_poster) as raw:
        im = raw.convert('RGB')
        im.thumbnail((1000, 600), Image.Resampling.LANCZOS)
        im.save(video_poster, 'JPEG', quality=78, optimize=True, progressive=True)
prepared['video_poster'] = video_poster

# Create an animated-wallpaper still derived from the original-site rental imagery.
wallpaper = ASSETS / 'glass-wallpaper.jpg'
if FORCE_ASSETS or not wallpaper.exists():
    with Image.open(prepared['holiday_moon']) as raw:
        base = ImageOps.fit(raw.convert('RGB'), (1600, 900), Image.Resampling.LANCZOS, centering=(0.5, 0.45))
    base = base.filter(ImageFilter.GaussianBlur(10))
    base = ImageEnhance.Color(base).enhance(0.72)
    base = ImageEnhance.Contrast(base).enhance(1.08)
    overlay = Image.new('RGBA', base.size, (5, 8, 20, 140))
    gradient = Image.new('RGBA', (1, 900), (0, 0, 0, 0))
    for y in range(900):
        a = int(25 + 135 * (y / 899) ** 1.7)
        gradient.putpixel((0, y), (2, 6, 18, a))
    gradient = gradient.resize((1600, 900))
    overlay = Image.alpha_composite(overlay, gradient)
    shards = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(shards)
    for i, x in enumerate(range(-300, 1700, 260)):
        d.polygon([(x, 0), (x + 90, 0), (x + 400, 900), (x + 300, 900)], fill=(170, 215, 255, 12 if i % 2 else 22))
        d.line([(x + 92, 0), (x + 402, 900)], fill=(230, 245, 255, 48), width=2)
    shards = shards.filter(ImageFilter.GaussianBlur(1.2))
    wall = Image.alpha_composite(Image.alpha_composite(base.convert('RGBA'), overlay), shards)
    wall.convert('RGB').save(wallpaper, 'JPEG', quality=82, optimize=True, progressive=True)
prepared['wallpaper'] = wallpaper

cutout = ASSETS / 'exploratorium-logo-transparent.png'
prepared['cutout'] = cutout

# Source attachments are retained for continued adaptation.
shutil.copyfile(UPLOADS / 'Maestro_AI___Executive_Event_Producer___Cultural_Venues_Sh.html', SOURCE / 'Maestro_AI_Executive_Event_Producer.html')
shutil.copyfile(UPLOADS / 'images (1).jpg', SOURCE / 'exploratorium-logo-original.jpg')


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

IMG = {key: data_uri(path) for key, path in prepared.items() if key != 'cutout'}
CUTOUT = data_uri(cutout)
WALL = IMG['wallpaper']

SITE = 'https://www.exploratorium.edu'
RENTALS = f'{SITE}/rentals'
HERO_IMG = f'{SITE}/sites/default/files/styles/social_standard/public/feature_slides/rentals-central-hero.jpg?h=ab502919&itok=NPX_u1Xs'
MAP_PDF = f'{SITE}/sites/default/files/2026-06/2026_RentalsMap_Pier15_w_0.pdf'
MAP_IMG = f'{SITE}/sites/default/files/styles/webp/public/2026-06/2026_RentalsMap_Pier15_web_v2.png.webp?itok=MoQU7NDg'
YOUTUBE = 'https://www.youtube.com/watch?v=qVxsUfNnzNw'
YOUTUBE_POSTER = 'https://i.ytimg.com/vi/qVxsUfNnzNw/maxresdefault.jpg'
DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1RdxbW61BqWv8S8Y9TeGHcNtV0gGWGBx1'

PINTEREST = [
    {'short': 'https://pin.it/5Jw631SYA', 'pin': '1139903355708995097', 'role': 'Netflix-style glassmorphism reference'},
    {'short': 'https://pin.it/cYgeaTmO2', 'pin': '1103030133787027794', 'role': 'Media-gallery / cinematic card reference'},
    {'short': 'https://pin.it/7f1v3Uid8', 'pin': '830562356283399928', 'role': 'Animated glass wallpaper from the original site'},
    {'short': 'https://pin.it/3NpkbxC5I', 'pin': '1001839879605135210', 'role': 'Live mouseover and pointer-light reference'},
    {'short': 'https://pin.it/1jcN9XA9H', 'pin': '909023506061744820', 'role': 'Bot-in-action animation reference'},
]

FACILITY_CARDS = [
    {
        'title': 'Full Facility & Gallery Bundles',
        'description': 'Combine galleries for more exhibit experiences.',
        'url': f'{RENTALS}/full-facility-gallery-bundles',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/2024-11/rentals-gallery-5_featured.jpg.webp?h=a6967b5f&itok=nzvSaIkb',
        'local': 'pier_callan',
    },
    {
        'title': 'Fisher Bay Observatory Gallery & Terrace',
        'description': 'Explore the history, geography, and ecology of the Bay Area.',
        'url': f'{RENTALS}/bay-observatory-gallery-terrace',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/pages/observatory2-pod_0.jpg.webp?h=c7245158&itok=TGKO-xnc',
        'local': 'wedding_1',
    },
    {
        'title': 'Moore East Gallery',
        'description': 'Explore life from DNA and cells to organisms and ecosystems.',
        'url': f'{RENTALS}/east-gallery',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/pages/east-gallery-pod.jpg.webp?h=c7245158&itok=a9bI5OKo',
        'local': 'east_1',
    },
    {
        'title': 'Bechtel Central & Outdoor Gallery',
        'description': 'Experiment with light and vision, sound, and hearing.',
        'url': f'{RENTALS}/central-gallery',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/pages/central-gallery-pod.jpg.webp?h=c7245158&itok=Z3umC8cI',
        'local': 'central_event',
    },
    {
        'title': 'Osher West Gallery',
        'description': 'Experiment with thoughts, feelings, and social behavior.',
        'url': f'{RENTALS}/west-gallery',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/pages/west-gallery-pod.jpg.webp?h=c7245158&itok=H22EnVIh',
        'local': 'west_2',
    },
    {
        'title': 'Kanbar Forum',
        'description': 'Experience our state-of-the-art venue for screenings, meetings, music, and more.',
        'url': f'{RENTALS}/kanbar-forum',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/pages/Forum-760x426.jpg.webp?h=c7245158&itok=U7T-Pj3a',
        'local': 'forum_1',
    },
]

SPECIAL_EVENT_CARDS = [
    {
        'title': 'Holiday Parties',
        'description': 'Glow up your holiday parties with a celebration in our galleries!',
        'url': f'{RENTALS}/holiday-parties',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/2023-08/Callan-Exploratorium-042722_001.jpg.webp?h=34bbd072&itok=U0MABGvm',
        'local': 'holiday_marquee',
    },
    {
        'title': 'Daytime Meetings, Conference Events & Filmings',
        'description': 'Unique meeting and event spaces that inspire creativity.',
        'url': f'{RENTALS}/daytime-meetings',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/2023-02/Rentals_Daytime.jpg.webp?h=0a8b6f8b&itok=ae788mGj',
        'local': 'daytime_card',
    },
    {
        'title': 'Proms and School Events',
        'description': 'Celebrate your prom with an experience your class will never forget.',
        'url': f'{RENTALS}/proms-school-events',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/feature_slides/prom-header2.jpg.webp?h=ab502919&itok=U7kI2Ufv',
        'local': 'prom_1',
    },
    {
        'title': 'Weddings',
        'description': 'Celebrate your wedding in a unique venue with exciting exhibits and unforgettable views.',
        'url': f'{RENTALS}/weddings',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/pages/Wedding_Colored-Shadows_760x426.jpg.webp?h=c7245158&itok=lWoVcyfs',
        'local': 'wedding_shadow_1',
    },
    {
        'title': 'After Dark Thursday Rental Options',
        'description': 'The museum is happy to offer private and semi-private rentals on Thursday nights that include admission to After Dark for your guests.',
        'url': f'{RENTALS}/after-dark',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/2026-09/FY27-AD-pod-750x422-4_0.jpg.webp?h=a6967b5f&itok=2_HIwf6H',
        'local': 'afterdark_3',
    },
]

RESOURCE_CARDS = [
    {
        'title': 'Event Planning Resources',
        'url': f'{RENTALS}/planning',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/feature_slides/lab-event-pace-2-960-380.jpg.webp?h=c515b0a0&itok=jepcOLg0',
    },
    {
        'title': 'Rentals FAQ',
        'url': f'{RENTALS}/faq',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/2023-02/06_east_gallery_rentals.jpeg.webp?h=3dbd9eac&itok=44qTKHcZ',
    },
    {
        'title': 'Download Corporate Brochure (pdf)',
        'url': f'{SITE}/sites/default/files/2026-10/_Brochure_Map_Exploratorium_2026.pdf',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/2023-01/ExploAwardsDinner_050918_079-downsized-for-web.jpeg.webp?h=34bbd072&itok=maMmny-P',
    },
    {
        'title': 'Download Social Brochure (pdf)',
        'url': f'{SITE}/sites/default/files/2026-10/Wedding_Packages_Exploratorium_2026.pdf',
        'image': f'{SITE}/sites/default/files/styles/responsive_16_9_1450w/public/2023-09/Screen%20Shot%202023-09-12%20at%2011.59.22%20AM.png.webp?h=31104ef9&itok=J3Ucaj5e',
    },
]

VENUE_DETAILS = [
    {'id':'full','name':'Full Facility & Gallery Bundles','sqft':'100,000','seated':'1,100','standing':'3,500','desc':'Rent the entire waterfront facility or combine galleries for a progressive celebration. The bundles range from 13,000 to 49,000 sq ft.','img':'pier_night','cats':'all,large,social','map':'full','url':f'{RENTALS}/full-facility-gallery-bundles'},
    {'id':'observatory','name':'Fisher Bay Observatory Gallery & Terrace','sqft':'3,500 indoor / 2,500 outdoor','seated':'150 indoor / 100 outdoor','standing':'200 indoor / 125 outdoor','desc':'A glass-and-steel waterfront gallery with Bay views and an adjoining terrace, suited to dinners, receptions, weddings and daytime meetings.','img':'wedding_2','cats':'all,waterfront,conference,social','map':'observatory','url':f'{RENTALS}/bay-observatory-gallery-terrace'},
    {'id':'east','name':'Moore East Gallery','sqft':'7,000','seated':'90–200','standing':'450','desc':'Large windows overlooking the Bay frame life-science exhibits and an intimate setting for seated dinners, dancing and receptions.','img':'east_1','cats':'all,waterfront,social','map':'east','url':f'{RENTALS}/east-gallery'},
    {'id':'central','name':'Bechtel Central & Outdoor Gallery','sqft':'20,000 + 15,000 outdoor','seated':'500 / 300 outdoor','standing':'1,200 / 500 outdoor','desc':'The largest single gallery: physics and perception installations, strolling receptions, dining and dancing, plus open-air views and the Fog Bridge.','img':'central_event','cats':'all,large,conference','map':'central','url':f'{RENTALS}/central-gallery'},
    {'id':'west','name':'Osher West Gallery','sqft':'16,000','seated':'70–200','standing':'500','desc':'Psychology, art, the iconic Tactile Dome and Black Box; adjacent to the Forum and strong for launches, alumni gatherings and evening receptions.','img':'west_2','cats':'all,large,social','map':'west','url':f'{RENTALS}/west-gallery'},
    {'id':'forum','name':'Kanbar Forum','sqft':'3,600','seated':'160–200','standing':'250','desc':'Meyer Constellation sound, state-of-the-art projection, theater or cabaret seating; built for seminars, lectures, screenings and media events.','img':'forum_1','cats':'all,conference','map':'forum','url':f'{RENTALS}/kanbar-forum'},
]

EVENT_TYPES = [
    {'id':'holiday','title':'Holiday Parties','tag':'Glow / December','desc':'Five gallery spaces can be bundled, with Glow luminous artworks, LED packages, monitor branding and outdoor heat lamps.','img':'holiday_moon','cats':'celebrations','url':f'{RENTALS}/holiday-parties','facts':['Up to 3,500 guests','5 gallery spaces','In-house add-ons']},
    {'id':'daytime','title':'Daytime Meetings, Conference Events & Filmings','tag':'Conference / Meetings','desc':'Fisher Bay Observatory and Kanbar Forum support daytime business meetings, seminars and team building; larger gallery spaces are available on closed Mondays and Tuesdays.','img':'daytime_marquee','cats':'daytime,conference','url':f'{RENTALS}/daytime-meetings','facts':['Museum admission during open hours','Kanbar Forum + Observatory','Central Gallery: 500 theatre / 300 rounds']},
    {'id':'prom','title':'Proms and School Events','tag':'Schools','desc':'Proms, formals, homecomings and grad nights with interactive exhibits, explainer staff, an on-site coordinator and a 15% nonprofit discount.','img':'prom_2','cats':'school','url':f'{RENTALS}/proms-school-events','facts':['15% nonprofit discount','Explainer staff','Photo-op galleries']},
    {'id':'weddings','title':'Weddings','tag':'Social','desc':'The East + Fisher Bay Observatory bundle pairs Bay views, an outdoor terrace and life-sciences exhibits for ceremonies and receptions.','img':'wedding_shadow_1','cats':'social,celebrations','url':f'{RENTALS}/weddings','facts':['East + Observatory bundle','Terrace ceremonies','2026 wedding brochure']},
    {'id':'afterdark','title':'After Dark Thursday Rental Options','tag':'18+ / Thursday','desc':'Private and semi-private Thursday-night rentals include guest admission to After Dark, 6–10 PM, with 650+ interactive exhibits.','img':'afterdark_3','cats':'afterdark,celebrations','url':f'{RENTALS}/after-dark','facts':['Thursday 6–10 PM','Lounges up to 45','Private galleries up to 200']},
]

MEDIA = [
    {'title':'Moon over the Central Gallery','cat':'parties','img':'holiday_moon','caption':'Holiday Parties · original-site feature image','source':f'{RENTALS}/holiday-parties'},
    {'title':'Glow holiday marquee','cat':'parties','img':'holiday_marquee','caption':'Original rentals marquee imagery','source':f'{RENTALS}/holiday-parties'},
    {'title':'Gallery celebration','cat':'parties','img':'holiday_callan','caption':'Callan / Exploratorium event photography','source':f'{RENTALS}/full-facility-gallery-bundles'},
    {'title':'Kanbar Forum theater','cat':'forum','img':'forum_1','caption':'Kanbar Forum image gallery','source':f'{RENTALS}/kanbar-forum'},
    {'title':'Kanbar Forum seating','cat':'forum','img':'forum_2','caption':'Kanbar Forum image gallery','source':f'{RENTALS}/kanbar-forum'},
    {'title':'Kanbar Forum showcase','cat':'forum','img':'forum_3','caption':'Kanbar Forum image gallery','source':f'{RENTALS}/kanbar-forum'},
    {'title':'Observatory terrace dinner','cat':'weddings','img':'wedding_1','caption':'Weddings image gallery','source':f'{RENTALS}/weddings'},
    {'title':'Wedding portrait','cat':'weddings','img':'wedding_2','caption':'Weddings image gallery','source':f'{RENTALS}/weddings'},
    {'title':'Indoor Observatory couple','cat':'weddings','img':'wedding_3','caption':'Weddings image gallery','source':f'{RENTALS}/weddings'},
    {'title':'Pier 15 at night','cat':'venues','img':'pier_night','caption':'Exploratorium rental atmosphere','source':'https://pinterest.com/exploratorium/rent-the-exploratorium'},
    {'title':'Bay Bridge reception','cat':'venues','img':'pier_event','caption':'Exploratorium rental atmosphere','source':'https://pinterest.com/exploratorium/rent-the-exploratorium'},
    {'title':'Full-facility event','cat':'venues','img':'pier_callan','caption':'Full Facility & Gallery Bundles','source':f'{RENTALS}/full-facility-gallery-bundles'},
    {'title':'Central Gallery installation','cat':'venues','img':'central_event','caption':'Bechtel Central & Outdoor Gallery','source':f'{RENTALS}/central-gallery'},
    {'title':'After Dark energy','cat':'afterdark','img':'afterdark_1','caption':'After Dark visual reference','source':f'{RENTALS}/after-dark'},
    {'title':'After Dark fog','cat':'afterdark','img':'afterdark_2','caption':'After Dark visual reference','source':f'{RENTALS}/after-dark'},
    {'title':'After Dark light wall','cat':'afterdark','img':'afterdark_3','caption':'Original-site After Dark card image','source':f'{RENTALS}/after-dark'},
    {'title':'Daytime meeting marquee','cat':'forum','img':'daytime_marquee','caption':'Daytime Meetings, Conference Events & Filmings','source':f'{RENTALS}/daytime-meetings'},
    {'title':'Conference card','cat':'forum','img':'daytime_card','caption':'Original Special Events card image','source':RENTALS},
    {'title':'West Gallery reception','cat':'venues','img':'west_1','caption':'Osher West Gallery image gallery','source':f'{RENTALS}/west-gallery'},
    {'title':'West Gallery seated dinner','cat':'venues','img':'west_2','caption':'Osher West Gallery image gallery','source':f'{RENTALS}/west-gallery'},
    {'title':'West Gallery light','cat':'venues','img':'west_3','caption':'Osher West Gallery image gallery','source':f'{RENTALS}/west-gallery'},
    {'title':'East Gallery Bay windows','cat':'venues','img':'east_1','caption':'Moore East Gallery image gallery','source':f'{RENTALS}/east-gallery'},
    {'title':'East Gallery reception','cat':'venues','img':'east_2','caption':'Moore East Gallery image gallery','source':f'{RENTALS}/east-gallery'},
    {'title':'East Gallery exhibits','cat':'venues','img':'east_3','caption':'Moore East Gallery image gallery','source':f'{RENTALS}/east-gallery'},
    {'title':'Prom marquee','cat':'school','img':'prom_1','caption':'Proms and School Events','source':f'{RENTALS}/proms-school-events'},
    {'title':'Students dancing','cat':'school','img':'prom_2','caption':'Proms and School Events image gallery','source':f'{RENTALS}/proms-school-events'},
    {'title':'Prom photo moment','cat':'school','img':'prom_3','caption':'Proms and School Events image gallery','source':f'{RENTALS}/proms-school-events'},
    {'title':'Wedding colored shadows','cat':'weddings','img':'wedding_shadow_1','caption':'Weddings image gallery','source':f'{RENTALS}/weddings'},
    {'title':'Colored Shadows diagram','cat':'venues','img':'wedding_shadow_2','caption':'Original exhibit reference','source':f'{SITE}/exhibits/colored-shadows'},
    {'title':'Wedding celebration','cat':'weddings','img':'wedding_shadow_3','caption':'Weddings image gallery','source':f'{RENTALS}/weddings'},
    {'title':'Exploratorium Event Rentals reel','cat':'video','img':'video_poster','caption':'Official 56-second Exploratorium reel (2019)','source':YOUTUBE},
]

FEATURED = [
    {'title':'Holiday Parties','kicker':'Featured collection · Glow','desc':'Light, visual art and glowing installations across five gallery spaces — up to 3,500 guests.','img':'holiday_moon','tag':'Celebrations'},
    {'title':'Kanbar Forum','kicker':'Conference-ready','desc':'Meyer Constellation sound, projection and flexible theater or cabaret seating for 160–200.','img':'forum_1','tag':'Details'},
    {'title':'Fisher Bay Observatory','kicker':'Waterfront','desc':'A glass-and-steel gallery and adjoining terrace with city and Bay views.','img':'wedding_2','tag':'Venues'},
    {'title':'After Dark Thursdays','kicker':'18+ · 6–10 PM','desc':'Private and semi-private events with admission to After Dark and 650+ interactive exhibits.','img':'afterdark_3','tag':'Experience'},
]

CONTENT_INVENTORY = {
    'generated': '2026-11-17',
    'source_page': RENTALS,
    'scope': 'Events tab only: hero/intro, contact, rentals map, Facility Rental Options, Special Events, Rentals Resources, linked detail pages, official reel and venue map PDF.',
    'source_note': 'The source page is a long-form landing page; proposed primary tabs and sub-tabs are a new information architecture derived from its sections, not literal source DOM tabs.',
    'attachments': {
        'received': [
            '/home/user/uploads/images (1).jpg',
            '/home/user/uploads/Maestro_AI___Executive_Event_Producer___Cultural_Venues_Sh.html'
        ],
        'note': 'The Maestro AI venue brief was provided as HTML (not PDF). The official 2026 Rentals Map PDF was extracted from the Exploratorium site and its labels are included below.'
    },
    'drive_adaptation_folder': {'name': 'Exploratorium Events UI · המשך התאמה · 2026-11-17', 'id': '1RdxbW61BqWv8S8Y9TeGHcNtV0gGWGBx1', 'url': DRIVE_FOLDER, 'parent': '1Ou_0XAeAvWZevViDyQd3TRs4jsfuFQ38'},
    'pinterest_references': PINTEREST,
    'hero': {
        'title': 'Private & Corporate Event Rentals',
        'tagline': 'Have your next event in our spectacular setting on the Bay.',
        'intro': 'Our LEED platinum sustainably designed facility—located in the vibrant heart of the historic Embarcadero at Pier 15—is an unforgettable venue for everything from intimate gatherings to large events. With spectacular views of both city and Bay—plus access to our lively landscape of hundreds of exhibits—the Exploratorium’s waterfront home offers an exciting, imaginative setting for just about anything you can dream up.',
        'poster': HERO_IMG,
        'video_player': 'Source page contains a Brightcove-style video player; the embedded asset ID was not exposed in the extracted rendering.',
        'official_reel': {'title':'Exploratorium Event Rentals','url':YOUTUBE,'poster':YOUTUBE_POSTER,'duration':'00:56','uploaded':'2019-05-03','channel':'Exploratorium','transcript_note':'Music-led reel; automatic transcript contains only music/no-word tokens.'}
    },
    'contact': {'phone':'415.528.4500','email':'events@exploratorium.edu','form':f'{RENTALS}/form'},
    'map': {'pdf':MAP_PDF,'thumbnail':MAP_IMG,'labels':['Kanbar Forum','Osher West Gallery','Bechtel Central & Outdoor Gallery','Moore East Gallery','Fisher Bay Observatory & Terrace','Gallery 5','Gallery 6','Outdoor Observatory & Terrace','Tactile Dome','Bay Bridge','Embarcadero','Pier 15','Pier 17']},
    'panels': {
        'facility_rental_options': {'heading':'Facility Rental Options','intro':'At Pier 15, the museum is divided into galleries filled with exhibits ranging from mechanical contraptions to artworks highlighting the beauty of the physical phenomena that surround us. Galleries are available to rent either individually or in combination.','cards':FACILITY_CARDS},
        'special_events': {'heading':'Special Events','cards':SPECIAL_EVENT_CARDS},
        'rentals_resources': {'heading':'Rentals Resources','cards':RESOURCE_CARDS},
    },
    'proposed_ia': {
        'primary_tabs': ['Discover','Venues','Event Types','Conferences','Media Wall','Source Copy','Upgrade Plan'],
        'sub_tabs': {
            'Venues': ['All','Waterfront','Large format','Conference','Social'],
            'Event Types': ['All','Celebrations','Daytime','After Dark','Weddings','School'],
            'Conferences': ['Overview','Conference builder','Filming','Maestro pipeline'],
            'Media Wall': ['All','Venues','Parties','Forum','Weddings','After Dark','School','Video'],
            'Source Copy': ['Special Events','Facility Options','Resources','Video & Map'],
            'Upgrade Plan': ['Now','Next','Later']
        }
    },
    'venue_details': VENUE_DETAILS,
    'event_types': EVENT_TYPES,
    'media': MEDIA,
    'maestro_ai': {
        'source_file': 'source/Maestro_AI_Executive_Event_Producer.html',
        'title': 'Maestro AI — מפיק אירועי העילית האוטונומי | מוסדות התרבות של סן פרנסיסקו',
        'system': 'Hebrew RTL Nocturne dark glass design, spatial SVG spotlight, 5-question stakeholder survey, 4-act story, 6 Tier-1 vendors and a floating concierge chat widget.',
        'generic_venues': ['SFMOMA','California Academy of Sciences','de Young Museum','The Contemporary Jewish Museum'],
        'adaptation': 'Replace the four generic institutions with the six Exploratorium rental spaces; preserve the state machine, weighted survey, venue spotlight, vendor/COI checks and brief export.',
        'survey_axes': ['Visual signature / spatial architecture','Acoustic red line','Culinary direction','Signature memory','Seating and schedule'],
        'four_acts': ['18:30 biophilic reception and sunset','19:45 circular amphitheater plenary','20:45 candlelit royal tables','22:30 night salon and silent drone finale'],
        'vendors': ['Paula LeDuc Fine Catering & Events','McCalls Catering & Events','Blueprint Studios','Argus HD','Entire Productions','Brookline Electric'],
        'colors': {'background':'#0a101d','primary':'#dfaa5b','tertiary':'#7cc4e8'}
    },
    'rights_note': 'Exploratorium editorial text, image URLs, brand marks and PDFs remain the property of their respective owners. This prototype is a design/adaptation study; verify availability, pricing, accessibility and licensing before production.'
}

(ROOT / 'content-inventory.json').write_text(json.dumps(CONTENT_INVENTORY, ensure_ascii=False, indent=2), encoding='utf-8')

SOURCE_COPY = f'''# Exploratorium — Events Tab Source Copy

**Source:** [{RENTALS}]({RENTALS}) · extracted 2026-11-17  
**Scope:** only the events/rentals content blocks, their linked detail pages, media, and supporting venue-map/PDF material. This is a faithful archival copy, not a redesign.

> Note: the source is a long-form landing page, not a literal ARIA tab set. “Tab panels” and “sub-tabs” in the upgrade are a proposed IA derived from these source sections.

## Hero / intro

# Private & Corporate Event Rentals

**Have your next event in our spectacular setting on the Bay.**

Our LEED platinum sustainably designed facility—located in the vibrant heart of the historic Embarcadero at Pier 15—is an unforgettable venue for everything from intimate gatherings to large events. With spectacular views of both city and Bay—plus access to our lively landscape of hundreds of exhibits—the Exploratorium’s waterfront home offers an exciting, imaginative setting for just about anything you can dream up.

- **Phone:** 415.528.4500
- **Email:** events@exploratorium.edu
- **Inquiry:** [Complete Rental Inquiry Form]({RENTALS}/form)
- **Hero poster:** [`{HERO_IMG}`]({HERO_IMG})
- **Rentals map:** [2026 Pier 15 PDF]({MAP_PDF}) / [thumbnail]({MAP_IMG})

The source page presents a video player. Its embedded asset ID was not exposed by the fetched rendering. The official moving-image reference preserved here is [Exploratorium Event Rentals]({YOUTUBE}) — 56 seconds, uploaded by Exploratorium on 2019-05-03, poster `{YOUTUBE_POSTER}`. Its description repeats the historic “winner of SF Magazine’s 2018 Best Museum Party award” copy and the Pier 15 contact block.

## Panel 1 — Facility Rental Options

At Pier 15, the museum is divided into galleries filled with exhibits ranging from mechanical contraptions to artworks highlighting the beauty of the physical phenomena that surround us. Galleries are available to rent either individually or in combination.

| # | Title | Media text | Link | Image |
|---:|---|---|---|---|
''' + '\n'.join(
    f"| {i} | {c['title']} | {c['description']} | [detail]({c['url']}) | [source image]({c['image']}) |"
    for i, c in enumerate(FACILITY_CARDS, 1)
) + f'''

### Extracted venue capacities

| Venue | Square footage | Seated | Standing | Source |
|---|---:|---:|---:|---|
| Full Facility | 100,000 | 1,100 | 3,500 | [bundles]({RENTALS}/full-facility-gallery-bundles) |
| Fisher Bay Observatory — indoor / outdoor | 3,500 / 2,500 | 150 / 100 | 200 / 125 | [Observatory]({RENTALS}/bay-observatory-gallery-terrace) |
| Moore East Gallery | 7,000 | 90–200 | 450 | [East]({RENTALS}/east-gallery) |
| Bechtel Central / Outdoor | 20,000 / 15,000 | 500 / 300 | 1,200 / 500 | [Central]({RENTALS}/central-gallery) |
| Osher West Gallery | 16,000 | 70–200 | 500 | [West]({RENTALS}/west-gallery) |
| Kanbar Forum | 3,600 | 160–200 | 250 | [Forum]({RENTALS}/kanbar-forum) |

Additional bundle rows from the source: 49,000 sq ft / 1,000 seated / 3,300 standing; 33,000 / 730 / 1,900; 43,000 / 750 / 2,750; 27,000 / 550 / 1,650; 36,000 / 650 / 1,800; 13,000 / 380 / 700; 19,600 / 350 / 850. Capacities are subject to change.

## Panel 2 — Special Events (events tab copy)

| # | Title | Media text | Link | Image |
|---:|---|---|---|---|
''' + '\n'.join(
    f"| {i} | {c['title']} | {c['description']} | [detail]({c['url']}) | [source image]({c['image']}) |"
    for i, c in enumerate(SPECIAL_EVENT_CARDS, 1)
) + f'''

### Detail-page media texts

- **Holiday Parties:** five gallery spaces can be bundled; full facility for up to 3,500 guests; seasonal *Glow* exhibition; LED lighting, monitor artwork, outdoor heat lamps.
- **Daytime Meetings / Conferences / Filmings:** Fisher Bay Observatory and Kanbar Forum available daily for daytime meetings; larger galleries on closed Mondays and Tuesdays; Central Gallery holds 500 theatre-style or 300 at rounds; all meeting packages include museum admission during open hours.
- **Conferences:** earlier load-in for evening events or Sunday-night load-in if needed; Central Gallery accommodates 500 guests theatre-style or 300 at rounds.
- **Filming & Location Shoots:** waterfront views, educational settings, science exhibits, interviews, performances, demos and keynote speakers.
- **Proms and School Events:** 15% nonprofit (501c3) discount, interactive exhibits, Explainer staff, on-site facility coordinator, high-school and college policy PDFs.
- **Weddings:** East + Fisher Bay Observatory bundle; sweeping city and Bay views; attached outdoor terrace; life-sciences exhibits. [2026 wedding brochure]({SITE}/sites/default/files/2026-09/Wedding_Packages_Exploratorium_2026_v2.pdf).
- **After Dark:** adults 18+, Thursday 6–10 PM; private gallery options up to 200; semi-private East Gallery Mezzanine or West Dome Corner up to 45 each; drink tickets $14 + tax; drop-off catering only for lounges.

## Panel 3 — Rentals Resources

| # | Title | Link | Image |
|---:|---|---|---|
''' + '\n'.join(
    f"| {i} | {c['title']} | [open]({c['url']}) | [source image]({c['image']}) |"
    for i, c in enumerate(RESOURCE_CARDS, 1)
) + f'''

## Venue map PDF labels

`EVENT RENTALS AT THE EXPLORATORIUM` · San Francisco Bay · Fisherman's Wharf · Bay Bridge · San Francisco · Ferry Building · Moscone Center · Oracle Park · Kanbar Forum · Osher West Gallery · Bechtel Central & Outdoor Gallery · Moore East Gallery · Fisher Bay Observatory & Terrace · Pier 17 / Pier 15 · Tactile Dome · Gallery 5 / Gallery 6 · Outdoor Observatory & Terrace · Embarcadero · `EXPLORATORIUM.EDU/RENTALS` · `415.528.4500 // EVENTS@EXPLORATORIUM.EDU`.

## Proposed sub-tabs

- **Discover:** Featured, Venues, Event Types, Media.
- **Venues:** All · Waterfront · Large format · Conference · Social.
- **Event Types:** All · Celebrations · Daytime · After Dark · Weddings · School.
- **Conferences:** Overview · Conference builder · Filming · Maestro pipeline.
- **Media Wall:** All · Venues · Parties · Forum · Weddings · After Dark · School · Video.
- **Source Copy:** Special Events · Facility Options · Resources · Video & Map.
- **Upgrade Plan:** Now · Next · Later.

See `index.html` for the interactive copy and `content-inventory.json` for the machine-readable extraction.
'''
(ROOT / 'SOURCE_COPY.md').write_text(SOURCE_COPY, encoding='utf-8')

UPGRADE_PLAN = f'''# Upgrade Plan — Exploratorium Events OS / Sakshinhiro Model A

**Prepared:** 2026-11-17 · **Source:** [{RENTALS}]({RENTALS}) · **Adaptation folder:** [Drive]({DRIVE_FOLDER})

## 1. Executive intent

Turn the single long rentals page into a dedicated, cinematic event-discovery interface for **events, venue details and conferences**. Preserve the source editorial copy exactly in an archival tab, then layer a Netflix-style browsing model over it: horizontal rails, hover previews, glass surfaces, rotating media, a transparent-cutout 3D glass cube, live pointer light, and an animated Maestro AI concierge grounded in the venue map and brochure data.

The prototype is deliberately standalone: all imagery is embedded as data URIs, so it works in the workspace preview and as a downloaded HTML file without a CDN, build step, API key or backend.

## 2. What was extracted

1. **Hero / intro / contact:** LEED platinum Pier 15 copy, Bay views, hundreds of exhibits, phone/email/form.
2. **Media:** source hero poster, video-player presence, official 56-second Exploratorium reel + poster/transcript note, 2026 map PDF + thumbnail, corporate/social/wedding brochures, and 31 local gallery assets derived from original-site imagery.
3. **Panels:** Facility Rental Options (6), Special Events (5), Rentals Resources (4), plus linked detail pages for all six venues and all five event types.
4. **Details:** square footage, seated/standing capacities, bundle rows, conference/filming rules, After Dark packages, prom package, wedding bundle.
5. **Maestro AI:** Hebrew RTL Nocturne/glass system, 4-venue data model, 5-question stakeholder survey, weighted alignment score, 4-act story, 6 Tier-1 vendors, spatial spotlight, brief export and concierge widget.

Full extraction: `SOURCE_COPY.md` and `content-inventory.json`.

## 3. Information architecture

| Primary tab | Purpose | Sub-tabs / states |
|---|---|---|
| Discover | Netflix-style landing and featured rotation | Featured · Venues · Events · Media |
| Venues | Compare six rentable spaces | All · Waterfront · Large format · Conference · Social |
| Event Types | Browse five event narratives | All · Celebrations · Daytime · After Dark · Weddings · School |
| Conferences | Dedicated meeting/conference/filming path | Overview · Builder · Filming · Maestro pipeline |
| Media Wall | Rotating galleries and video | All · Venues · Parties · Forum · Weddings · After Dark · School · Video |
| Source Copy | Faithful events-tab archive | Special Events · Facility Options · Resources · Video & Map |
| Upgrade Plan | Roadmap and acceptance criteria | Now · Next · Later |

The floor plan is a stylized interactive SVG derived from the 2026 PDF labels; hovering a venue card pulses its map hotspot. The official PDF remains the source of truth.

## 4. Design system

- **Atmosphere:** near-black `#050814`, layered with the original-site rental image, slow 30-second Ken Burns drift, blurred glass shards, cyan/gold aurora orbs and pointer-following spotlight.
- **Glass:** `rgba(255,255,255,.07–.13)`, 1px hairlines, 18–28px blur, inset highlights, 18–28px radii, soft shadow.
- **Netflix behavior:** horizontal card rails, oversized hover scale, rank numbers, “Play / Details” affordances, gradient legibility scrim, auto-advancing featured billboard.
- **Motion:** `cubeRotate` via `requestAnimationFrame`, mouse-tilt cards, auto-rotating media focus, shimmer on glass, bot workflow nodes. All decorative motion honors `prefers-reduced-motion`.
- **3D cube:** six glass faces; the uploaded Exploratorium logo was processed into a transparent PNG and embedded with `background-size: contain`, no black rectangle, fitted to each face. Drag the cube to rotate; it auto-rotates otherwise.
- **Typography:** system stack only; no web-font network dependency. Gold/cyan from the Maestro brief, restrained red for play/progress cues.

### Pinterest reference mapping

| Reference | Resolved pin | Interpretation |
|---|---|---|
''' + '\n'.join(f"| [{p['short']}]({p['short']}) | `{p['pin']}` | {p['role']} |" for p in PINTEREST) + f'''

Pinterest’s short links resolved to pin IDs but pin pages were not machine-readable to the fetcher; the implementation follows the explicit interaction descriptions in the brief.

## 5. Bot integration plan

### Knowledge base

- `content-inventory.json` → venues, capacities, event types, media, contact, brochures, map labels.
- `source/Maestro_AI_Executive_Event_Producer.html` → interaction grammar, not venue truth. Replace its four generic San Francisco institutions with the six Exploratorium spaces.
- Official 2026 map/brochure PDFs → authoritative floor plan and package details once licensed into the CMS.

### Runtime contract

```json
{{
  "intent": "match_venue | conference_brief | gallery_shortlist | contact_paths",
  "inputs": {{
    "guests": 250,
    "format": "theatre",
    "event_type": "conference",
    "constraints": ["daytime", "av", "bay_view"]
  }},
  "grounding": ["venues", "capacities", "map", "brochures", "official_form"],
  "output": {{
    "shortlist": ["..."],
    "reasons": ["..."],
    "open_questions": ["..."],
    "handoff": "{RENTALS}/form"
  }}
}}
```

### UI state machine

`idle → intake → capacity_check → curatorial_constraints → gallery_match → brief → human_handoff`. The bot panel animates all six nodes, streams a grounded answer, and never claims live availability or pricing. The conference builder passes guest count and format into `match_venue`; the widget also accepts free-text questions.

### Production API sketch

- `GET /api/venues` / `GET /api/venues/:id`
- `GET /api/events` / `GET /api/media?category=…`
- `GET /api/documents` (map, brochures, policies)
- `POST /api/bot/brief` → `{{intent, inputs, brief, citations, handoff}}`
- `POST /api/inquiries` → CRM / `events@exploratorium.edu`
- Cache CMS reads; keep bot tool calls server-side; log intent, matched venue IDs and handoff clicks.

## 6. Build phases

### Now — delivered in this prototype

- Faithful source copy and machine-readable extraction.
- Standalone glassmorphism UI with 7 primary tabs and 30 sub-tab states.
- Animated original-site-derived wallpaper, live mouseovers, Netflix rails, 3D glass cube with transparent cutout, rotating media wall, venue map hotspots, conference builder, bot-in-action animation.
- New Drive adaptation folder with this bundle.

### Next — production foundation

1. Move inventory into a headless CMS; normalize `venue / event / media / document / capacity / policy` schemas.
2. Replace local data URIs with responsive `AVIF/WebP` derivatives, lazy loading, CDN caching and explicit credits/alt text.
3. Replace the derived SVG map with a hotspot layer over the official PDF image; add deep links to each venue.
4. Implement the bot API with retrieval over approved documents, citations, PII boundaries and a human handoff.
5. Add analytics: rail impressions, hover-to-detail rate, venue comparisons, bot intents, brief exports, inquiry clicks.

### Later — scale and governance

- Availability/pricing integration, accessibility conformance (WCAG 2.2 AA), keyboard-only motion controls, multilingual (EN/HE) editorial workflow.
- A/B test hover previews vs. click-only cards; measure performance on low-power devices.
- Rights review for all photography, video and brand assets; archive annual PDF versions.
- Optional Vercel deployment once content/API ownership is confirmed.

## 7. Acceptance criteria

- [x] Events-tab copy preserved separately from the redesign.
- [x] Media texts, panel headings, cards, sub-tabs, video reference, images and map labels extracted.
- [x] Dedicated events / details / conferences UI.
- [x] Netflix-style glassmorphism and rotating galleries.
- [x] Animated glass wallpaper derived from original-site imagery in the background.
- [x] Live mouseovers, pointer light and card tilt.
- [x] Bot-in-action animation and scripted venue-grounded concierge.
- [x] 3D glass cube with transparent, background-free image fitted to its faces.
- [x] New folder created in the supplied Drive repository.
- [ ] Production CMS, licensed binaries, live availability and deployed bot API (next phase).

## 8. Guardrails

Capacities are “subject to change”; the bot must not invent price, date availability, catering rules or COI approval. The official inquiry form remains the conversion endpoint. The Maestro vendor roster is a generic SF model and is treated as interaction scaffolding, not as an approved Exploratorium vendor list.
'''
(ROOT / 'UPGRADE_PLAN.md').write_text(UPGRADE_PLAN, encoding='utf-8')

README = f'''# Exploratorium Events UI — adaptation bundle

**Main deliverable:** `index.html` — open it in the workspace viewer or download it. It is fully standalone: images, wallpaper, transparent cutout, styles and scripts are embedded.

**New Drive folder:** [Exploratorium Events UI · המשck התאמה · 2026-11-17]({DRIVE_FOLDER})  
`צור תקיה חדשה במאגר לצורך המשך התאמה` — בוצע. התיקייה נוצרה בתוך המאגר שסיפקת.

## Files

- `index.html` — interactive Sakshinhiro Model A demo / Netflix-style glass events OS.
- `events-tab-source.html` — faithful, minimal copy of only the Events / Special Events cards.
- `SOURCE_COPY.md` — exact source text, media URLs, capacities, map labels and proposed sub-tabs.
- `UPGRADE_PLAN.md` — IA, design system, bot contract, phased roadmap and acceptance criteria.
- `content-inventory.json` — machine-readable extraction for continued adaptation.
- `assets/` — 31 compressed local media stills, derived glass wallpaper, transparent logo cutout, official video poster.
- `source/` — the received Maestro AI HTML brief, original uploaded logo, and extracted venue-map notes.
- `build.py` — reproducible generator; `Exploratorium_Events_UI_bundle.zip` — portable archive.
- `openbot/` — the concierge as an AG-UI bot (`POST /agui`) with tools, tests, Dockerfile and a knowledge base generated from `content-inventory.json`.
- `docs/OPENBOT_INTEGRATION.md` — how to register the bot in CopilotKit OpenBot, policy, audit and deployment notes.
- `board/` — the project's task board in the repository: original HTML, extracted `board.json`, live `state.json`, append-only `activity.jsonl`.
- `docs/GIT_AND_DEPLOY.md` — repository history, GitHub publication and split deployment.

## Running the bot

```bash
cd openbot
npm test          # protocol, grounding and guardrail tests
npm run dev       # http://localhost:8787 — serves this prototype AND the AG-UI endpoint
```

The same service reads the task board, so the bot can answer "what is left before the hackathon?"
and record a tick-off with approval:

```bash
node board/scripts/extract-board.mjs            # rebuild board.json from the source HTML
curl -s localhost:8787/api/board                # progress, gate, countdown, next actions
```

With the service running, the Maestro panel in `index.html` streams live answers from the bot and
its status chip reads **● live AG-UI**. Without it (opened as a file, or offline) the panel falls
back to the scripted demonstration, so the page is always usable.

## Provenance

Primary source: [{RENTALS}]({RENTALS}) and its linked venue/event pages. Official reel: [{YOUTUBE}]({YOUTUBE}). 2026 map: [{MAP_PDF}]({MAP_PDF}). Attachment received as Maestro AI HTML rather than PDF; the official map PDF was fetched from the site.

Editorial text, images and marks belong to their respective owners. Prototype is for design adaptation; confirm rights, availability and pricing before production.
'''
# Hebrew typo in f-string above is corrected immediately for the actual output.
README = README.replace('המשck', 'המשך')
(ROOT / 'README.md').write_text(README, encoding='utf-8')

(ROOT / 'source' / 'venue-map-extracted.txt').write_text(
    'EVENT RENTALS AT THE EXPLORATORIUM\n\n'
    'San Francisco Bay | Fisherman\'s Wharf | BAY BRIDGE | San Francisco | Ferry Building | Moscone Center | Oracle Park\n\n'
    'Venue labels: Kanbar Forum; Osher West Gallery; Bechtel Central & Outdoor Gallery; Moore East Gallery; Fisher Bay Observatory & Terrace.\n'
    'Plan labels: PIER 17; PIER 15; Gallery 5 (2nd Floor); Gallery 6 (2nd Floor); Tactile Dome; Outdoor Observatory & Terrace; Bechtel Central Corridor; Osher West Crossroads; Moore East Gallery 1/2/3/4; Kanbar Forum Mezzanine (2nd Floor); Embarcadero; San Francisco Bay; N/W/E/S.\n'
    f'Footer: PIER 15 ON THE EMBARCADERO, SAN FRANCISCO | EXPLORATORIUM.EDU/RENTALS | 415.528.4500 // EVENTS@EXPLORATORIUM.EDU\nSource: {MAP_PDF}\n',
    encoding='utf-8'
)

# -----------------------------------------------------------------------------
# Standalone faithful events-tab copy
# -----------------------------------------------------------------------------
source_cards_html = '\n'.join(
    f'''<article class="source-card">
      <a href="{html.escape(c['url'])}" target="_blank" rel="noopener"><img src="{IMG[c['local']]}" alt="{html.escape(c['title'])}"></a>
      <div class="source-body"><h2>{html.escape(c['title'])}</h2><p>{html.escape(c['description'])}</p><a href="{html.escape(c['url'])}" target="_blank" rel="noopener">View source page →</a></div>
    </article>'''
    for c in SPECIAL_EVENT_CARDS
)
source_html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Events Tab — Source Copy | Exploratorium</title>
<style>
:root{{color-scheme:dark;--bg:#07101b;--line:rgba(255,255,255,.14);--muted:#b8c4d0;--gold:#dfaa5b}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:#f6f8fb;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}}
header{{padding:34px clamp(20px,5vw,70px);border-bottom:1px solid var(--line);background:linear-gradient(120deg,#07101b,#10243b)}}.kicker{{color:var(--gold);font-size:.75rem;letter-spacing:.18em;text-transform:uppercase}}h1{{margin:.25rem 0;font-size:clamp(2rem,5vw,4rem)}}.lede{{max-width:720px;color:var(--muted)}}main{{padding:clamp(20px,5vw,70px)}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:22px;max-width:1400px;margin:auto}}.source-card{{background:rgba(255,255,255,.055);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}}.source-card img{{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}}.source-body{{padding:20px}}h2{{font-size:1.15rem;margin:0 0 8px}}p{{color:var(--muted);margin:0 0 14px}}a{{color:#9dd8ff}}footer{{padding:24px clamp(20px,5vw,70px);border-top:1px solid var(--line);color:var(--muted)}}code{{overflow-wrap:anywhere;color:#cfe6ff}}
</style></head><body>
<header><div class="kicker">Archival copy · 2026-11-17</div><h1>Special Events</h1><p class="lede">Only the events tab / Special Events cards from <a href="{html.escape(RENTALS)}">{html.escape(RENTALS)}</a>. All card media and descriptions are preserved; local thumbnails are embedded for offline viewing.</p></header>
<main><div class="grid">{source_cards_html}</div></main>
<footer><p><strong>Video:</strong> original page video-player shell; official reel <a href="{html.escape(YOUTUBE)}">{html.escape(YOUTUBE)}</a>. <strong>Map:</strong> <a href="{html.escape(MAP_PDF)}">{html.escape(MAP_PDF)}</a>.</p><p>Contact: 415.528.4500 · <a href="mailto:events@exploratorium.edu">events@exploratorium.edu</a> · <a href="{html.escape(RENTALS)}/form">Rental Inquiry Form</a></p><p><code>{html.escape(HERO_IMG)}</code></p></footer>
</body></html>'''
(ROOT / 'events-tab-source.html').write_text(source_html, encoding='utf-8')

# -----------------------------------------------------------------------------
# Main interactive prototype
# -----------------------------------------------------------------------------
TEMPLATE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="pier15-bot-endpoint" content="">
<title>Exploratorium Events OS — Sakshinhiro Model A</title>
<style>
:root{
  --bg:#050713;--ink:#f5f8ff;--muted:#aebbd0;--line:rgba(255,255,255,.14);
  --glass:rgba(255,255,255,.075);--glass-2:rgba(255,255,255,.12);
  --gold:#dfaa5b;--cyan:#7cc4e8;--red:#ff4557;--violet:#9f78ff;
  --radius:24px;--blur:blur(24px);--shadow:0 28px 80px rgba(0,0,0,.48);
  --cutout:url("__CUTOUT__");--wall:url("__WALL__");--mx:50vw;--my:35vh;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;min-height:100vh;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow-x:hidden}
a{color:inherit;text-decoration:none}button,input,select{font:inherit}button{color:inherit}img{max-width:100%}
[hidden]{display:none!important}::selection{background:rgba(124,196,232,.35)}
.wallpaper{position:fixed;inset:0;z-index:-5;overflow:hidden;background:#050713}
.site-wall{position:absolute;inset:-9%;background-image:var(--wall);background-size:cover;background-position:center;filter:saturate(.9) contrast(1.05);transform:scale(1.08);animation:wallDrift 34s ease-in-out infinite alternate;opacity:.92}
.wallpaper::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at var(--mx) var(--my),transparent 0,rgba(5,7,19,.12) 28%,rgba(5,7,19,.72) 100%),linear-gradient(180deg,rgba(4,6,15,.38),rgba(4,6,15,.82));backdrop-filter:blur(2px)}
.wallpaper::after{content:"";position:absolute;inset:-40% -10%;background:repeating-linear-gradient(115deg,transparent 0 120px,rgba(190,225,255,.055) 121px 123px,transparent 124px 250px);transform:rotate(-7deg);animation:glassSlide 26s linear infinite;mix-blend-mode:screen}
@keyframes wallDrift{0%{transform:scale(1.08) translate3d(-1.5%,-1%,0)}100%{transform:scale(1.16) translate3d(1.5%,1.5%,0)}}
@keyframes glassSlide{to{transform:rotate(-7deg) translateX(-240px)}}
.orb{position:fixed;border-radius:50%;filter:blur(70px);opacity:.28;pointer-events:none;z-index:-4;animation:orbFloat 18s ease-in-out infinite alternate}
.orb.a{width:38vw;height:38vw;left:-8vw;top:8vh;background:#285e8c}.orb.b{width:30vw;height:30vw;right:-5vw;top:30vh;background:#8a5b34;animation-delay:-6s}.orb.c{width:24vw;height:24vw;left:45vw;bottom:-12vh;background:#4a2d7d;animation-delay:-11s}
@keyframes orbFloat{to{transform:translate3d(5vw,-5vh,0) scale(1.2)}}
.cursor-glow{position:fixed;width:360px;height:360px;left:0;top:0;border-radius:50%;pointer-events:none;z-index:1;background:radial-gradient(circle,rgba(124,196,232,.15),rgba(223,170,91,.07) 35%,transparent 68%);transform:translate3d(calc(var(--mx) - 180px),calc(var(--my) - 180px),0);mix-blend-mode:screen;transition:opacity .3s}
.glass{background:linear-gradient(135deg,rgba(255,255,255,.115),rgba(255,255,255,.045));border:1px solid var(--line);box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.16);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur)}
.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:18px;padding:14px clamp(18px,4vw,58px);background:rgba(5,8,18,.66);border-bottom:1px solid rgba(255,255,255,.1);backdrop-filter:blur(22px)}
.brand{display:flex;align-items:center;gap:13px;min-width:max-content}.brand-mark{width:54px;height:42px;background-image:var(--cutout);background-size:contain;background-repeat:no-repeat;background-position:center;filter:drop-shadow(0 0 12px rgba(255,255,255,.5))}
.brand b{display:block;font-size:.84rem;letter-spacing:.15em}.brand small{display:block;color:var(--muted);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase}
.top-actions{margin-left:auto;display:flex;gap:9px;align-items:center}.pill{border:1px solid var(--line);background:rgba(255,255,255,.06);padding:9px 14px;border-radius:999px;font-size:.78rem;letter-spacing:.04em;cursor:pointer;transition:.25s}.pill:hover{background:rgba(255,255,255,.16);transform:translateY(-2px)}.pill.primary{background:linear-gradient(135deg,#ff4557,#b31324);border-color:rgba(255,255,255,.24)}
.status{display:inline-flex;align-items:center;gap:7px;color:#c8d4e4;font-size:.72rem}.dot{width:7px;height:7px;border-radius:50%;background:#66e0a3;box-shadow:0 0 12px #66e0a3;animation:pulse 1.8s infinite}@keyframes pulse{50%{opacity:.35;transform:scale(.7)}}
main{position:relative;z-index:2;padding:0 clamp(18px,4vw,58px) 90px;max-width:1560px;margin:auto}
.hero{min-height:590px;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(360px,.92fr);gap:50px;align-items:center;padding:54px 0 38px}
.eyebrow{display:flex;gap:10px;align-items:center;color:var(--gold);font-size:.74rem;letter-spacing:.22em;text-transform:uppercase}.eyebrow:before{content:"";width:32px;height:1px;background:var(--gold)}
h1{font-size:clamp(3rem,7vw,7.2rem);line-height:.9;letter-spacing:-.065em;margin:18px 0 22px;font-weight:760;max-width:900px;text-wrap:balance}h1 em{font-style:normal;background:linear-gradient(100deg,#fff,#9ed7f5 52%,#dfaa5b);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-copy{font-size:1.08rem;color:#c5d1df;max-width:670px}.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}.btn{display:inline-flex;align-items:center;gap:9px;padding:13px 20px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.09);cursor:pointer;font-weight:650;transition:.25s}.btn:hover{transform:translateY(-3px);background:rgba(255,255,255,.17)}.btn.red{background:linear-gradient(135deg,#ff4052,#a50e21);border-color:rgba(255,255,255,.22)}.btn.ghost{background:transparent}.btn svg{width:18px;height:18px}
.meta-row{display:flex;flex-wrap:wrap;gap:9px;margin-top:24px}.chip{padding:7px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.05);font-size:.74rem;color:#d5deea}.chip b{color:var(--cyan)}
.feature-strip{display:grid;grid-template-columns:88px 1fr auto;gap:16px;align-items:center;margin-top:34px;padding:14px;border-radius:18px;max-width:730px}.feature-thumb{width:88px;height:56px;border-radius:10px;background-size:cover;background-position:center;border:1px solid var(--line)}.feature-text small{display:block;color:var(--gold);font-size:.67rem;letter-spacing:.16em;text-transform:uppercase}.feature-text strong{font-size:.98rem}.feature-index{color:var(--muted);font-size:.8rem}.feature-progress{grid-column:1/-1;height:2px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden}.feature-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--red),var(--gold));animation:progress 6s linear infinite}@keyframes progress{to{width:100%}}
.cube-stage{height:500px;display:grid;place-items:center;position:relative;perspective:1100px;border-radius:32px;overflow:hidden}.cube-stage:before{content:"";position:absolute;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(124,196,232,.18),transparent 68%);filter:blur(12px);animation:breathe 5s ease-in-out infinite alternate}@keyframes breathe{to{transform:scale(1.25);opacity:.45}}
.cube{width:240px;height:240px;position:relative;transform-style:preserve-3d;will-change:transform;cursor:grab}.cube:active{cursor:grabbing}.face{position:absolute;inset:0;border:1px solid rgba(205,235,255,.45);border-radius:16px;background:linear-gradient(135deg,rgba(200,235,255,.18),rgba(255,255,255,.035) 48%,rgba(124,196,232,.09));box-shadow:inset 0 0 35px rgba(255,255,255,.1),0 0 30px rgba(80,170,230,.18);backdrop-filter:blur(7px);display:grid;place-items:center;overflow:hidden}.face:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,.3),transparent 25%,transparent 70%,rgba(255,255,255,.12));pointer-events:none}.face:after{content:"";position:absolute;inset:14%;background-image:var(--cutout);background-size:contain;background-position:center;background-repeat:no-repeat;filter:drop-shadow(0 0 12px rgba(255,255,255,.65));opacity:.9}.face span{position:absolute;bottom:12px;left:0;right:0;text-align:center;font-size:.58rem;letter-spacing:.24em;color:rgba(235,245,255,.76);z-index:2}.f-front{transform:translateZ(120px)}.f-back{transform:rotateY(180deg) translateZ(120px)}.f-right{transform:rotateY(90deg) translateZ(120px)}.f-left{transform:rotateY(-90deg) translateZ(120px)}.f-top{transform:rotateX(90deg) translateZ(120px)}.f-bottom{transform:rotateX(-90deg) translateZ(120px)}
.cube-caption{position:absolute;bottom:26px;left:26px;right:26px;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:.74rem}.cube-caption b{color:#fff}.cube-ring{position:absolute;width:370px;height:370px;border:1px solid rgba(255,255,255,.09);border-radius:50%;transform:rotateX(70deg) rotateZ(15deg);animation:ring 16s linear infinite}@keyframes ring{to{transform:rotateX(70deg) rotateZ(375deg)}}
.tabbar{position:sticky;top:72px;z-index:15;display:flex;gap:6px;overflow:auto;padding:8px;margin:10px 0 32px;border-radius:18px;scrollbar-width:none}.tabbar::-webkit-scrollbar{display:none}.top-tab{flex:0 0 auto;border:0;background:transparent;color:#aebbd0;padding:11px 17px;border-radius:12px;cursor:pointer;white-space:nowrap;transition:.25s}.top-tab:hover{color:#fff;background:rgba(255,255,255,.07)}.top-tab[aria-selected=true]{color:#fff;background:linear-gradient(135deg,rgba(255,255,255,.19),rgba(124,196,232,.1));box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.panel{animation:panelIn .45s ease both}@keyframes panelIn{from{opacity:0;transform:translateY(12px)}}
.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:0 0 16px}.section-head h2{font-size:clamp(1.5rem,3vw,2.5rem);margin:0;letter-spacing:-.035em}.section-head p{color:var(--muted);margin:4px 0 0;max-width:600px}.count{color:var(--cyan);font-size:.76rem;letter-spacing:.1em;text-transform:uppercase}
.live-strip{display:flex;gap:14px;align-items:center;padding:12px 16px;border-radius:16px;margin-bottom:24px;min-height:72px}.live-thumb{width:86px;height:52px;border-radius:10px;background-size:cover;background-position:center;flex:0 0 auto}.live-strip small{color:var(--gold);font-size:.65rem;letter-spacing:.16em;text-transform:uppercase;display:block}.live-strip strong{display:block}.live-strip span{color:var(--muted);font-size:.82rem}.live-pulse{margin-left:auto;width:9px;height:9px;border-radius:50%;background:var(--red);box-shadow:0 0 18px var(--red);animation:pulse 1.4s infinite}
.rail-block{margin:30px 0}.rail{display:flex;gap:16px;overflow-x:auto;padding:8px 3px 20px;scroll-snap-type:x mandatory;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}.rail::-webkit-scrollbar{height:7px}.rail::-webkit-scrollbar-thumb{background:rgba(255,255,255,.22);border-radius:10px}.rail-card{position:relative;flex:0 0 clamp(220px,23vw,330px);height:210px;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:#101827;cursor:pointer;scroll-snap-align:start;transform-style:preserve-3d;transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s,border-color .28s}.rail-card img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.9) brightness(.82);transition:transform .5s,filter .3s}.rail-card:hover{transform:translateY(-7px) scale(1.035);z-index:4;box-shadow:0 30px 60px rgba(0,0,0,.55);border-color:rgba(255,255,255,.35)}.rail-card:hover img{transform:scale(1.08);filter:saturate(1.08) brightness(.94)}.rail-card:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(2,5,12,.92))}.rail-copy{position:absolute;left:16px;right:16px;bottom:14px;z-index:2}.rail-copy small{color:var(--gold);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase}.rail-copy h3{font-size:1.02rem;margin:4px 0 3px;line-height:1.15}.rail-copy p{margin:0;color:#c3cede;font-size:.74rem;display:none}.rail-card:hover .rail-copy p{display:block}.rank{position:absolute;top:8px;left:12px;z-index:2;font-size:2.8rem;font-weight:800;color:rgba(255,255,255,.2);letter-spacing:-.1em}.play-badge{position:absolute;right:12px;top:12px;z-index:3;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);opacity:0;transform:scale(.7);transition:.25s}.rail-card:hover .play-badge{opacity:1;transform:scale(1)}
.subtabs{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 20px}.subtab{border:1px solid var(--line);background:rgba(255,255,255,.05);border-radius:999px;padding:8px 13px;color:var(--muted);cursor:pointer;font-size:.78rem;transition:.2s}.subtab:hover{color:#fff}.subtab.active{background:rgba(124,196,232,.18);color:#fff;border-color:rgba(124,196,232,.5)}
.venue-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.venue-card{text-align:left;padding:0;overflow:hidden;border-radius:20px;cursor:pointer;transition:.28s;position:relative}.venue-card:hover{transform:translateY(-6px)}.venue-media{height:155px;background-size:cover;background-position:center;position:relative}.venue-media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(5,8,18,.9))}.venue-card h3{position:absolute;bottom:12px;left:16px;right:16px;margin:0;font-size:1.05rem;z-index:2}.venue-body{padding:15px 16px 18px}.venue-body p{color:var(--muted);font-size:.82rem;min-height:58px;margin:0 0 12px}.specs{display:flex;gap:7px;flex-wrap:wrap}.specs span{font-size:.68rem;padding:5px 8px;border-radius:7px;background:rgba(255,255,255,.07);color:#d7e2ef}.venue-card.active{outline:2px solid var(--cyan)}
.venue-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr);gap:20px;margin-top:30px}.map-card{padding:20px;border-radius:24px;min-height:380px}.map-card h3{margin:0 0 4px}.map-card p{color:var(--muted);font-size:.82rem;margin:0 0 12px}#floorplan{width:100%;height:auto;display:block}.hotspot rect{fill:rgba(255,255,255,.07);stroke:rgba(255,255,255,.35);transition:.2s}.hotspot text{fill:#dfeaf6;font-size:9px;letter-spacing:.04em}.hotspot.active rect,.hotspot:hover rect{fill:rgba(124,196,232,.38);stroke:#9edcff;filter:drop-shadow(0 0 8px #7cc4e8)}.hotspot{cursor:pointer}.inspector{padding:22px;border-radius:24px;min-height:380px}.inspector .mini-img{height:160px;border-radius:16px;background-size:cover;background-position:center;margin-bottom:15px}.inspector h3{margin:0 0 8px}.inspector dl{display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:.82rem}.inspector dt{color:var(--muted)}.inspector dd{margin:0;text-align:right}.inspector a{display:inline-block;margin-top:14px;color:var(--cyan)}
.event-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:18px}.event-card{border-radius:22px;overflow:hidden;cursor:pointer;transition:.28s;text-align:left;padding:0}.event-card:hover{transform:translateY(-6px) rotateX(1deg)}.event-card .event-img{height:190px;background-size:cover;background-position:center;position:relative}.event-card .event-img:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(5,8,18,.86))}.tag{position:absolute;top:12px;left:12px;z-index:2;font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;background:rgba(5,8,18,.62);border:1px solid var(--line);padding:6px 9px;border-radius:999px}.event-body{padding:18px}.event-body h3{margin:0 0 8px;font-size:1.15rem}.event-body p{margin:0;color:var(--muted);font-size:.84rem}.facts{display:flex;gap:6px;flex-wrap:wrap;margin-top:13px}.facts span{font-size:.67rem;color:#d9e5f1;border:1px solid var(--line);border-radius:999px;padding:5px 8px}
.conference-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:20px}.conference-copy{padding:26px;border-radius:24px}.conference-copy h3{margin:0 0 10px;font-size:1.6rem}.conference-copy p{color:#c3cede}.conference-copy ul{color:var(--muted);padding-left:20px}.builder{padding:24px;border-radius:24px}.field{display:grid;gap:7px;margin-bottom:15px}.field label{font-size:.75rem;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}.field input,.field select{width:100%;padding:12px 13px;border-radius:12px;border:1px solid var(--line);background:rgba(4,8,18,.55);color:#fff;outline:none}.field input:focus,.field select:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(124,196,232,.12)}.builder-result{margin-top:16px;padding:14px;border-radius:14px;background:rgba(124,196,232,.09);border:1px solid rgba(124,196,232,.25);font-size:.84rem;color:#d9ecf8;min-height:60px}.acts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.act{padding:14px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.045)}.act small{color:var(--gold)}.act b{display:block;font-size:.83rem;margin:4px 0}.act span{font-size:.72rem;color:var(--muted)}
.media-layout{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(0,1.2fr);gap:20px}.media-focus{padding:14px;border-radius:24px;position:sticky;top:150px;align-self:start}.focus-img{height:330px;border-radius:17px;background-size:cover;background-position:center;position:relative;overflow:hidden}.focus-img:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(2,4,10,.9))}.focus-caption{position:absolute;bottom:16px;left:18px;right:18px;z-index:2}.focus-caption h3{margin:0 0 4px}.focus-caption p{margin:0;color:#c7d3e1;font-size:.8rem}.focus-controls{display:flex;justify-content:space-between;align-items:center;padding:12px 4px 2px;color:var(--muted);font-size:.76rem}.round-btn{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.06);cursor:pointer}.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px}.media-tile{height:125px;border-radius:15px;overflow:hidden;position:relative;border:1px solid var(--line);cursor:pointer;background-size:cover;background-position:center;transition:.25s}.media-tile:after{content:attr(data-label);position:absolute;left:0;right:0;bottom:0;padding:18px 9px 8px;background:linear-gradient(transparent,rgba(0,0,0,.9));font-size:.68rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.media-tile:hover{transform:scale(1.05);z-index:3;border-color:var(--cyan);box-shadow:0 16px 40px rgba(0,0,0,.5)}.media-tile.video:before{content:"▶";position:absolute;z-index:2;left:50%;top:45%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,60,80,.85);font-size:.75rem}.media-tile.active{outline:2px solid var(--cyan)}
.source-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px}.source-panel{padding:22px;border-radius:24px}.source-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.source-item{border:1px solid var(--line);border-radius:17px;overflow:hidden;background:rgba(255,255,255,.045)}.source-item img{width:100%;height:135px;object-fit:cover;display:block}.source-item div{padding:13px}.source-item h3{font-size:.92rem;margin:0 0 6px}.source-item p{font-size:.76rem;color:var(--muted);margin:0 0 8px}.source-item a{font-size:.74rem;color:var(--cyan)}.source-aside{padding:22px;border-radius:24px}.source-aside h3{margin-top:0}.source-aside p,.source-aside li{color:var(--muted);font-size:.82rem}.source-aside code{font-size:.68rem;color:#b9d9ef;overflow-wrap:anywhere}
.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.plan-card{padding:22px;border-radius:22px}.plan-card .phase{font-size:.68rem;letter-spacing:.2em;color:var(--gold);text-transform:uppercase}.plan-card h3{margin:8px 0}.plan-card ul{padding-left:18px;color:var(--muted);font-size:.84rem}.acceptance{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:18px}.acceptance div{padding:10px 12px;border-radius:11px;background:rgba(102,224,163,.08);border:1px solid rgba(102,224,163,.2);font-size:.78rem;color:#d7f5e5}
footer{padding:30px clamp(18px,4vw,58px) 80px;border-top:1px solid var(--line);color:var(--muted);font-size:.78rem;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;background:rgba(4,6,14,.6)}
.modal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.72);backdrop-filter:blur(9px);padding:20px}.modal-card{width:min(920px,96vw);max-height:90vh;overflow:auto;border-radius:26px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr)}.modal-media{min-height:420px;background-size:cover;background-position:center}.modal-body{padding:28px;background:rgba(10,15,28,.88)}.modal-close{float:right;border:1px solid var(--line);background:rgba(255,255,255,.06);border-radius:50%;width:34px;height:34px;cursor:pointer}.modal-body small{color:var(--gold);letter-spacing:.16em;text-transform:uppercase}.modal-body h2{margin:10px 0;font-size:2rem;letter-spacing:-.04em}.modal-body p{color:#c4d0df}.modal-specs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:18px 0}.modal-specs div{padding:10px;border:1px solid var(--line);border-radius:11px;font-size:.78rem}.modal-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}
.bot-launcher{position:fixed;right:22px;bottom:22px;z-index:45;width:64px;height:64px;border-radius:22px;border:1px solid rgba(255,255,255,.28);background:linear-gradient(135deg,rgba(124,196,232,.3),rgba(223,170,91,.22));backdrop-filter:blur(18px);cursor:pointer;box-shadow:0 18px 50px rgba(0,0,0,.5);display:grid;place-items:center}.bot-launcher:before{content:"";position:absolute;inset:-7px;border-radius:26px;border:1px solid rgba(124,196,232,.35);animation:orbit 4s linear infinite}@keyframes orbit{to{transform:rotate(360deg)}}.bot-face{width:34px;height:30px;border:2px solid #e9f5ff;border-radius:10px;position:relative}.bot-face:before,.bot-face:after{content:"";position:absolute;top:9px;width:5px;height:5px;border-radius:50%;background:#9edcff;box-shadow:0 0 8px #9edcff}.bot-face:before{left:7px}.bot-face:after{right:7px}.bot-antenna{position:absolute;width:2px;height:8px;background:#e9f5ff;top:-10px;left:50%}.bot-antenna:after{content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:var(--gold);top:-4px;left:-2px;box-shadow:0 0 10px var(--gold)}
.bot-panel{position:fixed;right:22px;bottom:96px;z-index:46;width:min(390px,calc(100vw - 32px));border-radius:24px;overflow:hidden;transform-origin:bottom right;animation:botIn .25s ease both}@keyframes botIn{from{opacity:0;transform:translateY(15px) scale(.95)}}.bot-head{padding:16px 18px;display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--line);background:linear-gradient(120deg,rgba(124,196,232,.16),rgba(223,170,91,.1))}.bot-avatar{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);display:grid;place-items:center;background:rgba(255,255,255,.08)}.bot-head b{display:block}.bot-head small{color:var(--muted)}.bot-status{margin-left:auto;font-size:.66rem;color:#7ee7ae}.bot-stage{display:flex;justify-content:space-between;padding:14px 16px 8px;position:relative}.bot-stage:before{content:"";position:absolute;left:28px;right:28px;top:25px;height:1px;background:rgba(255,255,255,.14)}.bot-node{position:relative;z-index:2;text-align:center;color:#7f8da0;font-size:.56rem;letter-spacing:.04em;width:55px}.bot-node i{display:block;width:13px;height:13px;border-radius:50%;margin:0 auto 6px;background:#243149;border:1px solid rgba(255,255,255,.16);transition:.3s}.bot-node.active i{background:var(--cyan);box-shadow:0 0 16px var(--cyan);transform:scale(1.3)}.bot-node.done i{background:#66e0a3}.bot-beam{position:absolute;top:20px;left:28px;width:5px;height:5px;border-radius:50%;background:var(--gold);box-shadow:0 0 16px var(--gold);opacity:0}.bot-panel.running .bot-beam{opacity:1;animation:beam 3.6s linear infinite}@keyframes beam{to{left:calc(100% - 28px)}}.bot-log{height:235px;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:9px}.msg{max-width:88%;padding:10px 12px;border-radius:14px;font-size:.8rem;line-height:1.4}.msg.bot{background:rgba(255,255,255,.08);border:1px solid var(--line);align-self:flex-start}.msg.user{background:rgba(124,196,232,.22);align-self:flex-end}.msg.typing:after{content:"▋";animation:blink .7s steps(1) infinite}@keyframes blink{50%{opacity:0}}.quick{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 12px}.quick button{font-size:.68rem;padding:7px 9px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.05);cursor:pointer}.quick button:hover{background:rgba(255,255,255,.13)}.bot-form{display:flex;gap:8px;padding:12px 16px 16px;border-top:1px solid var(--line)}.bot-form input{flex:1;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:rgba(4,8,18,.6);color:#fff;outline:none}.bot-form button{padding:10px 13px;border-radius:12px;border:0;background:linear-gradient(135deg,var(--cyan),#4c8db6);color:#04101a;font-weight:700;cursor:pointer}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:70;padding:11px 16px;border-radius:999px;background:rgba(12,18,32,.9);border:1px solid var(--line);font-size:.78rem;opacity:0;transition:.3s;pointer-events:none}.toast.show{opacity:1;transform:translateX(-50%) translateY(-8px)}
@media(max-width:1050px){.hero{grid-template-columns:1fr;min-height:auto}.cube-stage{height:430px}.venue-layout,.conference-grid,.media-layout,.source-layout{grid-template-columns:1fr}.media-focus{position:relative;top:0}.plan-grid{grid-template-columns:1fr}.acts{grid-template-columns:repeat(2,1fr)}}
@media(max-width:680px){.topbar{padding:10px 14px}.brand small,.status{display:none}.top-actions .pill:first-child{display:none}main{padding-inline:14px}.hero{padding-top:28px}.cube-stage{height:390px}.cube{width:190px;height:190px}.f-front{transform:translateZ(95px)}.f-back{transform:rotateY(180deg) translateZ(95px)}.f-right{transform:rotateY(90deg) translateZ(95px)}.f-left{transform:rotateY(-90deg) translateZ(95px)}.f-top{transform:rotateX(90deg) translateZ(95px)}.f-bottom{transform:rotateX(-90deg) translateZ(95px)}.tabbar{top:62px}.feature-strip{grid-template-columns:70px 1fr}.feature-index{display:none}.feature-thumb{width:70px;height:48px}.modal-card{grid-template-columns:1fr}.modal-media{min-height:240px}.acceptance,.acts{grid-template-columns:1fr}.bot-panel{bottom:88px}.cursor-glow{display:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.001ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.001ms!important}}
</style>
</head>
<body>
<div class="wallpaper" aria-hidden="true"><div class="site-wall"></div></div>
<div class="orb a"></div><div class="orb b"></div><div class="orb c"></div><div class="cursor-glow" aria-hidden="true"></div>

<header class="topbar">
  <div class="brand"><div class="brand-mark" aria-hidden="true"></div><div><b>EXPLORATORIUM · EVENTS OS</b><small>Sakshinhiro Model A / adaptation study</small></div></div>
  <div class="top-actions"><span class="status"><i class="dot"></i> Venue data synced</span><a class="pill" href="board/source/agent-games-timeline.html" target="_blank" rel="noopener">Task board ↗</a><button class="pill" data-go="source">Source copy</button><button class="pill primary" data-open-bot>Ask Maestro</button></div>
</header>

<main>
  <section class="hero" aria-labelledby="hero-title">
    <div>
      <div class="eyebrow">Pier 15 · San Francisco · 2026</div>
      <h1 id="hero-title">Events, in <em>another dimension.</em></h1>
      <p class="hero-copy">A dedicated glass interface for private events, venue details and conferences at the Exploratorium — preserving the original rentals story while adding cinematic discovery, live galleries and a venue-grounded AI producer.</p>
      <div class="hero-actions">
        <button class="btn red" data-go="venues"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Explore spaces</button>
        <button class="btn" data-video="reel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/></svg>Play 56s reel</button>
        <a class="btn ghost" href="__RENTALS__/form" target="_blank" rel="noopener">Inquiry form ↗</a>
      </div>
      <div class="meta-row"><span class="chip"><b>6</b> rentable spaces</span><span class="chip"><b>3,500</b> max standing</span><span class="chip"><b>650+</b> exhibits</span><span class="chip">LEED platinum · Pier 15</span></div>
      <div class="feature-strip glass" aria-live="polite">
        <div class="feature-thumb" id="feature-thumb"></div>
        <div class="feature-text"><small id="feature-kicker">Featured collection</small><strong id="feature-title">Holiday Parties</strong><span id="feature-desc"></span></div>
        <div class="feature-index" id="feature-index">01 / 04</div>
        <div class="feature-progress"><i></i></div>
      </div>
    </div>
    <div class="cube-stage glass" aria-label="Rotating 3D glass cube with a transparent Exploratorium cutout">
      <div class="cube-ring" aria-hidden="true"></div>
      <div class="cube" id="cube" role="img" aria-label="Transparent background-free logo fitted to six rotating glass cube faces">
        <div class="face f-front"><span>VENUES</span></div><div class="face f-back"><span>MEDIA</span></div><div class="face f-right"><span>CONFERENCES</span></div><div class="face f-left"><span>GALLERIES</span></div><div class="face f-top"><span>PIER 15</span></div><div class="face f-bottom"><span>MAESTRO AI</span></div>
      </div>
      <div class="cube-caption"><span><b>Sakshinhiro Model A</b> · transparent cutout, fitted to cube</span><span>Drag to rotate · hover to pause</span></div>
    </div>
  </section>

  <nav class="tabbar glass" role="tablist" aria-label="Events OS sections">
    <button class="top-tab" role="tab" aria-selected="true" data-tab="discover">Discover</button>
    <button class="top-tab" role="tab" aria-selected="false" data-tab="venues">Venues</button>
    <button class="top-tab" role="tab" aria-selected="false" data-tab="events">Event Types</button>
    <button class="top-tab" role="tab" aria-selected="false" data-tab="conferences">Conferences</button>
    <button class="top-tab" role="tab" aria-selected="false" data-tab="media">Media Wall</button>
    <button class="top-tab" role="tab" aria-selected="false" data-tab="source">Source Copy</button>
    <button class="top-tab" role="tab" aria-selected="false" data-tab="upgrade">Upgrade Plan</button>
  </nav>

  <section class="panel" id="panel-discover" role="tabpanel">
    <div class="live-strip glass"><div class="live-thumb" id="live-thumb"></div><div><small>Live mouseover</small><strong id="live-title">Hover a title to preview</strong><span id="live-desc">Netflix-style rails respond to pointer position, tilt and selection.</span></div><i class="live-pulse"></i></div>
    <div class="rail-block"><div class="section-head"><div><h2>Featured for your next event</h2><p>Auto-rotating billboard · click any card for details.</p></div><span class="count">04 features</span></div><div class="rail" id="rail-featured"></div></div>
    <div class="rail-block"><div class="section-head"><div><h2>Spaces at Pier 15</h2><p>Six source venue cards, reimagined as a horizontal browsing rail.</p></div><span class="count">06 venues</span></div><div class="rail" id="rail-venues"></div></div>
    <div class="rail-block"><div class="section-head"><div><h2>Special events</h2><p>The events tab copy, preserved verbatim in the Source Copy tab.</p></div><span class="count">05 categories</span></div><div class="rail" id="rail-events"></div></div>
    <div class="rail-block"><div class="section-head"><div><h2>Continue watching · media</h2><p>Rotating gallery previews with live pointer spotlight.</p></div><span class="count">31 stills + reel</span></div><div class="rail" id="rail-media"></div></div>
  </section>

  <section class="panel" id="panel-venues" role="tabpanel" hidden>
    <div class="section-head"><div><h2>Venue details</h2><p>Filter by event fit; hover a card to illuminate its floor-plan zone. Capacities are subject to change.</p></div><span class="count">Official 2026 figures</span></div>
    <div class="subtabs" data-group="venues"><button class="subtab active" data-group="venues" data-filter="all">All</button><button class="subtab" data-group="venues" data-filter="waterfront">Waterfront</button><button class="subtab" data-group="venues" data-filter="large">Large format</button><button class="subtab" data-group="venues" data-filter="conference">Conference</button><button class="subtab" data-group="venues" data-filter="social">Social</button></div>
    <div class="venue-grid" id="venue-grid"></div>
    <div class="venue-layout">
      <div class="map-card glass"><h3>Interactive Pier 15 map</h3><p>Stylized from the official 2026 Rentals Map PDF. <a href="__MAP_PDF__" target="_blank" rel="noopener">Open source PDF ↗</a></p>
        <svg id="floorplan" viewBox="0 0 640 360" role="img" aria-label="Stylized interactive Exploratorium floor plan">
          <defs><linearGradient id="bay" x1="0" x2="1"><stop offset="0" stop-color="#0d2942"/><stop offset="1" stop-color="#143b5a"/></linearGradient></defs>
          <rect x="1" y="1" width="638" height="358" rx="18" fill="rgba(4,9,18,.65)" stroke="rgba(255,255,255,.12)"/>
          <path d="M0 0H640V72Q480 96 320 68T0 82Z" fill="url(#bay)" opacity=".65"/><text x="18" y="30" fill="#8cbfe0" font-size="11" letter-spacing="2">SAN FRANCISCO BAY / BAY BRIDGE</text>
          <path d="M78 318H570" stroke="rgba(255,255,255,.25)" stroke-width="10" stroke-linecap="round"/><text x="20" y="345" fill="#93a4b8" font-size="10">EMBARCADERO</text><text x="548" y="345" fill="#93a4b8" font-size="10">PIER 17 →</text>
          <g class="hotspot" data-venue="observatory"><rect x="462" y="92" width="150" height="76" rx="10"/><text x="474" y="112">FISHER BAY</text><text x="474" y="127">OBSERVATORY</text><text x="474" y="142">+ TERRACE</text></g>
          <g class="hotspot" data-venue="east"><rect x="405" y="178" width="115" height="88" rx="10"/><text x="417" y="202">MOORE</text><text x="417" y="217">EAST</text><text x="417" y="232">GALLERY</text></g>
          <g class="hotspot" data-venue="central"><rect x="250" y="158" width="145" height="108" rx="10"/><text x="264" y="184">BECHTEL CENTRAL</text><text x="264" y="199">&amp; OUTDOOR</text><text x="264" y="214">GALLERY</text></g>
          <g class="hotspot" data-venue="west"><rect x="100" y="158" width="140" height="108" rx="10"/><text x="114" y="184">OSHER WEST</text><text x="114" y="199">GALLERY</text><text x="114" y="214">TACTILE DOME</text></g>
          <g class="hotspot" data-venue="forum"><rect x="100" y="278" width="115" height="44" rx="10"/><text x="112" y="305">KANBAR FORUM</text></g>
          <g class="hotspot" data-venue="full"><rect x="250" y="278" width="362" height="44" rx="10"/><text x="264" y="305">FULL FACILITY &amp; GALLERY BUNDLES · PIER 15</text></g>
          <circle cx="603" cy="31" r="14" fill="none" stroke="rgba(255,255,255,.4)"/><text x="599" y="27" fill="#fff" font-size="8">N</text>
        </svg>
      </div>
      <aside class="inspector glass"><div class="mini-img" id="inspector-img"></div><small>Live inspector</small><h3 id="inspector-title">Full Facility & Gallery Bundles</h3><p id="inspector-desc" style="color:var(--muted);font-size:.84rem"></p><dl><dt>Square footage</dt><dd id="inspector-sqft">100,000</dd><dt>Seated</dt><dd id="inspector-seated">1,100</dd><dt>Standing</dt><dd id="inspector-standing">3,500</dd></dl><a id="inspector-link" href="__RENTALS__/full-facility-gallery-bundles" target="_blank" rel="noopener">Official venue page ↗</a></aside>
    </div>
  </section>

  <section class="panel" id="panel-events" role="tabpanel" hidden>
    <div class="section-head"><div><h2>Event Types</h2><p>Five source categories with detail-page facts and rotating media.</p></div><span class="count">05 narratives</span></div>
    <div class="subtabs" data-group="events"><button class="subtab active" data-group="events" data-filter="all">All</button><button class="subtab" data-group="events" data-filter="celebrations">Celebrations</button><button class="subtab" data-group="events" data-filter="daytime">Daytime</button><button class="subtab" data-group="events" data-filter="afterdark">After Dark</button><button class="subtab" data-group="events" data-filter="weddings">Weddings</button><button class="subtab" data-group="events" data-filter="school">School</button></div>
    <div class="event-grid" id="event-grid"></div>
  </section>

  <section class="panel" id="panel-conferences" role="tabpanel" hidden>
    <div class="section-head"><div><h2>Conferences & daytime production</h2><p>Dedicated path for meetings, conferences, trade shows and filming — grounded in the source daytime-meetings page.</p></div><span class="count">Builder + bot</span></div>
    <div class="conference-grid">
      <div class="conference-copy glass"><h3>Inspiration, offsite.</h3><p>Fisher Bay Observatory Gallery & Terrace and Kanbar Forum are offered daily for daytime business meetings, team building and seminars. Larger gallery spaces become available on closed Mondays and Tuesdays.</p><ul><li>Central Gallery: 500 theatre-style or 300 guests at rounds.</li><li>All meeting packages include museum admission during open hours.</li><li>Earlier load-in or Sunday-night load-in may be available for evening events.</li><li>Filming: waterfront views, educational settings, exhibits, interviews, demos and keynote speakers.</li></ul><div class="acts"><div class="act"><small>ACT I · 18:30</small><b>Reception</b><span>Biophilic welcome and sunset</span></div><div class="act"><small>ACT II · 19:45</small><b>Plenary</b><span>Circular amphitheater seating</span></div><div class="act"><small>ACT III · 20:45</small><b>Dinner</b><span>Candlelit royal tables</span></div><div class="act"><small>ACT IV · 22:30</small><b>Finale</b><span>Night salon / silent drone moment</span></div></div></div>
      <div class="builder glass"><h3 style="margin-top:0">Conference builder</h3><p style="color:var(--muted);font-size:.82rem">Set a scenario, then watch Maestro AI work through intake, capacity, constraints and handoff.</p><div class="field"><label for="guests">Guest count</label><input id="guests" type="number" min="20" max="3500" value="250"></div><div class="field"><label for="format">Room format</label><select id="format"><option value="theatre">Theatre / keynote</option><option value="rounds">Rounds / dinner</option><option value="reception">Standing reception</option><option value="cabaret">Cabaret / media</option></select></div><div class="field"><label for="window">Preferred window</label><select id="window"><option>Daytime · open hours</option><option>Monday / Tuesday · closed museum</option><option>Thursday · After Dark</option><option>Evening · gallery rental</option></select></div><button class="btn red" id="run-builder">Run Maestro match →</button><div class="builder-result" id="builder-result">Awaiting a scenario. No availability or pricing is implied.</div></div>
    </div>
  </section>

  <section class="panel" id="panel-media" role="tabpanel" hidden>
    <div class="section-head"><div><h2>Rotating media wall</h2><p>Hover a tile to pin the focus. Leave the wall to resume auto-rotation. The reel opens the official 56-second source video.</p></div><span class="count">31 assets</span></div>
    <div class="subtabs" data-group="media"><button class="subtab active" data-group="media" data-filter="all">All</button><button class="subtab" data-group="media" data-filter="venues">Venues</button><button class="subtab" data-group="media" data-filter="parties">Parties</button><button class="subtab" data-group="media" data-filter="forum">Forum</button><button class="subtab" data-group="media" data-filter="weddings">Weddings</button><button class="subtab" data-group="media" data-filter="afterdark">After Dark</button><button class="subtab" data-group="media" data-filter="school">School</button><button class="subtab" data-group="media" data-filter="video">Video</button></div>
    <div class="media-layout">
      <div class="media-focus glass"><div class="focus-img" id="focus-img"><div class="focus-caption"><h3 id="focus-title"></h3><p id="focus-caption"></p></div></div><div class="focus-controls"><button class="round-btn" id="media-prev">‹</button><span id="media-count"></span><button class="round-btn" id="media-next">›</button></div></div>
      <div class="media-grid" id="media-grid"></div>
    </div>
  </section>

  <section class="panel" id="panel-source" role="tabpanel" hidden>
    <div class="section-head"><div><h2>Faithful source copy</h2><p>Exact events-tab media texts and card links; other source panels are one click away.</p></div><span class="count">Archive · 2026-11-17</span></div>
    <div class="subtabs" data-group="source"><button class="subtab active" data-source="special">Special Events</button><button class="subtab" data-source="facilities">Facility Options</button><button class="subtab" data-source="resources">Resources</button><button class="subtab" data-source="videomap">Video & Map</button></div>
    <div class="source-layout"><div class="source-panel glass"><div class="source-grid" id="source-grid"></div></div><aside class="source-aside glass"><h3 id="source-aside-title">Source note</h3><div id="source-aside-copy"></div></aside></div>
  </section>

  <section class="panel" id="panel-upgrade" role="tabpanel" hidden>
    <div class="section-head"><div><h2>Upgrade plan</h2><p>From static long-form page to dedicated events OS with grounded bot integration.</p></div><span class="count">Now · Next · Later</span></div>
    <div class="plan-grid"><article class="plan-card glass"><span class="phase">Now / delivered</span><h3>Experience layer</h3><ul><li>7 primary tabs, 30 sub-tab states</li><li>Netflix rails and glassmorphism</li><li>Animated original-site wallpaper</li><li>Live mouseover, tilt, rotating cube</li><li>Bot-in-action and scripted concierge</li></ul></article><article class="plan-card glass"><span class="phase">Next / foundation</span><h3>Content & API</h3><ul><li>Headless CMS inventory</li><li>Responsive AVIF/WebP pipeline</li><li>Map hotspot layer over official PDF</li><li>Retrieval-grounded bot endpoints</li><li>Analytics and inquiry handoff</li></ul></article><article class="plan-card glass"><span class="phase">Later / governance</span><h3>Production scale</h3><ul><li>Live availability and pricing</li><li>WCAG 2.2 AA and bilingual EN/HE</li><li>Rights review and asset credits</li><li>A/B tests and performance budgets</li><li>Optional Vercel deployment</li></ul></article></div>
    <div class="acceptance"><div>✓ Events-tab copy preserved</div><div>✓ Media, panels, sub-tabs, video and images extracted</div><div>✓ Dedicated events / details / conferences UI</div><div>✓ Glass wallpaper + live mouseovers</div><div>✓ Bot animation + Maestro venue grounding</div><div>✓ Transparent image fitted to 3D cube</div><div>✓ New Drive adaptation folder</div><div>✓ Standalone / no external dependencies</div></div>
  </section>
</main>

<footer><span>Design adaptation study · source: <a href="__RENTALS__">exploratorium.edu/rentals</a> · 415.528.4500 · <a href="mailto:events@exploratorium.edu">events@exploratorium.edu</a></span><span>Sakshinhiro Model A · Netflix-style glass · Maestro AI · 2026</span></footer>

<div class="modal" id="modal" hidden><div class="modal-card glass"><div class="modal-media" id="modal-media"></div><div class="modal-body"><button class="modal-close" id="modal-close" aria-label="Close">×</button><small id="modal-kicker"></small><h2 id="modal-title"></h2><p id="modal-desc"></p><div class="modal-specs" id="modal-specs"></div><div class="modal-actions" id="modal-actions"></div></div></div></div>

<button class="bot-launcher" id="bot-launcher" aria-label="Open Maestro AI concierge" aria-expanded="false"><div class="bot-face"><i class="bot-antenna"></i></div></button>
<aside class="bot-panel glass" id="bot-panel" hidden aria-label="Maestro AI concierge">
  <div class="bot-head"><div class="bot-avatar">✦</div><div><b>Maestro AI</b><small>מפיק אירועים · Pier 15 mode</small></div><span class="bot-status" id="bot-status">● grounded</span></div>
  <div class="bot-stage" id="bot-stage"><div class="bot-beam"></div><div class="bot-node" data-step="0"><i></i>INTAKE</div><div class="bot-node" data-step="1"><i></i>CAPACITY</div><div class="bot-node" data-step="2"><i></i>RULES</div><div class="bot-node" data-step="3"><i></i>MATCH</div><div class="bot-node" data-step="4"><i></i>BRIEF</div><div class="bot-node" data-step="5"><i></i>HANDOFF</div></div>
  <div class="bot-log" id="bot-log"></div>
  <div class="quick"><button data-bot="match">Match a venue</button><button data-bot="conference">Conference brief</button><button data-bot="gallery">Gallery shortlist</button><button data-bot="contact">Contact paths</button></div>
  <form class="bot-form" id="bot-form"><input id="bot-input" autocomplete="off" placeholder="Ask about capacity, conferences, galleries…"><button type="submit">Send</button></form>
</aside>
<div class="toast" id="toast"></div>

<script>
const IMG = __IMG_JSON__;
const VENUES = __VENUES_JSON__;
const EVENTS = __EVENTS_JSON__;
const MEDIA = __MEDIA_JSON__;
const FEATURED = __FEATURED_JSON__;
const SOURCE = __SOURCE_JSON__;
const YOUTUBE = '__YOUTUBE__';
const FORM = '__RENTALS__/form';
const MAP = '__MAP_PDF__';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = {tab:'discover', featured:0, media:0, mediaPaused:false, selectedVenue:'full', guests:250, format:'theatre', botBusy:false};
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];

function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200)}
function go(tab){state.tab=tab;$$('.top-tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));$$('.panel').forEach(p=>p.hidden=p.id!=='panel-'+tab);window.scrollTo({top:Math.min(window.scrollY,270),behavior:'smooth'})}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
$$('.top-tab').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));

function renderFeatured(){const f=FEATURED[state.featured];$('#feature-thumb').style.backgroundImage=`url(${IMG[f.img]})`;$('#feature-kicker').textContent=f.kicker;$('#feature-title').textContent=f.title;$('#feature-desc').textContent=' · '+f.desc;$('#feature-index').textContent=String(state.featured+1).padStart(2,'0')+' / '+String(FEATURED.length).padStart(2,'0');const bar=$('.feature-progress i');bar.style.animation='none';void bar.offsetWidth;bar.style.animation='progress 6s linear infinite'}
setInterval(()=>{state.featured=(state.featured+1)%FEATURED.length;renderFeatured()},6000);renderFeatured();

function railCard(it,i,kind){return `<button class="rail-card tilt" data-kind="${kind}" data-id="${esc(it.id||it.title)}" style="background-image:none"><img src="${IMG[it.img]}" alt="${esc(it.title)}" loading="lazy"><span class="rank">${i+1}</span><span class="play-badge">▶</span><span class="rail-copy"><small>${esc(it.tag||it.cat||'Exploratorium')}</small><h3>${esc(it.title)}</h3><p>${esc(it.desc||it.caption||'')}</p></span></button>`}
function renderRails(){
  $('#rail-featured').innerHTML=FEATURED.map((x,i)=>railCard({...x,id:'feature-'+i,tag:x.tag,desc:x.desc},i,'feature')).join('');
  $('#rail-venues').innerHTML=VENUES.map((x,i)=>railCard({...x,id:x.id,tag:'Venue · '+x.seated+' seated',desc:x.desc},i,'venue')).join('');
  $('#rail-events').innerHTML=EVENTS.map((x,i)=>railCard({...x,id:x.id,tag:x.tag,desc:x.desc},i,'event')).join('');
  $('#rail-media').innerHTML=MEDIA.slice(0,14).map((x,i)=>railCard({...x,id:i,tag:x.cat,desc:x.caption},i,'media')).join('');
  setupTilt();setupLive();
}
renderRails();

function setupLive(){$$('.rail-card').forEach(card=>{card.addEventListener('mouseenter',()=>{let it=null;const id=card.dataset.id,kind=card.dataset.kind;if(kind==='venue')it=VENUES.find(v=>v.id===id);else if(kind==='event')it=EVENTS.find(v=>v.id===id);else if(kind==='media')it=MEDIA[Number(id)];else if(kind==='feature')it=FEATURED[Number(String(id).replace('feature-',''))];if(!it)return;$('#live-thumb').style.backgroundImage=`url(${IMG[it.img]})`;$('#live-title').textContent=it.title||it.name;$('#live-desc').textContent=it.desc||it.caption||'Click for the full glass detail panel.'})})}
function setupTilt(){$$('.tilt').forEach(el=>{if(el._tilt)return;el._tilt=1;el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform=`perspective(900px) rotateX(${-y*7}deg) rotateY(${x*9}deg) translateY(-7px) scale(1.035)`});el.addEventListener('pointerleave',()=>el.style.transform='')})}
document.addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--mx',e.clientX+'px');document.documentElement.style.setProperty('--my',e.clientY+'px')});

function renderVenues(){const grid=$('#venue-grid');grid.innerHTML=VENUES.map(v=>`<button class="venue-card glass tilt" data-venue="${v.id}" data-cats="${v.cats}" style="padding:0"><div class="venue-media" style="background-image:url(${IMG[v.img]})"><h3>${esc(v.name)}</h3></div><div class="venue-body"><p>${esc(v.desc)}</p><div class="specs"><span>${esc(v.sqft)} sq ft</span><span>${esc(v.seated)} seated</span><span>${esc(v.standing)} standing</span></div></div></button>`).join('');setupTilt();$$('.venue-card').forEach(c=>{c.addEventListener('mouseenter',()=>selectVenue(c.dataset.venue));c.addEventListener('click',()=>openDetail('venue',c.dataset.venue))});$$('.hotspot').forEach(h=>{h.addEventListener('mouseenter',()=>selectVenue(h.dataset.venue));h.addEventListener('click',()=>openDetail('venue',h.dataset.venue))});selectVenue('full')}
function selectVenue(id){const v=VENUES.find(x=>x.id===id)||VENUES[0];state.selectedVenue=id;$('#inspector-img').style.backgroundImage=`url(${IMG[v.img]})`;$('#inspector-title').textContent=v.name;$('#inspector-desc').textContent=v.desc;$('#inspector-sqft').textContent=v.sqft;$('#inspector-seated').textContent=v.seated;$('#inspector-standing').textContent=v.standing;$('#inspector-link').href=v.url;$$('.venue-card').forEach(c=>c.classList.toggle('active',c.dataset.venue===id));$$('.hotspot').forEach(h=>h.classList.toggle('active',h.dataset.venue===id))}
renderVenues();

function renderEvents(){const grid=$('#event-grid');grid.innerHTML=EVENTS.map(e=>`<button class="event-card glass tilt" data-event="${e.id}" data-cats="${e.cats}" style="padding:0"><div class="event-img" style="background-image:url(${IMG[e.img]})"><span class="tag">${esc(e.tag)}</span></div><div class="event-body"><h3>${esc(e.title)}</h3><p>${esc(e.desc)}</p><div class="facts">${e.facts.map(f=>`<span>${esc(f)}</span>`).join('')}</div></div></button>`).join('');setupTilt();$$('.event-card').forEach(c=>c.addEventListener('click',()=>openDetail('event',c.dataset.event)))}
renderEvents();

$$('.subtab[data-group]').forEach(b=>b.addEventListener('click',()=>{const g=b.dataset.group,panel=b.closest('.panel');$$('.subtab[data-group="'+g+'"]',panel).forEach(x=>x.classList.toggle('active',x===b));const f=b.dataset.filter;$$('[data-cats]',panel).forEach(card=>{card.style.display=(f==='all'||card.dataset.cats.split(',').includes(f))?'':'none'});if(g==='media')$$('.media-tile',panel).forEach(card=>{card.style.display=(f==='all'||card.dataset.cat===f)?'':'none'})}));

function renderMedia(){const grid=$('#media-grid');grid.innerHTML=MEDIA.map((m,i)=>`<button class="media-tile ${m.cat==='video'?'video':''}" data-media="${i}" data-cat="${m.cat}" data-label="${esc(m.title)}" style="background-image:url(${IMG[m.img]})" aria-label="${esc(m.title)}"></button>`).join('');$$('.media-tile').forEach(t=>{t.addEventListener('mouseenter',()=>{state.mediaPaused=true;setMediaFocus(Number(t.dataset.media))});t.addEventListener('click',()=>{const m=MEDIA[Number(t.dataset.media)];if(m.cat==='video')openVideo();else openDetail('media',t.dataset.media)})});setMediaFocus(0)}
function setMediaFocus(i){const list=MEDIA;state.media=(i+list.length)%list.length;const m=list[state.media];$('#focus-img').style.backgroundImage=`url(${IMG[m.img]})`;$('#focus-title').textContent=m.title;$('#focus-caption').textContent=m.caption+' · '+m.source;$('#media-count').textContent=String(state.media+1).padStart(2,'0')+' / '+list.length;$$('.media-tile').forEach(t=>t.classList.toggle('active',Number(t.dataset.media)===state.media))}
renderMedia();$('#media-next').onclick=()=>setMediaFocus(state.media+1);$('#media-prev').onclick=()=>setMediaFocus(state.media-1);$('#panel-media').addEventListener('mouseleave',()=>state.mediaPaused=false);setInterval(()=>{if(!state.mediaPaused&&state.tab==='media')setMediaFocus(state.media+1)},4800);

function renderSource(kind='special'){const data=SOURCE[kind];$('#source-grid').innerHTML=data.cards.map(c=>`<article class="source-item"><img src="${IMG[c.local]||IMG[c.localFallback]||IMG.video_poster}" alt="${esc(c.title)}"><div><h3>${esc(c.title)}</h3><p>${esc(c.description||c.detail||'')}</p><a href="${esc(c.url)}" target="_blank" rel="noopener">Original link ↗</a></div></article>`).join('');$('#source-aside-title').textContent=data.title;$('#source-aside-copy').innerHTML=data.aside}
$$('.subtab[data-source]').forEach(b=>b.addEventListener('click',()=>{$$('.subtab[data-source]').forEach(x=>x.classList.toggle('active',x===b));renderSource(b.dataset.source)}));renderSource();

function openDetail(kind,id){let it,kicker='',specs=[],desc='',actions='';if(kind==='venue'){it=VENUES.find(v=>v.id===id);kicker='Venue · '+it.sqft+' sq ft';desc=it.desc;specs=[['Seated',it.seated],['Standing',it.standing],['Map zone',it.map],['Official page','↗']];actions=`<a class="btn red" href="${esc(it.url)}" target="_blank" rel="noopener">Official venue page</a><button class="btn" data-bot="match">Ask Maestro</button>`}else if(kind==='event'){it=EVENTS.find(v=>v.id===id);kicker='Event type · '+it.tag;desc=it.desc;specs=it.facts.map((f,i)=>['Detail '+(i+1),f]);actions=`<a class="btn red" href="${esc(it.url)}" target="_blank" rel="noopener">Source page</a><button class="btn" data-bot="gallery">Gallery shortlist</button>`}else if(kind==='media'){it=MEDIA[Number(id)];kicker='Media · '+it.cat;desc=it.caption;specs=[['Source',it.source],['Collection','Exploratorium rentals']];actions=`<a class="btn red" href="${esc(it.source)}" target="_blank" rel="noopener">Open source</a>`}else if(kind==='feature'){it=FEATURED[Number(String(id).replace('feature-',''))];kicker=it.kicker;desc=it.desc;specs=[['Collection','Featured'],['Mode','Rotating billboard']];actions=`<button class="btn red" data-go="media">Open media wall</button>`}else return;$('#modal-media').style.backgroundImage=`url(${IMG[it.img]})`;$('#modal-kicker').textContent=kicker;$('#modal-title').textContent=it.title||it.name;$('#modal-desc').textContent=desc;$('#modal-specs').innerHTML=specs.map(s=>`<div><small style="color:var(--muted)">${esc(s[0])}</small><br>${esc(s[1])}</div>`).join('');$('#modal-actions').innerHTML=actions;$('#modal').hidden=false;wireModalActions()}
function openVideo(){$('#modal-media').style.backgroundImage=`url(${IMG.video_poster})`;$('#modal-kicker').textContent='Official moving-image reference';$('#modal-title').textContent='Exploratorium Event Rentals';$('#modal-desc').textContent='A 56-second official reel uploaded by the Exploratorium on 2019-05-03. The original rentals page exposes a video player; this preserved reel supplies the media-text and poster copy for the prototype.';$('#modal-specs').innerHTML='<div><small>Duration</small><br>00:56</div><div><small>Channel</small><br>Exploratorium</div>';$('#modal-actions').innerHTML=`<a class="btn red" href="${YOUTUBE}" target="_blank" rel="noopener">Play on YouTube ↗</a>`;$('#modal').hidden=false;wireModalActions()}
function wireModalActions(){$$('#modal [data-go]').forEach(b=>b.onclick=()=>{$('#modal').hidden=true;go(b.dataset.go)});$$('#modal [data-bot]').forEach(b=>b.onclick=()=>{$('#modal').hidden=true;runBot(b.dataset.bot)})}document.addEventListener('click',e=>{const c=e.target.closest('.rail-card');if(c)openDetail(c.dataset.kind,c.dataset.id)});$('[data-video="reel"]').onclick=openVideo;$('#modal-close').onclick=()=>$('#modal').hidden=true;$('#modal').onclick=e=>{if(e.target.id==='modal')$('#modal').hidden=true};document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#modal').hidden=true;$('#bot-panel').hidden=true}});

// 3D cube: continuous rotation, pointer drag and hover pause.
const cube=$('#cube');let rx=-17,ry=28,dragging=false,lastX=0,lastY=0,paused=false,hover=false;
function frame(){if(!dragging&&!paused&&!hover&&!matchMedia('(prefers-reduced-motion: reduce)').matches)ry+=.12;cube.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;requestAnimationFrame(frame)}
cube.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;cube.setPointerCapture(e.pointerId)});cube.addEventListener('pointermove',e=>{if(!dragging)return;ry+=(e.clientX-lastX)*.45;rx-=(e.clientY-lastY)*.45;rx=Math.max(-70,Math.min(70,rx));lastX=e.clientX;lastY=e.clientY});cube.addEventListener('pointerup',()=>dragging=false);cube.addEventListener('pointercancel',()=>dragging=false);cube.addEventListener('mouseenter',()=>hover=true);cube.addEventListener('mouseleave',()=>hover=false);frame();

// Maestro AI concierge.
const botPanel=$('#bot-panel'),botLog=$('#bot-log'),botLauncher=$('#bot-launcher');
function botMsg(text,who='bot',typing=false){const d=document.createElement('div');d.className='msg '+who+(typing?' typing':'');d.textContent=text;botLog.appendChild(d);botLog.scrollTop=botLog.scrollHeight;return d}
function toggleBot(force){const show=force??botPanel.hidden;botPanel.hidden=!show;botLauncher.setAttribute('aria-expanded',String(show));if(show&&!botLog.children.length)botMsg('Maestro AI is calibrated to the Pier 15 venue map, capacities, event types and official contact paths. Ask me to match a venue or build a conference brief.')}
botLauncher.onclick=()=>toggleBot();$$('[data-open-bot]').forEach(b=>b.onclick=()=>toggleBot(true));
function botStage(active){const nodes=$$('.bot-node');nodes.forEach(n=>{const i=Number(n.dataset.step);n.classList.toggle('active',i===active);n.classList.toggle('done',i<active)});botPanel.classList.toggle('running',active>=0&&active<nodes.length)}
function venueSuggestion(){const n=state.guests,f=state.format;if(f==='cabaret'&&n<=250)return VENUES.find(v=>v.id==='forum');if(n<=200&&f==='theatre')return VENUES.find(v=>v.id==='forum');if(n<=450&&f!=='reception')return VENUES.find(v=>v.id==='observatory');if(n<=1200)return VENUES.find(v=>v.id==='central');return VENUES[0]}
function runBot(action){if(state.botBusy)return;toggleBot(true);state.botBusy=true;botLog.innerHTML='';const n=Number($('#guests').value)||250;state.guests=n;state.format=$('#format').value;const v=venueSuggestion();let steps=[];if(action==='conference')steps=[`Intake: ${n} guests, ${state.format} format, ${$('#window').value}.`,'Capacity check: comparing 160–200 theatre, 500 theatre / 300 rounds, and up to 1,100 seated.',`Rule check: daytime packages include museum admission; Monday/Tuesday unlock larger galleries; load-in needs confirmation.`,`Shortlist: ${v.name} — ${v.sqft} sq ft; ${v.seated} seated / ${v.standing} standing.`,'Brief: a four-act flow can move from reception to plenary, dinner and a quiet finale.','Handoff: confirm date, pricing, approved catering and COI with the Events Team through the official form.'];else if(action==='gallery')steps=['Intake: building a visual shortlist from the extracted galleries.','Capacity check: filtering venue imagery by event scale.','Rule check: keeping original-site captions and source links attached.','Match: Holiday / Forum / Weddings / After Dark / East / West / Central collections.','Brief: open the Media Wall and hover tiles to pin a rotating focus.','Handoff: request original high-resolution assets and rights before production.'];else if(action==='contact')steps=['Intake: contact-path request.','Capacity check: not required.','Rule check: no pricing or live availability is exposed here.','Match: official phone, email and inquiry form.','Brief: 415.528.4500 · events@exploratorium.edu · /rentals/form.','Handoff: use the Rental Inquiry Form for availability and proposals.'];else steps=[`Intake: matching ${n} guests in ${state.format} format.`,`Capacity check: ${v.sqft} sq ft / ${v.seated} seated / ${v.standing} standing.`,`Rule check: capacities are subject to change; confirm load-in, catering and museum hours.`,`Match: ${v.name}. ${v.desc}`,`Brief: ${v.cats.includes('conference')?'Conference-ready AV or flexible plenary potential.':'Strong atmosphere and gallery flow for a social program.'}`,'Handoff: open the official venue page or send the inquiry form.'];
  const user=action==='conference'?'Build a conference brief':action==='gallery'?'Suggest galleries':action==='contact'?'Show contact paths':'Match a venue';botMsg(user,'user');let step=0;const tick=()=>{botStage(step);const t=botMsg('','bot',true);setTimeout(()=>{t.classList.remove('typing');t.textContent=steps[step];step++;if(step<steps.length)tick();else{botStage(steps.length);botMsg(`Recommended next step: ${v.url} · ${FORM}`,'bot');state.botBusy=false;if(action==='conference')$('#builder-result').innerHTML=`<b>${esc(v.name)}</b> is the capacity-first shortlist for ${n} guests / ${esc(state.format)}. Confirm availability, pricing and production rules with the Events Team.`}},520)};tick()}
$$('[data-bot]').forEach(b=>b.addEventListener('click',()=>{if(!b.closest('#modal'))runBot(b.dataset.bot)}));
$('#run-builder').onclick=()=>runBot('conference');
/* ---- Live concierge bridge -------------------------------------------------------------
   The scene above runs a scripted simulation so the file works offline. When the OpenBot
   integration is running (openbot/ has an AG-UI endpoint at POST /agui), typed questions are
   streamed from it instead, and the same six-node stage animates from the bot's own stage
   events. Nothing here is required for the offline demo: if the endpoint is absent or
   unreachable, the scripted answer below answers instead. */
const BOT_ENDPOINT = (() => {
  const meta = document.querySelector('meta[name="pier15-bot-endpoint"]');
  const configured = (meta && meta.content.trim()) || window.PIER15_BOT_ENDPOINT || '';
  if (configured) return configured.replace(/\/$/, '');
  return location.protocol.startsWith('http') ? location.origin : '';
})();
const STAGE_ORDER = ['intake','capacity_check','curatorial_constraints','gallery_match','brief','human_handoff'];
let botThread = 'thread-' + Math.random().toString(36).slice(2, 10);
const Pier15Live = { enabled:false, checked:false, endpoint: BOT_ENDPOINT };
function setBotStatus(text, live){const el=$('#bot-status');if(el){el.textContent=text;el.style.color=live?'#7ee7ae':'#c9b27f'}}
async function probeLive(){
  if(Pier15Live.checked||!BOT_ENDPOINT)return Pier15Live.enabled;
  Pier15Live.checked=true;
  try{
    const r=await fetch(BOT_ENDPOINT+'/healthz',{method:'GET',headers:{accept:'application/json'}});
    if(!r.ok)throw new Error('health '+r.status);
    const info=await r.json();
    Pier15Live.enabled=Boolean(info&&info.ok);
    if(Pier15Live.enabled)setBotStatus('● live AG-UI',true);
  }catch(e){Pier15Live.enabled=false;setBotStatus('● grounded (offline)',false)}
  return Pier15Live.enabled;
}
function applyCitations(list,handoff){
  if(!Array.isArray(list)||!list.length)return;
  const links=list.slice(0,4).map(c=>`<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>`).join(' · ');
  const d=document.createElement('div');d.className='msg bot';
  d.innerHTML=`<small style="opacity:.7;display:block;margin-bottom:6px">Sources &amp; handoff</small>${links}${handoff?`<br><a href="${esc(handoff)}" target="_blank" rel="noopener">Rental Inquiry Form ↗</a>`:''}`;
  botLog.appendChild(d);botLog.scrollTop=botLog.scrollHeight;
}
async function askLive(q){
  if(!(await probeLive()))return false;
  state.botBusy=true;botStage(0);
  const bubble=botMsg('','bot',true);let text='';let started=false;
  try{
    const res=await fetch(BOT_ENDPOINT+'/agui',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({threadId:botThread,runId:'run-'+Date.now().toString(36),messages:[{id:'m-'+Date.now().toString(36),role:'user',content:q}],state:{guests:Number($('#guests').value)||250,format:$('#format').value},forwardedProps:{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}})});
    if(!res.ok||!res.body)throw new Error('agui '+res.status);
    const reader=res.body.getReader();const dec=new TextDecoder();let buf='';
    while(true){
      const {value,done}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      let idx;
      while((idx=buf.indexOf('\n\n'))>=0){
        const frame=buf.slice(0,idx);buf=buf.slice(idx+2);
        const line=frame.split('\n').find(l=>l.startsWith('data:'));
        if(!line)continue;
        let ev;try{ev=JSON.parse(line.slice(5).trim())}catch(e){continue}
        if(ev.type==='CUSTOM'&&ev.name==='bot.stage'){botStage(ev.value.index);continue}
        if(ev.type==='TEXT_MESSAGE_CONTENT'){if(!started){bubble.classList.remove('typing');started=true}text+=ev.delta;bubble.textContent=text;botLog.scrollTop=botLog.scrollHeight;continue}
        if(ev.type==='CUSTOM'&&ev.name==='artifact.brief'&&ev.value){$('#builder-result').innerHTML=`<b>${esc(ev.value.anchorSpace.name)}</b> — ${esc(ev.value.guests)} guests, ${esc(ev.value.format)}. ${ev.value.openQuestions.length} open questions for the Events Team.`;continue}
        if(ev.type==='CUSTOM'&&ev.name==='artifact.board'&&ev.value&&ev.value.summary){const b=ev.value.summary;const d=document.createElement('div');d.className='msg bot';d.innerHTML=`<small style="opacity:.7;display:block;margin-bottom:6px">Task board · ${esc(b.event)}</small>${b.overall.done}/${b.overall.total} done (${b.overall.percent}%) · gate ${b.gate.passed}/${b.gate.total} · ${esc(b.countdown.hastaDeadline)} to deadline<br>${b.nextActions.slice(0,3).map(t=>`• ${esc(t.id)} ${esc(t.text.slice(0,54))}`).join('<br>')}<br><a href="board/source/agent-games-timeline.html" target="_blank" rel="noopener">Open the board ↗</a>`;botLog.appendChild(d);botLog.scrollTop=botLog.scrollHeight;continue}
        if(ev.type==='CUSTOM'&&ev.name==='artifact.citations'){applyCitations(ev.value.citations,ev.value.handoff);continue}
        if(ev.type==='RUN_ERROR')throw new Error(ev.message||'run error');
      }
    }
    if(!started){bubble.classList.remove('typing');bubble.textContent='The concierge returned no text for that question.'}
    botStage(STAGE_ORDER.length);state.botBusy=false;return true;
  }catch(err){
    bubble.remove();state.botBusy=false;setBotStatus('● grounded (offline)',false);Pier15Live.enabled=false;return false;
  }
}
window.Pier15Live=Pier15Live;
probeLive();
function offlineAnswer(q){
  const he=/[\u0590-\u05FF]/.test(q);
  let a='I can compare the six Pier 15 spaces, build a conference brief, shortlist galleries or provide the official contact paths. Capacities are from the 2026 source pages; availability and pricing must be confirmed with the Events Team.';
  if(/capacity|guests|כמה|קיבולת/i.test(q))a=`Use the Conference builder: Kanbar Forum seats 160–200, Central Gallery holds 500 theatre-style or 300 at rounds, and Full Facility reaches 1,100 seated / 3,500 standing.`;
  else if(/conference|meeting|כנס|ישיבה/i.test(q))a='For daytime meetings, start with Fisher Bay Observatory or Kanbar Forum. Larger gallery spaces are possible on closed Mondays and Tuesdays; Central Gallery supports 500 theatre-style.';
  else if(/gallery|image|photo|תמונה|גלריה/i.test(q))a='Open Media Wall: 31 stills plus the official 56-second reel are grouped into Venues, Parties, Forum, Weddings, After Dark, School and Video.';
  else if(/contact|email|phone|form|צור קשר/i.test(q))a='Official paths: 415.528.4500, events@exploratorium.edu, and the Rental Inquiry Form at /rentals/form.';
  if(he)a='מערכת Maestro מותאמת כעת לחללי Pier 15. '+a;
  return a;
}
$('#bot-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const q=$('#bot-input').value.trim();if(!q)return;
  $('#bot-input').value='';toggleBot(true);botMsg(q,'user');
  if(await askLive(q))return;
  setTimeout(()=>botMsg(offlineAnswer(q)),320);
});

// Source-copy panels.
$('[data-source="special"]').click();
</script>
</body></html>
'''

# JSON payloads for the JS runtime.
SOURCE_JS = {
    'special': {
        'title': 'Special Events — exact cards',
        'cards': [{**c, 'local': c['local']} for c in SPECIAL_EVENT_CARDS],
        'aside': '<p>These five titles and descriptions are copied from the source events tab. Each local thumbnail stands in for the exact source image URL.</p><p>Contact: <b>415.528.4500</b> · <a href="mailto:events@exploratorium.edu">events@exploratorium.edu</a>.</p>'
    },
    'facilities': {
        'title': 'Facility Rental Options',
        'cards': [{**c, 'local': c['local']} for c in FACILITY_CARDS],
        'aside': '<p>“At Pier 15, the museum is divided into galleries filled with exhibits ranging from mechanical contraptions to artworks highlighting the beauty of the physical phenomena that surround us.”</p><p>Galleries are available individually or in combination.</p>'
    },
    'resources': {
        'title': 'Rentals Resources',
        'cards': [
            {**RESOURCE_CARDS[0], 'description': 'Planning guidance and approved-vendor information.', 'local': 'holiday_moon'},
            {**RESOURCE_CARDS[1], 'description': 'Frequently asked rental questions.', 'local': 'east_3'},
            {**RESOURCE_CARDS[2], 'description': '2026 corporate brochure and map PDF.', 'local': 'pier_callan'},
            {**RESOURCE_CARDS[3], 'description': '2026 social / wedding packages PDF.', 'local': 'wedding_shadow_1'},
        ],
        'aside': '<p>Four resource cards from the original page. The prototype keeps the exact labels and links while giving each a local offline thumbnail.</p>'
    },
    'videomap': {
        'title': 'Video & map',
        'cards': [
            {'title': 'Official 56-second reel', 'description': 'Exploratorium Event Rentals · uploaded 2019-05-03 · music-led.', 'url': YOUTUBE, 'local': 'video_poster'},
            {'title': '2026 Pier 15 Rentals Map', 'description': 'Official PDF labels: Kanbar Forum, Osher West, Bechtel Central, Moore East, Fisher Bay Observatory, terraces, Tactile Dome, Embarcadero.', 'url': MAP_PDF, 'local': 'central_event'},
            {'title': 'Source hero poster', 'description': 'rentals-central-hero.jpg · used as the reference for the animated glass wallpaper.', 'url': HERO_IMG, 'local': 'holiday_marquee'},
        ],
        'aside': f'<p>The source page includes a video player whose embedded asset ID was not exposed. The official reel and its poster preserve the moving-image reference.</p><p>Map PDF: <a href="{MAP_PDF}" target="_blank" rel="noopener">open official document</a>.</p><p><code>{html.escape(HERO_IMG)}</code></p>'
    },
}

replacements = {
    '__CUTOUT__': CUTOUT,
    '__WALL__': WALL,
    '__IMG_JSON__': json.dumps(IMG, ensure_ascii=False, separators=(',', ':')),
    '__VENUES_JSON__': json.dumps(VENUE_DETAILS, ensure_ascii=False, separators=(',', ':')),
    '__EVENTS_JSON__': json.dumps(EVENT_TYPES, ensure_ascii=False, separators=(',', ':')),
    '__MEDIA_JSON__': json.dumps(MEDIA, ensure_ascii=False, separators=(',', ':')),
    '__FEATURED_JSON__': json.dumps(FEATURED, ensure_ascii=False, separators=(',', ':')),
    '__SOURCE_JSON__': json.dumps(SOURCE_JS, ensure_ascii=False, separators=(',', ':')),
    '__YOUTUBE__': YOUTUBE,
    '__RENTALS__': RENTALS,
    '__MAP_PDF__': MAP_PDF,
}
main_html = TEMPLATE
for token, value in replacements.items():
    main_html = main_html.replace(token, value)
(ROOT / 'index.html').write_text(main_html, encoding='utf-8')

# Portable zip archive.
bundle_path = ROOT / 'Exploratorium_Events_UI_bundle.zip'
if bundle_path.exists():
    bundle_path.unlink()
shutil.make_archive(str(bundle_path.with_suffix('')), 'zip', ROOT)

print('Generated:')
for p in sorted(ROOT.iterdir()):
    if p.is_file():
        print(f'  {p.name:48s} {p.stat().st_size:>10,d} bytes')
print(f'  assets/ {len(list(ASSETS.glob("*")))} files')
print(f'  source/ {len(list(SOURCE.glob("*")))} files')
