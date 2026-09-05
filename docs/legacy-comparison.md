# UT Austin reconstruction and CompuServe archive comparison

Source review: September 5, 2026. No game code or archive files changed.

Scope update: subsequent user-authorized review of the full upstream repository
found the missing startup asset at msc/decwar.ini and an emulator/build workflow
outside the imported 39-file subtree. See [Austin build evidence](austin-build-evidence.md).
Statements below about missing files describe the imported subtree, not the
entire repository or its installed runtime. The plan now first attempts to
generate a map and capture reference behavior using that environment.

## Finding

These snapshots share a substantial DECWAR core, but they are not a clean pair
of an untouched original and its later modifications. The UT Austin copy is a
reconstruction with visible edits, omissions, and conflicting documentation.
The supplied CompuServe copy also contains later modifications. We can identify
differences between the snapshots; those differences alone do not establish
who made each change, when it was made, or which form exactly matches an
original UT Austin release.

The strongest new evidence is a consistent **18-player roster in UT executable
tables**, including all eighteen names. Other differences affect galaxy
population, entry dialogue, persistent statistics, Romulan behavior, terminal
handling, privileged commands, and synchronization. Adopting UT behavior would
therefore require more than changing the player-count constant.

This is a structural and selected behavioral comparison, not a complete
semantic audit or an original-executable comparison. The running TypeScript
game continues to use the supplied CompuServe baseline and its documented
playable-profile repairs.

## Evidence and method

Only the two local snapshots were consulted for this review:

- **C:** `legacy/compuserve/fortran 1978/`, the 135-file supplied archive.
- **U:** `legacy/utexas/`, the 39-file `utexas23-reconstruction` snapshot at
  commit `f78f2ec733999617e4281ba3ed967bff8cd5d8f8`.

References below use C/U followed by a filename and physical line number.
The provenance and integrity records are in `legacy/README.md`,
`docs/source-manifest.json`, and `legacy/utexas-manifest.json`.

UT bundles 59 program units in `DECWAR.FOR`; the CompuServe archive separates
most of those routines into individual files. File counts consequently give
a misleading impression of how much code is present.

Across UT's main FORTRAN file, SETUP, HIGH, LOW, and MSC/DEFINE, 69 recognized
program units have counterparts in the CompuServe snapshot. Of these, **51
have matching normalized statement sequences; 18 differ**. The comparison
retains numeric labels, statement order, and single-quoted string content,
while ignoring comments, debug D-lines, and whitespace/case outside strings.
It uses the project's archive-specific statement reader, not a general FORTRAN
parser. It is a way to locate differences, not a percentage of proven fidelity.
Includes, COMMON layouts, called assembly routines, compiler behavior, and
monitor services can change the behavior of an otherwise matching routine.

The selected C block data is `BLKDAT.FOR`, consistent with the established
build baseline; the alternative `DW2.FOR` is not substituted for it.
The C-only recognized units are the local-common dummy `TURKEY` and SETUP's
trailing dummy `A`; their presence is not evidence of missing UT gameplay.

MACRO comparisons were used to locate candidate changes, then important
sections were read in context. No count of semantically identical assembly
routines is claimed. Macro expansion, conditional assembly, and instruction
side effects require deeper analysis than whitespace-normalized diffs.

## Main differences

| Area | CompuServe snapshot | UT reconstruction | Evidence |
| --- | --- | --- | --- |
| Player slots | 10, five per side | 18, nine per side | C PARAM.FOR:25; U PARAM.FOR:5 |
| Player names | Ten names in selected block data and assembly tables | Eighteen names in both tables | C BLKDAT.FOR:84; U DECWAR.FOR:489; U WARMAC.MAC:2001,2030 |
| Planets | 60 slots and 60 initially placed | 20 slots and 20 initially placed | C PARAM.FOR:31, SETUP.FOR:298; U PARAM.FOR:11, SETUP.FOR:221 |
| Galaxy and bases | 75 by 75; ten initial bases per side; maximum range ten | Same constants | C PARAM.FOR:26; U PARAM.FOR:6 |
| Startup preferences | Active Beginner/Intermediate/Expert dialogue assigns output and coordinate preferences | That sequence is commented out; main calls DECINI after placement | C DECWAR.FOR:34; U DECWAR.FOR:13,50 |
| Initialization file | DECINI support exists in assembly, but the selected main does not invoke it | Active attempt to read DECWAR.INI; file absent from imported snapshot | U WARMAC.MAC:1098 |
| Persistent statistics | UPDCAP tracks missions; UPDSTA updates standings; SHOSTA displays honor roll | Calls removed and assembly implementations absent | C SETUP.FOR:445, DECWAR.FOR:346, WARMAC.MAC:5586; U SETUP.FOR:353, DECWAR.FOR:302 |
| Pregame command table | DOCUMENT and HONORROLL present | Their table entries replaced by blanks | C SETUP.FOR:505; U SETUP.FOR:409 |
| Romulan messaging | Includes player-triggered reply logic and possible relocation | Omits that exchange; changes two autonomous random-test bounds | C TELL.FOR, ROMDRV.FOR:64,123; U DECWAR.FOR:3259,3306,3977 |
| Locking | Tracks individual lock keys, including board-word locks during movement | Public LOCK uses a constant key; UNLOCK releases all locks held by the job | C MOVE.FOR:131; U DECWAR.FOR:2234; U WARMAC.MAC:3768 |
| Echo control | ECHON/ECHOFF return immediately | ECHON/ECHOFF perform TTY OPEN and update echo flag | C WARMAC.MAC:1313,1324; U WARMAC.MAC:1145,1153 |
| Privileged commands | PASWRD includes a project-number restriction and rejection output | Those checks/output removed | C PASWRD.FOR:33; U DECWAR.FOR:2626 |
| FORTRAN argument handling | Several routines pass DO variables directly | Temporary copies introduced before selected calls | U DECWAR.FOR:399,800,952,2813,3409,3729,3819 |

The population changes can affect competition for planets, targeting and radio
groups, queue capacity, and pressure on shared state even where formulas match.
This review does not claim a measured gameplay balance comparison.

## All eighteen ships

The new UT snapshot supplies executable evidence for the complete roster:

| Federation | Empire |
| --- | --- |
| Excalibur | Buzzard |
| Farragut | Cobra |
| Intrepid | Demon |
| Lexington | Goblin |
| Nimitz | Hawk |
| Savannah | Jackal |
| Trenton | Manta |
| Vulcan | Panther |
| Yorktown | Wolf |

These are not names inferred from external histories. U DECWAR.FOR:489–510
contains the names and eighteen identification bits. U WARMAC.MAC:2001–2047
contains corresponding short and long names. U SETUP.FOR:358–362 assigns
eighteen-player radio masks: octal 777777 for all, 000777 for Federation,
and 777000 for Empire.

The supplied C selection keeps Lexington, Nimitz, Savannah, Vulcan, Yorktown;
Cobra, Demon, Hawk, Jackal, Wolf. Its active radio masks cover ten slots.
Both archives' news text describes an increase from eight to nine ships per
side under the July 10, 1979 Version 2.0 entry (DECNWS.RNO:65; UT under HLP).
That supports the existence of an eighteen-ship design, but does not date or
authenticate the entire reconstructed source.

## Shared commands, text, and numeric conventions

SCAN, LIST and its component routines, STATUS, BUILD, CAPTUR, DOCK, ENERGY,
PHACON, TORP, TORDAM, SHIELD, RADIO, REPAIR, POINTS, and TRACTR are among the
normalized matches. Much of the command language and core mechanics is shared.
Their assembly dependencies and configuration still need to be considered.

All **324 named ASCIZ messages** match byte-for-byte between the two snapshots:
301 from MSG.MAC and 23 from SETMSG.MAC, including whitespace and CR/LF bytes
inside each literal. This establishes agreement for that catalog only.
Anonymous assembly literals, direct FORTRAN strings, prompt sequencing,
formatting macros, and terminal behavior are separate sources of visible text.

For example, the ASCIL macro embeds a newline in C WARMAC.MAC:51–54, while U
WARMAC.MAC:21–24 places the text directly between its delimiters. UT's OSTR
macro loads P1 rather than T1 (U WARMAC.MAC:131; C:184). Thus identical named
messages do not establish identical terminal transcripts. The ADM-3A terminal
name also has a literal case difference in block data (C BLKDAT.FOR:74;
U DECWAR.FOR:480).

The old numeric conventions remain relevant in both copies:

- PARAM starts with `IMPLICIT INTEGER (A-Z)` and explicitly declares RAN/PWR
  real. A variable's spelling alone does not imply JavaScript-like numeric
  behavior; declaration and expression context matter.
- Scaled integers retain fractional units. For example, OFLT divides an
  integer by decimal ten into its integer and fractional parts
  (U WARMAC.MAC:1939–1955). The extra zero is a unit/scale choice, not an
  increase in the machine word's precision. Multiplication and division order
  must preserve where truncation occurs.
- Constants such as 777777 are sometimes octal bit masks, not decimal values.
  MACRO changes radix explicitly; `^D` marks decimal literals. FORTRAN's
  double-quote-prefixed octal constants need separate treatment from strings.
- The board packs three sectors per word: PARAM specifies 25 words per row
  and 1,875 words for a 75 by 75 galaxy. Movement computes a word index using
  integer division by three (C MOVE.FOR:130; U DECWAR.FOR:2226). This helps
  explain why the C movement routine locks board words rather than individual
  rendered cells.
- Argument aliasing remains significant. UT's BASPHA explicitly says
  `stop index mod warning` when introducing KA before PHADAM
  (U DECWAR.FOR:399). Similar temporary copies appear in six other routines.
  The comment supports a compiler-warning motivation; it does not prove that
  every substitution is behavior-neutral when callees write their arguments.
- Shared integer formulas do not settle floating-point semantics. The
  existing compiler/runtime questions remain applicable; this comparison
  neither replaces them with native JavaScript arithmetic nor resolves them.

The application sources use monitor/TTY services. Their terminal routines
are evidence about the application side of the connection, not a complete
historical Telnet negotiation specification.

## Why the reconstruction is not a pristine reference

1. **The two help artifacts disagree.** U HLP/DECWAR.RNH:51–59 says five
   ships per side and lists the ten C names. The served HLP/DECWAR.HLP instead
   describes eighteen players and lists nine ships per side, matching the
   executable tables. The older formatter source is not the runtime HELP file.
2. **Startup expects an absent file.** U WARMAC.MAC:1098–1110 tries DECWAR.INI.
   Its failure branch prints that it is setting defaults, then restores
   registers and returns; that branch contains no preference assignments.
   Earlier initialization may supply values, but this message is not evidence
   of a complete default preference setup. No DECWAR.INI is present in the
   imported 39 files.
3. **Modern repair annotations occur in both snapshots.** U DECWAR.FOR:11,
   U SETUP.FOR:84, U MSG.MAC:375, and several WARMAC sections retain
   DrForbin/Merlyn references. C's `changes` file identifies edited files and
   attributes modifications to the same names. Commented CompuServe-specific
   calls in UT further prevent treating every UT line as an untouched original.
4. **Some existing ambiguities survive unchanged.** POINTS' entry into a DO
   loop from outside and TRACTR's argument mismatch remain in corresponding
   UT code. POINTS matches the C routine; both mains call TRACTR without its
   declared IP argument. Importing UT does not supply the missing compiler
   semantics or automatically eliminate the playable profile's repairs.
5. **The runtime interface is substantially reworked.** UT changes identity
   handling, interrupt/lock setup, echo control, MONIT/EXIT cleanup, and
   synchronization. These cannot all be assumed to be original gameplay
   behavior merely because they occur in the UT directory.

There are also inconsistencies on the C side. Its FORTRAN KNHIT is 64
(PARAM.FOR:39), while WARMAC allocates 40 times 10, or 400, hit entries
(WARMAC.MAC:245–246). UT uses 720 in FORTRAN and 40 times 18 in assembly.
The UT values agree numerically; that agreement does not by itself establish
historical provenance or authorize changing the C-based port.

COMMON layout deserves a separate ABI audit: UT adds USPPN to LOWSEG on both
sides of the interface and comments out C's extra assembly HI.LST declaration.
FORTRAN and assembly address agreement must be evaluated with each snapshot's
build and linker conventions, rather than combining their declarations.

## Material behavior changes requiring particular care

### Synchronization

C movement locks the destination board word, then the source word when
different, and releases the appropriate locks. UT movement retries a single
LOCK(123) until success, changes the board, then calls UNLOCK(1).
UT's public LOCK discards the supplied key and uses 1; its internal LOCK.
uses 2. UNLOCK uses DEQ's remove-all request. This is a different resource
locking strategy, not just a larger lock table. It changes the possible
interleavings of game jobs and demands monitor-level analysis before any claim
of equivalent race behavior.

### Romulan behavior

Two ROMDRV tests change from IRAN(10) to IRAN(5), and IRAN(50) to IRAN(10)
(C ROMDRV.FOR:64,123; U DECWAR.FOR:3259,3306). The surrounding conditions and
random generator still determine actual rates, so these operands alone are
not a measured encounter frequency.

C TELL includes a player-to-Romulan exchange and an attempted relocation near
the player. UT omits that path and invokes ROMSPK from the non-player branch.
C ROMSPK also contains node/location-specific taunt selection, with a NODNAM
table and GETLIN-based lookup; UT omits that extension
(C WARMAC.MAC:6309–6394; U WARMAC.MAC:4678 onward).
These changes alter messages, actions, and the random draw sequence.

### Persistent records and session behavior

UT lacks the C UPDCAP, UPDSTA, and SHOSTA assembly implementations and their
main lifecycle calls. The C mission counts, historical rankings, related exit
messages, and honor-roll command are consequently not a shared baseline.
The matching POINTS routine concerns scoring/reporting inside the program;
its presence does not restore those removed persistence features.

UT also removes C PASWRD's project-number restriction and rejection messages.
Together with changed monitor identity and exit handling, this means system
commands and session cleanup need separate treatment from ordinary combat.

## What this means for further work

Keep three questions distinct for every difference: what C does, what this UT
snapshot does, and what evidence establishes original UT behavior. Where only
the first two are known, label the historical answer unresolved.

The two copies can cross-check shared formulas and tables and expose omissions,
but selecting whichever line looks better would create an undocumented hybrid.
An eighteen-player variant would need coordinated roster, masks, population,
storage/queue, and interface decisions; it has not been enabled by this review.

The next useful deeper reviews are: (1) FORTRAN/MACRO COMMON and argument
agreement, (2) startup defaults and command/terminal transcripts, (3) lock and
interrupt behavior, and (4) changed Romulan and persistence paths. Those reviews
can remain read-only until a target behavior is explicitly selected.

## Verification records

- `logs/legacy-fortran-comparison.log`: program-unit match inventory.
- `logs/legacy-fortran-comparison.json.log`: compared statements and locations.
- `logs/legacy-fortran-differences.log`: changed FORTRAN statements.
- `logs/legacy-warmac-candidate-diff.log`: assembly candidate differences;
  includes non-code changes and is not a semantic diff.
- `logs/legacy-*-diff.log`: include/message file comparisons.
- `logs/legacy-comparison-verification.log`: exact named-message equality and
  all 135 C / 39 U archive hashes checked, including recorded UT Git blobs.
- `logs/legacy-comparison-audit.log`: existing archive/generated-data audit passes.

The local diagnostic logs are ignored by Git. This report records the durable
findings. No original binaries were executed, no upstream build scripts were
run, no server was restarted, and no new runtime test result is claimed.
