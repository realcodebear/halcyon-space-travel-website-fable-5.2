# The Landing Page Duel — Creative & Technical Brief

You are the **sole designer, copywriter, art director and front-end engineer** on this project. Another frontier AI model is receiving this exact same brief at the same moment. Both results will be judged side by side, harshly, on camera, by a professional reviewer. Build the best landing page you are capable of.

---

## 1. The client

**HALCYON** — the world's first private orbital hotel.

- A ring-shaped space station at 400 km altitude with 24 private suites, a panoramic observation deck ("The Cupola Lounge"), a zero-g spa and a Michelin-trained galley.
- Stays are **5 nights in orbit**, preceded by **10 days of training** at HALCYON's desert campus in Tabernas, Spain.
- Launches four times a year. First guest launch: **March 2028**. Price from **$1.8M per guest**.
- Founded by former astronauts and luxury-hotel operators. Safety partner: a (fictional) launch provider called **Meridian Launch Systems**.
- Everything about HALCYON is fictional — invent tasteful, plausible details, but no real people, no real company logos.

**Goal of the page:** get qualified, very wealthy visitors to **request a private consultation** (primary CTA) or **join the 2029 waitlist** (secondary CTA).

**Audience:** ultra-high-net-worth individuals, 35–70, who already own everything. They are allergic to hype, crypto energy, "rocket emoji" startup copy and stock-photo astronauts. They respond to restraint, craft, confidence and wonder — think Aman Resorts × Apple × a Kubrick film.

## 2. Voice & copy

- Calm, confident, sensory, precise. Short sentences. No exclamation marks. No buzzwords ("revolutionary", "game-changing", "next-level", "unleash").
- Write ALL copy yourself: headline, subheads, section copy, suite descriptions, FAQ answers, legal footer line. No lorem ipsum anywhere.
- Headline must be memorable in under 8 words.

## 3. Required sections (in this order, you design the layout)

1. **Hero** — full-viewport, cinematic. Headline, one-line subhead, primary CTA "Request a private consultation", secondary "Join the 2029 waitlist". Must feel breathtaking in the first 2 seconds.
2. **The View** — the emotional sell: 16 sunrises a day, Earth from the Cupola Lounge. Include the real fact that the station orbits Earth about every 90 minutes.
3. **The Journey** — a clear timeline: Training (10 days, Tabernas) → Launch → 5 nights in orbit → Return. Interactive or animated.
4. **The Suites** — at least 3 suite types with name, size, what makes it special, and "from" price.
5. **Life on board** — dining, zero-g spa, observation, research — a grid or bento layout.
6. **Safety & training** — reassuring, factual tone. At least 4 concrete safety points and some key numbers (animated counters welcome).
7. **Voices** — 3 short quotes from (clearly fictional) founding guests, first name + initial + city only.
8. **Pricing & availability** — 2–3 tiers or packages, what is included, a "seats remaining" indicator for the March 2028 launch.
9. **FAQ** — at least 6 questions, accessible accordion.
10. **Final CTA** — consultation request form: name, email, preferred launch window (select), message; client-side validation with friendly inline errors; a tasteful success state (no backend — fake the submit).
11. **Footer** — minimal, with nav, a newsletter field and a legal line.

Also: a **sticky header** that becomes solid on scroll, with anchor navigation and a CTA button; a mobile menu.

## 4. Art direction

- Dark, deep, cinematic. Palette of your choice, but it must feel expensive (not neon-cyberpunk, not NASA-generic).
- Typography matters: pair a distinctive display face with a clean text face (Google Fonts or system stacks are fine).
- Motion: tasteful and purposeful — scroll-triggered reveals, parallax or depth, at least one "wow" moment (e.g. an orbit/Earth visual, a cinematic hero, a scroll-driven sequence). Everything must respect `prefers-reduced-motion`.
- Generous whitespace, strong grid, pixel-level polish (alignment, spacing rhythm, hover/focus states).

## 5. Images — Higgsfield

- You may generate imagery with the **Higgsfield** tools available to you: image models, plus **Seedance 2.5** for video.
- Hard budget: **at most 8 image generations and at most 3 video generations total**. Choose models and prompts wisely; make the images feel like one coherent photographic series (same light, lens, grade).
- Download every image and video into `assets/` and reference it locally. Videos must be muted, compressed for the web, have a poster image, and never block the first paint. Optimise them (reasonable dimensions, modern formats like WebP/AVIF if you can, `width`/`height` attributes, lazy-loading below the fold, meaningful `alt` text).
- You may also build visuals in code (CSS, SVG, Canvas, WebGL) — encouraged for the wow moment.

## 6. Technical requirements

- Deliver in this directory: `index.html` plus any `css/`, `js/`, `assets/` you need. It must work when served by a plain static server (`npx serve .` or `python3 -m http.server`) — **no build step** required to run it. Libraries via CDN are allowed but keep them justified and light.
- Fully responsive and polished at **375px, 768px, 1280px and 1920px** widths. No horizontal scroll at any width.
- Semantic HTML, proper heading order, landmarks, keyboard navigable, visible focus states, WCAG AA contrast, labels on all form fields, accordion with correct ARIA.
- Performance: aim for Lighthouse Performance ≥ 90 and Accessibility ≥ 95 on desktop. No layout shift from late-loading images or fonts.
- SEO: title, meta description, Open Graph tags, favicon.
- **Zero console errors.** No broken links or missing assets.

## 7. How it will be judged (on camera)

Each page is scored out of 10 in each category by a critical reviewer, with Lighthouse, an accessibility scan, and screenshots at 375 / 768 / 1280 / 1920:

1. First impression / hero wow
2. Visual design & typography
3. Copywriting
4. Motion & interaction
5. Image quality & consistency
6. Responsiveness
7. Accessibility
8. Performance & technical quality
9. Faithfulness to this brief

Nothing counts that doesn't work. Test your own page in a browser before you declare it done.

## 8. When you are done

Print a short summary: the headline you chose, your concept in one sentence, which images and videos you generated (count + model), and anything you know is not finished.
