# Information resources

HELP, NEWS and GRIPE use information supplied or retained by the game environment.
These resources are distinct from galaxy state and radio communication. Their
abstract contents are defined here; a conforming binding must identify the
content it supplies and preserve the specified selection and display behavior.
No particular filesystem, path syntax or storage API is required.

## Help content

Help content maps topic names to text sections. There are standard and privileged
bindings; the privileged binding is attempted only when the session has privilege.
The supplied Austin help text is [DECWAR.HLP](../../legacy/utexas/HLP/DECWAR.HLP).
The distinction between bindings remains meaningful even if an environment uses
the same text for both.

A request selects the section for the resolved full topic name, using case-folded
comparison of at most five characters. A space or end of the requested name ends
that comparison. Display section text, not its identifying line. A missing topic
section and an unavailable content resource are different outcomes. HELP defines
their diagnostics and fallback behavior.

For a historical text-resource binding, a section marker is a dot immediately
after LF or form feed. The remainder of that line identifies the section.
Its content continues until the next such marker or end of resource. Form feeds
are boundaries and are not displayed. A dot at the very beginning of a resource
is not recognized by this rule without a preceding boundary. These are content
format rules, not requirements to implement a character-reading loop.

The general-help and command-list reports preserve the source catalogue's names
and capitalization. Terminal lists have ten-character fields, seven fields per
line. The extra-topic list retains its blank second field between CTL-C and INTRO;
the blank is not a matchable topic. Other presentations can represent topics as
items while preserving their order and availability under their conformance profile.

**Source basis:** [topic selection and output](../../legacy/utexas/WARMAC.MAC#L4134),
[section binding](../../legacy/utexas/WARMAC.MAC#L4222),
[list rendering](../../legacy/utexas/WARMAC.MAC#L4359),
[topic catalogue](../../legacy/utexas/DECWAR.FOR#L471).

## News content

A news resource is ordered text with continuation boundaries. The supplied
Austin news is [DECWAR.NWS](../../legacy/utexas/HLP/DECWAR.NWS); its original
version wording is content, not a declaration that the present specification
or an independent implementation has that version number.

In the historical text binding, a dot immediately after LF, vertical tab or form
feed is a continuation boundary. Display the preceding boundary character,
suppress the dot and obtain the NEWS continuation reply. On YES, resume with
the character after the dot. A leading dot without a preceding recognized
boundary is ordinary content. Text and boundaries otherwise retain resource
order; the resource is not replaced by a summary of its prose.

**Source basis:** [NEWS](../../legacy/utexas/WARMAC.MAC#L3811),
[news binding](../../legacy/utexas/WARMAC.MAC#L699).

## Feedback records

```text
type FeedbackRecord = {
    context: FeedbackContext;
    lines: List<Text>;
};

type FeedbackContext = {
    version: Text;
    dateAndTime: environment date and time;
    ship: Optional<ShipId>;
    captainName: Text;
    terminalSpeed: environment speed value;
    account: AccountIdentity;
    terminal: TerminalIdentity;
    execution: ExecutionIdentity;
    gameNumber: integer;
    blackHolesSelected: Boolean;
    romulanEnabled: Boolean;
};

query feedbackRecords(game: GameState): List<FeedbackRecord>
```

Records are ordered newest submission first. Their context describes the
submitting session when feedback begins. In pregame, the ship field is absent
and the terminal header identifies the session as `Pre-game`. The remaining
identity fields are the session metadata used by USERS, not galaxy targets.

The historical text binding renders a context header, body lines and the closing
separator `----------`, followed by CR/LF. Complete body lines end in CR/LF;
a nonempty Ctrl-Z-terminated final line is also terminated. The next older record
follows the separator. Terminal metadata, date/time rendering and exact header
padding still need the complete environment/presentation binding.

GRIPE's storage diagnostics distinguish inability to open for writing, inability
to read old records, insufficient storage resources, and write failure. Being
modified is a retryable condition with the three-second retry rule in GRIPE.
A failure during writing does not establish atomic persistence or rollback of
all previously stored content; that failure boundary remains unresolved.

Diagnostic and administrative recording can use the same resource without
invoking the interactive GRIPE grammar. Pregame
[*ZAP](session-rules.md#administrative-statistics) records the current context
with no body lines and the normal closing separator. It does not solicit text
or include a standings dump. Other diagnostic bodies remain to be specified.

**Source basis:** [context header](../../legacy/utexas/WARMAC.MAC#L2116),
[session metadata](../../legacy/utexas/WARMAC.MAC#L2187),
[GRIPE recording](../../legacy/utexas/WARMAC.MAC#L4050).
