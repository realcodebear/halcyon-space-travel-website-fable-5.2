# HALCYON: the first private hotel in orbit

A landing page for a fictional orbital hotel, built by Claude Fable 5.2 in one Claude Code session for a Code Bear video.

Live page: https://realcodebear.github.io/halcyon-space-travel-website-fable-5.2/

## How it was made

- Tool: Claude Code, model Fable 5.2, effort xhigh.
- Prompt: "Read BRIEF.md in this folder and build the landing page. You are the designer, copywriter and engineer. Make it world-class."
- The brief is in [BRIEF.md](BRIEF.md). It is the same brief Claude Opus 5.5 got in an earlier video, with one change: up to three Seedance 2.5 video clips were allowed.
- Build time: 1 hour 16 minutes.
- Images: 8 stills made with Nano Banana Pro on Higgsfield.
- Video: 3 clips made with Seedance 2.5 on Higgsfield. The model wrote the requests ([video_requests.json](video_requests.json)); I ran them by hand because its Higgsfield login could not use Seedance.

Nothing in this repo was edited by hand after the session ended, apart from this README.

## Run it

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Test results

- Lighthouse (desktop): 100 performance, 100 accessibility, 100 best practices, 100 SEO.
- axe-core: 0 violations.
- No console errors. No sideways scroll at 375, 768, 1280 and 1920 px.

## Known issues

- Tested in Chrome only.
- The lounge film plays once and does not loop.
- The copy says you are never more than an hour from the next sunrise. The live counter can show up to 90 minutes.
- The mobile menu numbers skip 06.

## Note

HALCYON, Meridian Launch Systems and every guest quote are fictional. The images and video are AI generated.
