"""Regenerates study_lab_golden.json: results of the REAL desktop calculator (COSECANT_STUDY_MODE/study_alignment.py, read-only reference, imported by file path, no bytecode written)
for a fixed set of cases. t143_study_lab.py compares the browser port (study-lab-core.js) against this file, so the tutorial arithmetic cannot drift from the accepted rules.
usage: py -3 study_lab_golden.py <path to study_alignment.py>   (defaults to the MYELIN_EDGE_TRIAL copy)"""
import sys, json, importlib.util, os
sys.dont_write_bytecode = True
SRC = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Dharshan\Downloads\MYELIN_GENALOGY\MYELIN_EDGE_TRIAL\COSECANT_STUDY_MODE\study_alignment.py"
spec = importlib.util.spec_from_file_location("study_alignment_ref", SRC); m = importlib.util.module_from_spec(spec); sys.modules["study_alignment_ref"] = m; spec.loader.exec_module(m)
NEURO = dict(subject="Neuroscience", task="Action potential lecture", keywords=["membrane", "sodium", "potassium", "signal", "channels"], important=["action potential", "neuron"])
CASES = []
def add(name, title, cert=True, exact=False, **over):
    c = {**NEURO, **over}; CASES.append({"name": name, "title": title, "cert": cert, "exact": exact, **c})
add("aligned", "Action Potential in a Neuron: Sodium and Potassium Channels Across the Membrane")
add("uncertain_partial", "Neuron Signal Basics: Sodium Explained")
add("off_mismatch", "Funny Cat Fails Compilation — Weekend Highlights")
add("uncertified_aligned", "Action Potential in a Neuron: Sodium and Potassium Channels Across the Membrane", cert=False)
add("single_keyword", "Neuron", )
add("no_important", "Sodium potassium membrane signal channels explained")
add("important_below_half", "Action sodium potassium membrane signal channels")
add("exact_task_allowed", "Khan Academy | Action potential lecture - Part 2", exact=True)
add("exact_task_not_allowed", "Khan Academy | Action potential lecture - Part 2", exact=False)
add("exact_task_uncertified", "Action potential lecture", cert=False, exact=True)
add("empty_title", "")
add("mismatch_legit", "Music therapy and the neuron", subject="Music Therapy", task="Neuron response", keywords=["therapy", "response"], important=["music", "neuron"])
add("suspicious_keyword", "Neuron action potential", keywords=["funny", "membrane"], important=["neuron"])
add("all_suspicious", "Neuron", keywords=["funny", "meme"], important=["gameplay"], subject="Chemistry", task="Reaction rates")
add("hyphen_apostrophe", "Hodgkin-Huxley model: the neuron's membrane", keywords=["hodgkin-huxley", "neuron's"], important=["membrane"])
add("digits", "Chapter 12 neuron lecture", keywords=["12"], important=["neuron"])
add("common_words_only", "the video of the study", keywords=["the", "study"], important=["video"])
add("multi_important", "Action potential neuron threshold", important=["action potential", "neuron", "threshold", "refractory"], keywords=["sodium"])
add("coverage_exactly_half", "Action potential sodium", important=["action potential", "neuron", "threshold"], keywords=["sodium"])
add("no_keywords", "Anything at all", keywords=[], important=[])
add("important_only_all", "Neuron membrane", keywords=[], important=["neuron", "membrane"])
add("penalty_cap", "Neuron membrane lofi music song", keywords=[], important=["neuron", "membrane"])
add("case_unicode", "NEURON — Action Potential (Hodgkin–Huxley)", keywords=["MEMBRANE"], important=["Neuron", "Action Potential"])
out = []
for c in CASES:
    ev = m.study_evidence(subject=c["subject"], task=c["task"], keywords=c["keywords"], important_keywords=c["important"], title=c["title"], identity_certified=c["cert"], allow_exact_task_match=c["exact"])
    out.append({**c, "expected": {"confidence": ev.confidence_percent, "caps": list(ev.safety_caps), "rawMatched": ev.raw_matched_points, "rawPossible": ev.raw_possible_points, "effMatched": ev.effective_matched_points,
        "effPossible": ev.effective_possible_points, "coreMatched": ev.core_matched_count, "corePossible": ev.core_possible_count, "penalty": ev.mismatch_penalty_percent, "suspicious": sorted(ev.suspicious_keywords),
        "basis": ev.alignment_basis, "reasons": list(ev.reasons), "kw": [[k.keyword, k.importance.value, k.points, k.matched] for k in ev.keyword_evidence]}})
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "study_lab_golden.json")
open(dst, "w", encoding="utf-8").write(json.dumps({"schema": m.ALIGNMENT_SCHEMA_VERSION, "source": "COSECANT_STUDY_MODE/study_alignment.py", "cases": out}, ensure_ascii=False, indent=1))
print("wrote", dst, len(out), "cases; schema", m.ALIGNMENT_SCHEMA_VERSION)
