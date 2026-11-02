#!/bin/sh
# Academy suite: t145 flow, t144 journey, then the three classic-tour regressions (copies that write evidence to evidence_academy_regress).
cd "$(dirname "$0")/../../.." || exit 1
S="$1"   # scratchpad dir that holds acad_tests/
py -3 -B PHASE_NOTES/tools/p2/t145_academy_flow.py http://127.0.0.1:8802 9995 > PHASE_NOTES/evidence_academy/t145_out.txt 2>&1
py -3 -B PHASE_NOTES/tools/p2/t144_academy_journey.py http://127.0.0.1:8802 9996 PHASE_NOTES/CHECKPOINT_academy_stageA_study_lab_20261101 > PHASE_NOTES/evidence_academy/t144_out.txt 2>&1
for t in t41_q t42_q; do echo "== $t"; py -3 -B "$S/acad_tests/$t.py" 2>&1 | grep -E "^FAIL|SUMMARY|Traceback" | cut -c1-300; done
echo "== t20"; py -3 -B "$S/acad_tests/t20_academy_popups.py" http://127.0.0.1:8802 reg 2>&1 | grep -E "^FAIL|SUMMARY|Traceback" | cut -c1-300
