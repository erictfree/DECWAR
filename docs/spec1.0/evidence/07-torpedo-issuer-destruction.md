# Firing-ship destruction during a burst

DECWAR.FOR4287–4311 rereads firing position, shields and damage for each
torpedo, but has no ALIVE test. IFLG stops the next iteration after misfire;
zero displacement also exits, before ammunition deduction. The initial
critical-device and supply guards are outside this loop at4235–4259.

NOVA:2304–2308 clears occupancy and marks a destroyed ship dead without clearing
its position. TORP's star branch at4322–4327 calls SNOVA and then continues the
burst. Thus issuer destruction by that path alone does not end the remaining
launch loop. Section7.20/C-029 records this observable distinction without
adopting it as a pure rule. The example stipulates no misfire and a distinct
next aim; it is source control-flow evidence, not a native transcript or an
exhaustive analysis of concurrent interruption and release.
