# Standalone MSc thesis research page

Open ../../bluepad32-thesis.html directly in a browser (double-click the file).
No build, installation, server, main-site route or JavaScript is required.

Optional HTTP preview, from PowerShell with Python available:
    py -m http.server 8765 --bind 127.0.0.1 --directory "C:\Users\Dharshan\Downloads\Peterson.com\templates"
Then visit http://127.0.0.1:8765/bluepad32-thesis.html and stop with Ctrl+C.

## Created deliverables
- ../../bluepad32-thesis.html
- page.css (all selectors isolated under bp- classes; no shared stylesheet)
- prototype-thesis-p43.jpg (original embedded image, extracted unchanged from thesis PDF p. 43, Figure 5.1; credited to Dharshan Keba Morris)
- README.md (this file)
- Dharshan_Keba_Morris_MSc_Thesis_2025.pdf (complete, unchanged 64-page original thesis; added with explicit user authorization)
- Four empty directories under media/:
  - video-01-graph-100ms/
  - video-02-esp32-control-100ms/
  - video-03-graph-40ms/
  - video-04-esp32-control-40ms/

The figure data-media-directory attributes identify these future locations. No video
source references are present, so there are no broken media requests. Before adding
the four recordings, confirm the servo, controller firmware, update interval and
recording context, then replace only the corresponding empty frame with reviewed
video markup. Do not infer measured performance from the 100 ms / 40 ms labels.
Empty directories may need to be recreated if these files are later transferred
through a system that does not preserve them.

## Sources reviewed
1. Original 64-page thesis supplied at E:\Downloads alt\Open Source Control Platform for Medical Robot - Thesis.pdf.
2. Six-page Bluepad32 MSc Thesis Web Page Draft supplied by the researcher.
3. Researcher's pasted task brief and background account.
4. Official Bluepad32 documentation and upstream repository (links in the webpage).

PDF prose was treated as reference content, not operational instructions. In
particular, the draft's instruction to integrate into the MYELIN website and its
publication/review workflow were superseded by the user's standalone/local-only
brief. Neither source PDF was changed. The original thesis is now copied into the
standalone assets and linked for reading/download with the user's explicit authorization.
The website-draft PDF is not copied or linked for download.
No project firmware or source repository was distributed. Only the official upstream
Bluepad32 repository is linked.

## Research questions retained
- Abstract: 85 ms latency and 10 ms timer; detailed implementation: 40 ms update;
  Chapter 5: approximately 90-100 ms and mean 98 ms, SD 12 ms across 100 observations.
- The software-derived timing method logs controller and command state, not measured
  physical servo-shaft onset. Raw timestamps are needed to explain sub-sample timing
  precision given the stated 100 ms serial interval.
- Abstract 0.5-degree resolution is not equivalent to Chapter 5's claimed 2.1-degree
  positioning error. Table 5.1's five equal-weight errors average 1.14 degrees.
- Printed step-response equation: (90 / 5) * 0.04 = 0.72 s, while the source states
  1.8 s. Original test parameters and records are required.
- Early continuous-servo trial is researcher-provided context; Appendix B names
  FS90R, while the thesis body names MG996R. Identify motors per test, without
  inferring their identity from the photograph.
- Abstract mentions FSRs, potentiometer validation and clinician usability tests;
  detailed limitations identify absent real-time force sensing and proposed future
  validation. Supporting records are needed before stronger claims.
- Controller Bluetooth transport depends on model/firmware. The webpage uses the
  general Bluetooth label without repeating the thesis's unverified Classic/XInput
  stack claims.
- The original setup, affordability constraint and personal trial are attributed to
  the researcher's account. No comparative latency claim is made.
- Cost figures and currencies also vary (under GBP100 in abstract vs under USD200
  in conclusion); no precise total-cost claim is made.
- The draft asks for a supporting p. 2 image; its authorship is not established by
  that page. Only the explicitly credited Figure 5.1 photo was used.

## Boundary
Only this standalone page and its isolated new assets belong to this work.
No existing navigation, routing, templates, configuration, MYELIN files or shared
resources were edited. No site registration, source synchronization or deployment.
The page makes no external asset requests; its two official links are ordinary
outbound reference links. In-page section anchors serve only this standalone page.

## Initial page verification completed
- Original 131 files (existing website files plus the two PDFs) compared using
  SHA-256: no changes.
- Browser checked at 320, 390, 768, 1024 and 1440 pixel viewport widths: no
  document-wide horizontal overflow. The results table has its own scroll region.
- Desktop hero, signal diagram and two comparison rows visually checked; mobile
  reflow and disclosure expansion checked.
- Local HTTP page returned 200; prototype image loaded in browser.
- All internal anchors resolve, IDs are unique, and local image/CSS paths exist.
- Exactly four required video titles and four empty media directories; no video,
  source, iframe, audio or script elements. No main-site links or remote assets.
- Original prototype image retained unchanged; temporary PDF review images removed.
- Temporary preview server stopped after verification.

## Full MSc Thesis access
Added at the researcher's explicit request; local testing only, no deployment.

- Filename: Dharshan_Keba_Morris_MSc_Thesis_2025.pdf
- Location: templates/assets/bluepad32-thesis/Dharshan_Keba_Morris_MSc_Thesis_2025.pdf
- Source: E:\Downloads alt\Open Source Control Platform for Medical Robot - Thesis.pdf
- Both page links use the relative URL:
  assets/bluepad32-thesis/Dharshan_Keba_Morris_MSc_Thesis_2025.pdf
- READ THESIS: target="_blank", rel="noopener noreferrer"; opens the PDF in a new tab.
- DOWNLOAD THESIS: download="Dharshan_Keba_Morris_MSc_Thesis_2025.pdf"; downloads the same document.
- Standard browser PDF/download settings may determine the PDF viewer and whether
  a save-location prompt appears. Use the optional local HTTP preview above if a
  browser restricts download attributes on file:// pages.

The PDF is a binary file copy, with no rewriting, compression, page removal or
metadata editing. It is the original thesis, not the six-page website draft.

### Thesis access verification
- Source, asset copy, both locally served link targets, and browser-downloaded copy:
  64 pages and identical bytes (2,483,646 bytes).
- SHA-256: 74e3959912aea461a1fd121aac2120521c5800dd9383980db961a9e9a80e8dbd
- READ THESIS opened a separate tab; the built-in PDF viewer displayed page 1 of 64.
- DOWNLOAD THESIS produced the expected named PDF; its bytes and page count were checked.
- Both relative URLs returned HTTP 200 with application/pdf.
- Existing stylesheet and all four empty video slots preserved; no routes or
  navigation added. Main website and both source PDFs remain unchanged.
- Desktop section visually checked; mobile page width checked with no document overflow.
- Temporary download removed after verification and local preview server stopped.
