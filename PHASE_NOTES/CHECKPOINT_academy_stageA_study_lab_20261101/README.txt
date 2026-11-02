Academy Stage A: Study Mode teaching simulation, 2026-11-01. Main project Peterson.com. NOT deployed. Stage B not started.
New: templates/assets/myelin/study-lab-core.js, study-lab.js, study-lab.css; two link lines in templates/myelin_web_sample.html.
Rollback: restore PHASE_NOTES/backup_before_study_lab/myelin_web_sample.html, delete the three new files, rebuild dist (delete dist, run PHASE_NOTES/tools/build_equiv.py .). Previous checkpoint: CHECKPOINT_viewing_mode_20261101.
research.html here is the owners own later edit; restore only the myelin files if rolling back.
tests/: t143_study_lab.py (46/46) + study_lab_golden.py/json (real desktop calculator results); t141 and t142 with extended baselines.
