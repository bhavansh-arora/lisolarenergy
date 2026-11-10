# Lithium — Power for life

A multi-page marketing site and quote funnel for **Lithium LLC** (Yucaipa, CA): solar, battery backup, panel upgrades and EV charging. Built by Code Bunny as a redesign preview of lisolarenergy.com.

Live preview: https://lisolarenergy.codebunny.net (GitHub Pages, served from the root of `main`).

The finished site is the HTML pages and `assets/` folder at the repo root: plain HTML, CSS and JS with no server code, so any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages, cPanel). `.nojekyll` tells GitHub Pages to serve the files as they are.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Home: full-photo hero with quick-start quote, stats strip, word marquee, “why Lithium” statement, big numbers, service bento, live savings calculator, 25-year payback bars, pinned horizontal “four reasons” cards, interactive day-on-a-solar-home player, stacked step cards, testimonial tabs |
| `residential.html` | Photo hero, house with tappable hotspots, home services with photos, why storage matters under NEM 3.0, pull quote, FAQ |
| `commercial.html` | Services with a sticky photo that changes as you read, business case, subcontracting for contractors, FAQ |
| `process.html` | The six steps with typical timing and what the customer does at each one, live tracker preview, general FAQ |
| `savings.html` | Full calculator with editable assumptions, 25-year cost chart (hover + table view) |
| `about.html` | Story, stats, values, expertise, equipment partners |
| `quote.html` | 7-step quote funnel: live estimate, autosave and resume, ZIP check, site-visit time request, confirmation with tracking code and calendar file |
| `track.html` | Project tracker: look up a project by code + ZIP. Includes a sample project (`LI-SAMPLE`, ZIP `92399`) |
| `contact.html` | Phone, email and map cards, contact form |
| `privacy.html`, `404.html` | Privacy notice and not-found page |

## Run it locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Editing content

Pages are written in `src/pages/*.html` and share the header, footer and closing call-to-action from `src/partials/`. After editing, rebuild from the repo root:

```bash
node build.mjs
```

That writes the finished pages into the repo root. CSS, JS, images and fonts live directly in `assets/` and need no build.

## Going live: connect the forms

Edit `assets/js/config.js`:

- `formEndpoint`: any URL that accepts a JSON `POST` (Formspree, HubSpot, GoHighLevel, a Zapier or Make webhook, or a CRM). Quote and contact submissions are sent there.
  Until it is set, submissions open a pre-filled email to `leadEmail` so nothing is lost.
  If the endpoint fails, the visitor sees a one-tap email fallback, never a fake success.
- `trackEndpoint`: optional URL that returns a project as JSON for `?code=&zip=`. Until it is set, the tracker shows projects created on the same device plus the sample project. See `assets/js/track.js` for the expected shape.

The quote payload includes: tracking code, property type, monthly bill, goals, ownership, roof shade, timeline, address, requested day and time window (or "call me first"), name, phone, email, preferred contact method, and the estimate.

## Savings model

`assets/js/calc.js` holds every assumption: rate $0.34/kWh, 5.6 peak sun hours, 80% system efficiency, $3.10/W installed, 3% yearly utility increase, 0.5% yearly panel degradation, 410 W panels. All results are labeled as estimates before incentives.

## Design and motion

- Dark design in `assets/css/site.css`: ink background with rounded colour panels (forest, navy, ember), one gold accent, Inter Tight for headlines and text, Instrument Serif italic for the gold accent words, Geist Mono for small labels. All fonts are self-hosted.
- Gold announcement ticker, photo heroes with a stats strip, outline section numbers, a giant word marquee that speeds up with scrolling, closing call-to-action with three “why now” cards, and a footer with a large gold wordmark whose letters rise in.
- No animation libraries. `assets/js/main.js` handles headline words rising in, fade-up reveals, statements that light up word by word, photo parallax, count-ups, the pinned horizontal cards (desktop) and swipe cards (phone), the home calculator and payback bars, the FAQ, tabs and the mobile menu.
- Page changes use the browser's native cross-fade (View Transitions) where supported.
- `assets/js/house.js` holds the illustrative energy model behind the house player and hotspots (8.2 kW system, 13.5 kWh battery).
- `prefers-reduced-motion` turns off motion. Without JavaScript all content is still visible.

## Credits

- Photography: Unsplash (free to use under the Unsplash License).
- Fonts: Inter Tight, Instrument Serif and Geist Mono (SIL Open Font License), self-hosted.
- Logo and testimonials: Lithium LLC's existing website.
