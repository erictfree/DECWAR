# Combat recipient selection

PRIDIS (DECWAR.FOR:3055–3070) excludes only positive ALIVE values, not zero.
Destroyed ships have ALIVE=0 (e.g.4163); FREE sets1 at1137. A commissioned
ship uses logical true (negative; see RSTART1147). Thus translating selection
as only currently alive ships would lose death reports. This is expressed in
the specification's lifecycle terms rather than historical flag values.

PHACON:2697–2748 uses resolved target coordinates. TORP:4310–4383 uses impact
coordinates for local hits and attacker bits for misses/unaffected stars/
black holes/friendly neutralization. NOVA:2309–2353 selects around the stored
post-JUMP target location. JUMP does not update stored position on black-hole
death; this differs from its recorded displacement destination.

Base distress/destruction calls select a faction across distance100 then mask
NOMSG; RADIO:3173–3177 confirms this means radio-off. Local hits do not apply
the mask, gagging or device-damage tests. MAKHIT in WARMAC.MAC:2797 onward
copies hit facts into the event; GETHIT restores them without radio filtering.
Pending capacity and retrieval order are not yet translated into abstract
delivery semantics. Exact transcript tests remain required, so selection
evidence is not presented as full output conformance.

## Outcome text and base delivery filter

OUTHIT:2535–2579 supplies miss/absorption/neutralization and base-notice
assembly. MSG.MAC:171–178,188–189,340 provides literal fragments. The initial
long newline occurs at OUTHIT:2410, before the base branch at6000. That branch
discards on radio damage >KCRIT (not >=) or NOMSG; selection itself has no
radio-damage test. Section 10.6 distinguishes those phases and tests the exact
300 boundary. This does not make all hit-message delivery semantics complete.

## Main hit-report assembly

Section 10.7 follows OUTHIT:2415–2533 in order, with MSG.MAC:160–195,
45–46,291 and371 for literal fragments and WARMAC.MAC:2054–2091 for
device names. Important details: compact hits contain two spaces before
damage; target positions use SHORT formatting after an explicit marker even
in long output; critical detail is target-only and bypassed on death; long
base-emergency text also appears for destroyed bases independent of CRITDM.
The final CRLF is additional to suffix newlines. The >40-character target
break is actual game output, not PDF pagination. Full combination tests are
still required; this source review does not constitute transcript validation.

## Delivery context, ordering and retention

OUTHIT:2404–2595 reads current OFLG/OCFLG when formatting each retrieved event.
PRLOC:3078–3098 uses current SHPCON(WHO,position) for relative coordinates.
MAKHIT:2790–2869 stores the event's positions, strengths and outcome facts;
GETHIT:2906–2951 restores them. Thus event coordinates are creation-time facts,
but relative origin and presentation preferences are delivery-time context.
The companion test checks two presentation contexts for the same unchanged
event. It is not a concurrent-delivery test.

MAKHIT:2771–2792 searches the triggering player's forty-entry region for a
free entry or the oldest entry there. GETHIT:2900–2905 instead scans from the
beginning of all regions for a matching recipient; it does not compare ages.
This establishes both cross-triggering-player ordering and same-region
free-slot reuse inversions. Three events suffice: A for Yorktown in the first
free slot, B for Farragut in the second, consume A, then create C for Farragut
in the now-free first slot. Farragut retrieves C then B. This analysis concerns
sequential calls; no assumed race is needed. Oldest replacement when full can
lose outstanding deliveries and does not supply a normal error response.

Radio differs: UPDT:2650–2674 appends to the linked delivery order; SRCH:
2680–2708 selects the first matching recipient in that order. GETMSG:3034–3069
retrieves and removes that recipient only. RSRV:2598–2640, when full, removes
a selected recipient from existing pending entries to free capacity. The
comments' claim that this must represent a dead player is not an eligibility
test. Bounds and counter-overflow presentation are not adopted semantic rules.
C-023 and Section 9.5 record the collision with a storage-independent contract.

GETCMD:1193–1206 processes combat before radio, then readiness and fatal tests.
The direct QUIT/fatal-movement final-report path at291–309 has no such drain;
FREE's GETHIT/GETMSG loops at1129–1135 discard rather than display. Delivery
therefore cannot be inserted before every final report as a general rule.
