# CompuServe variant

This appendix describes amendments to the Austin language using the same game
types and command vocabulary. Its conversion from the source analysis is in
progress; unlisted differences are not assumed absent.

## Population and names

CompuServe allows ten captains, five per faction, and begins with sixty planets.
The galaxy is still 75 by 75 sectors, with ten initial bases per faction.

| Federation ship | Empire ship |
| --- | --- |
| Lexington | Cobra |
| Nimitz | Demon |
| Savannah | Hawk |
| Vulcan | Jackal |
| Yorktown | Wolf |

When a partial name matches more than one ship, name resolution uses the order
shown within its faction, with Federation names preceding Empire names.

## Initial preferences

The initial dialogue offers BEGINNER, INTERMEDIATE and EXPERT, also accepted as
1, 2 and 3 respectively. Their initial preferences are:

| Choice | Preferences |
| --- | --- |
| BEGINNER | Long scans, medium output, normal prompt, absolute input coordinates. |
| INTERMEDIATE | Long scans, medium output, informative prompt, relative input coordinates. |
| EXPERT | Short scans, short output, informative prompt, relative input coordinates. |

An unmatched choice does not cause this question to repeat. This dialogue is
absent from Austin.

## Additional pregame commands

CompuServe adds DOCUMENT and HONORROLL to the pregame language. They participate
in the same abbreviation and ambiguity rules as other pregame commands.
DOCUMENT displays its documentation notice. HONORROLL displays recorded mission
standings. Their complete productions, responses and standings rules remain to
be converted into this appendix.

## Remaining amendments

Romulan communication, standings persistence, concurrency and other differences
still require language-level descriptions. The earlier [CompuServe source
analysis](compuserve.md) retains the derivations. Packed representations and
machine side effects in that analysis are not requirements of this appendix.

**Source basis:** [population](../../legacy/compuserve/fortran%201978/PARAM.FOR#L25),
[names](../../legacy/compuserve/fortran%201978/BLKDAT.FOR#L84),
[initial dialogue](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L30),
[pregame commands](../../legacy/compuserve/fortran%201978/SETUP.FOR#L505).
