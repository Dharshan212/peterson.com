# Automated Anesthesia Control System With Patient Monitoring

Academic research page for the five-author undergraduate team project, published
in Journal of Positive School Psychology, 2022, volume 6, issue 7, pp. 780-784.

## Source and verified bibliography
- Source PDF: C:\Users\Dharshan\Downloads\document2.pdf (5 pages; unchanged).
- Authors, in published order: Dr R. Anitha, B. Nivetha, R. Abinaya,
  M. Dharshan Keba and S. A. Sree Vishwa.
- Institution: Department of Biomedical Engineering, Jerusalem College of
  Engineering, Narayanapuram, Chennai, India.
- Publisher: https://journalppw.com/index.php/jpsp/article/view/11174
- Publication date on publisher page: 31 August 2022.
- Bibliography and figure credits checked against the supplied paper.

## Evidence and wording
The page distinguishes design descriptions from experimental validation.
Automatic motor stopping on abnormal readings is future work, following the
researcher's explicit clarification and the paper's conclusion.
No dosing-accuracy, clinical-effectiveness, patient-safety or validated-alarm claim.
No invented datasets, measurements, videos or device-response simulations.
M. Dharshan Keba is one of five coauthors; the paper gives no individual roles.
The motor is described generically as a motor-driven mechanism; no model or
performance is inferred from the photograph.

## Figures and reuse
All three figures come from PDF page 4 / journal page 783, extracted unchanged:
- figure-07-patient-monitoring.png: published Figure 7.
- figure-08-syringe-setup.jpg: published Figure 8.
- figure-09-prototype.jpg: published Figure 9, labelled Output.

Publisher copyright and open-access policies checked on 30 October 2026:
https://journalppw.com/index.php/jpsp/copyright
https://journalppw.com/index.php/jpsp/openaccess
They state that articles and figures are licensed under CC BY 4.0, with attribution.
https://creativecommons.org/licenses/by/4.0/
The webpage credits the authors, original figures, article and license.
The new architecture is an explanatory adaptation of Figures 7-8 and the text:
keypad input follows the methodology; alerts are included from the introduction;
automatic stopping is explicitly excluded from validated capabilities.
No copy of the full PDF is distributed through the website.

## Files
- ../../anesthesia-control-research.html
- page.css (isolated ac- selectors, no shared stylesheet changes)
- figure-07-patient-monitoring.png
- figure-08-syringe-setup.jpg
- figure-09-prototype.jpg
- README.md

## Local access
The page and relative assets work as standalone files and through Flask.
Standalone: open ../../anesthesia-control-research.html in a browser.
Optional static preview:
  py -m http.server 8877 --bind 127.0.0.1 --directory "C:\Users\Dharshan\Downloads\Peterson.com\templates"
  http://127.0.0.1:8877/anesthesia-control-research.html

Flask follows the site's existing route conventions:
- /anesthesia-control-research.html
- /assets/anesthesia-control/<path:filename>
The second Research card links to anesthesia-control-research.html.
The first and third cards, Bluepad32 page/assets, MYELIN content, Publications,
shared styling and existing routes are outside this change.
No deployment, hosting registration or static MYELIN build changes.

## Local verification completed
- Standalone page tested before the second card was connected.
- Page checked at 320, 390, 768, 1024 and 1440 px: no document-wide overflow.
  The evidence table has a dedicated horizontal scroll region on small screens.
- Desktop hero/architecture and mobile hero/architecture/card visually inspected.
- All three original figure assets loaded; extracted bytes match the source PDF.
- Section anchors resolve and IDs are unique; HTML, CSS and figures returned HTTP
  200 through the actual Flask application with the expected MIME types.
- Second-card navigation tested on desktop and mobile; Browser Back returns to
  Research, and the new page's Research portfolio link works.
- READ PUBLISHED PAPER opened the correct live publisher page in a new tab;
  title and five-author list confirmed. Citation checked against PDF pp. 780-784.
- Fictional sEMG, adaptive LDA, 6-DoF and 12-amputee claims removed from the
  second card; its unsupported completion percentage was removed.
- Main page CSS, navigation, source outside the second card, first/third cards
  and all pre-existing routes unchanged.
- Bluepad32 source/assets unchanged, four video slots still empty, and both PDF
  links retained; its Flask PDF route returned the complete original 64 pages.
- Homepage, About, CV, Publications, Contact and MYELIN routes returned HTTP 200.
- No browser console errors on the new page. Scoped asset routing rejects
  parent-directory traversal. No source PDF copy is hosted and no deployment ran.
- Temporary local Flask server stopped after testing.

Source PDF SHA-256: 39c0cae96ced768f904129162096a809fff8ed169c9a29541237f67fabe4ea92
