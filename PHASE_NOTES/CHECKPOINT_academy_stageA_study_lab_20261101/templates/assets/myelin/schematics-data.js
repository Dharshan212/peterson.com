// Chapter 2 fact tables, exported verbatim from SCIENCE_LAB/chapters.py (pure data). Do not edit by hand.
export const FACTS={
 "CHAPTER_TWO_ORGANS": [
  {
   "key": "sine",
   "title": "SINE",
   "subtitle": "Soft Intervention Nudge Escalation",
   "state": "ready"
  },
  {
   "key": "mine",
   "title": "MINE",
   "subtitle": "Messaging Intervention Nudge Escalation",
   "state": "ready"
  },
  {
   "key": "cosine",
   "title": "COSINE",
   "subtitle": "OTT / streaming intervention",
   "state": "ready"
  },
  {
   "key": "secant",
   "title": "SECANT",
   "subtitle": "Study off-task and recovery regulation",
   "state": "ready"
  },
  {
   "key": "cosecant",
   "title": "COSECANT",
   "subtitle": "Study-break return regulation",
   "state": "ready"
  }
 ],
 "COSECANT_BRANCH_FACTS": {
  "exact_target_note": "The exact Study resource is frozen as the return target before the break is admitted.",
  "admission_note": "A break request is parked until the next real Monitor observation confirms the exact return target. Study pauses only after admission succeeds.",
  "button_intent_note": "RETURN TO STUDY records intent only. It is never return evidence and never resumes Study.",
  "exact_resource_note": "Generic focus is not enough. Only the exact registered Study resource can release the lock.",
  "continuity_note": "Return confirmation requires three CONTINUOUS seconds -- not two sightings separated by a gap.",
  "loss_note": "Uncertain, stale, or mismatched evidence does not count and breaks confirmation.",
  "early_return_note": "Return can be verified from Break Complete or Break Already Over -- Final Lock is an escalation, not a mandatory stage.",
  "resume_boundary_note": "COSECANT confirms return; it does not resume Study itself. Monitor/coordinator resumes Study once confirmation completes."
 },
 "COSECANT_POPUP_FACTS": {
  "break_complete": {
   "label": "BREAK COMPLETE",
   "accent": "#39D98A",
   "headline": "BREAK COMPLETE",
   "message": "Your planned break has ended. Return to your registered Study task.",
   "status": "APPROVED BREAK COMPLETE · RETURN INTENT AVAILABLE",
   "buttons": [
    "RETURN TO STUDY"
   ]
  },
  "break_already_over": {
   "label": "BREAK ALREADY OVER",
   "accent": "#F5A623",
   "headline": "BREAK ALREADY OVER",
   "message": "Your planned break has been over for five minutes. Return to your registered Study task.",
   "status": "APPROVED BREAK OVERDUE · RETURN INTENT AVAILABLE",
   "buttons": [
    "RETURN TO STUDY"
   ]
  },
  "final_lock": {
   "label": "FINAL LOCK",
   "accent": "#FF4D6D",
   "headline": "COME BACK PLEASE",
   "message": "Open the exact registered Study resource. This protected notice closes only after observed return.",
   "status": "FINAL RETURN LOCK · WAITING FOR EXACT RESOURCE",
   "buttons": []
  },
  "return_confirming": {
   "label": "RETURN DETECTED",
   "accent": "#38BDF8",
   "headline": "RETURN DETECTED",
   "message": "Keep the exact registered Study resource present while COSECANT verifies the return.",
   "status": "FACTUAL RETURN DETECTED · VERIFYING CONTINUITY",
   "buttons": []
  }
 },
 "COSECANT_TIMING_FACTS": {
  "already_over_delay": "5:00",
  "final_lock_delay": "1:00",
  "return_confirmation_seconds": 3,
  "break_minimum_seconds": 60,
  "break_maximum_hours": 24
 },
 "COSINE_BRANCH_FACTS": {
  "return_intent_note": "An intention only -- not verified recovery. A new 5:00 window starts after acceptance.",
  "failed_return_note": "Continued OTT through the new window converts to a break-duration limit, not a legacy \"10 MORE MIN\" popup.",
  "yay_note": "Deadline already exists -- YAY acknowledges the break; it does not extend it.",
  "no_timeout_note": "There is no acknowledgement timeout of any kind.",
  "hide_milestone_note": "The 3-second hide is a milestone inside the 10-second return verification, not an extra interval before it.",
  "hopper_note": "Supported OTT platform switches remain inside the same COSINE episode.",
  "relapse_note": "An OTT relapse during recovery restores the same final callback -- it does not create a new one.",
  "study_preemption_note": "Study Mode has higher authority and can preempt COSINE.",
  "global_pause_note": "Global Pause freezes COSINE's effective clock."
 },
 "COSINE_PLATFORM_FACTS": [
  "Netflix",
  "Prime Video",
  "JioHotstar",
  "Disney+",
  "Hulu",
  "HBO Max",
  "Apple TV+",
  "Paramount+"
 ],
 "COSINE_POPUP_FACTS": {
  "intention": {
   "label": "INTENTION",
   "accent": "#38BDF8",
   "headline": "IT SEEMS YOU ARE INTERESTED TO WATCH THIS SHOW",
   "message": "",
   "buttons": [
    "SORRY, I'LL COME BACK",
    "YEAH, I WANT SOME BREAK"
   ]
  },
  "set_a_limit": {
   "label": "SET A LIMIT",
   "accent": "#38BDF8",
   "headline": "IT SEEMS YOU'D LIKE TO KEEP WATCHING.",
   "message": "LET'S SET A LIMIT.\nI'LL CALL YOU BACK WHEN YOUR BREAK IS OVER.",
   "context": "TRY TO KEEP IT TO ONE EPISODE.",
   "buttons": [
    "START WATCHING"
   ]
  },
  "break_length": {
   "label": "BREAK LENGTH",
   "accent": "#38BDF8",
   "headline": "HOW LONG WOULD YOU LIKE YOUR BREAK TO BE?",
   "message": "",
   "buttons": [
    "SET TIME"
   ]
  },
  "break_set": {
   "label": "BREAK SET",
   "accent": "#38BDF8",
   "headline": "ENJOY THE SHOW",
   "message": "I'LL CALL YOU BACK IN",
   "buttons": [
    "YAY"
   ]
  },
  "final_callback": {
   "label": "FOCUS",
   "accent": "#FF4D6D",
   "headline": "HOPE YOU ENJOYED THE SHOW.",
   "message": "NOW IT'S TIME TO FOCUS.",
   "buttons": []
  }
 },
 "COSINE_TIMING_FACTS": {
  "initial_gate": "5:00",
  "return_intent_window": "5:00",
  "break_minutes_min": 10,
  "break_minutes_max": 200,
  "final_callback_hide_seconds": 3,
  "return_verification_seconds": 10,
  "closure_confirmation_seconds": 60
 },
 "MINE_BRANCH_FACTS": {
  "neutral_pause_note": "Pauses. Does not reset.",
  "platform_switch_note": "Messaging platform switches remain inside the same MINE episode.",
  "early_return_note": "Returning early can begin recovery before MINE-2.",
  "recovery_owner_note": "MINE owns its own return-confirmation sequence. Recovery is not MIRL.",
  "relapse_note": "A relapse during recovery restores the same MINE-2 callback -- it does not create a new one.",
  "study_preemption_note": "Study Mode has higher authority and can preempt MINE.",
  "global_pause_note": "Global Pause freezes MINE's effective clock."
 },
 "MINE_STAGE_FACTS": {
  "mine_1": {
   "label": "MINE-1",
   "accent": "#F5A623",
   "headline": "IT SEEMS YOU HAVE STARTED USING A MESSAGING APP",
   "message": "BUT YOU HAVE IMPORTANT WORK — RETURN IF THIS IS NOT IMPORTANT.",
   "buttons": [
    "I WILL COME BACK",
    "IT'S IMPORTANT"
   ]
  },
  "mine_1_duration": {
   "label": "IT'S IMPORTANT",
   "accent": "#F5A623",
   "headline": "HOW MANY WHOLE MINUTES DO YOU NEED?",
   "message": "ENTER ANY VALUE FROM 5 THROUGH 30.",
   "buttons": [
    "SET IMPORTANT TIME"
   ]
  },
  "mine_2a": {
   "label": "MINE-2A",
   "accent": "#FF4D6D",
   "headline": "YOU SAID YOU WOULD COME BACK",
   "message": "YOUR IMPORTANT WORK IS WAITING.",
   "buttons": []
  },
  "mine_2b": {
   "label": "MINE-2B",
   "accent": "#FF4D6D",
   "headline": "YOUR IMPORTANT MESSAGING TIME IS OVER",
   "message": "IT IS TIME TO RETURN.",
   "buttons": []
  }
 },
 "MINE_TIMING_FACTS": {
  "initial_gate": "10:00",
  "return_intent_window": "13:15",
  "continuous_total": "23:15",
  "important_minutes_min": 5,
  "important_minutes_max": 30,
  "final_callback_hide_seconds": 3,
  "return_verification_seconds": 10,
  "closure_confirmation_seconds": 60
 },
 "SECANT_BOUNDARY_NOTE": "SECANT is the Study regulation / off-task recovery system. COSECANT is its approved-break branch in this conceptual map, with independent runtime authority. An approved COSECANT break is not ordinary SECANT off-task escalation.",
 "SECANT_TIMING_FACTS": {
  "supported_dwell": "5:00",
  "stage_2_delay": "+10:00",
  "stage_3_delay": "+13:15",
  "verification": "10 seconds",
  "confirmation": "60 seconds"
 },
 "SINE_STAGE_FACTS": {
  "sine_1": {
   "label": "SINE 1",
   "accent": "#3DDCFF",
   "headline": "Cognitive Drift Detected",
   "message": "The current resource reached its intervention threshold.",
   "buttons": [
    "I'M BACK",
    "NEED A BREAK"
   ],
   "display_seconds": 45
  },
  "sine_2": {
   "label": "SINE 2",
   "accent": "#F5A623",
   "headline": "Still Here?",
   "message": "You stepped away for a moment, but the loop pulled you back. Your focus window is still open.",
   "buttons": [
    "I'M BACK NOW"
   ],
   "display_seconds": 60
  },
  "sine_3": {
   "label": "SINE 3 · PROTECTED",
   "accent": "#FF4D6D",
   "headline": "Long Drift Detected",
   "message": "NO BUTTONS · AWAITING VERIFIED FOCUS RETURN",
   "buttons": [],
   "display_seconds": 600
  },
  "break_gate": {
   "label": "WELCOME BACK",
   "accent": "#39D98A",
   "headline": "Welcome back.",
   "message": "Not a SINE stage. Confirms return after a Normal Break.",
   "buttons": [
    "I'M BACK"
   ],
   "display_seconds": null
  }
 },
 "SINE_TIMING_FACTS": {
  "stage_1_to_2_baseline": "10:00",
  "stage_2_to_3_baseline": "13:15",
  "f_tooltip": "F is MYELIN's approved session personalization factor. SINE consumes the value supplied by the upstream behavioural timing model. If no valid learned factor exists, F = 1.0."
 }
};
