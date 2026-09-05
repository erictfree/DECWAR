# Austin repository: build and reference-execution evidence

The full `decwarorg/utexas` repository was reviewed on September 5, 2026,
beyond the previously imported source subtree. That initial review did not
execute upstream scripts or change a running game.

A subsequent local build succeeded on September 5, 2026 using a native build
of the bundled simulator.
The fresh map, symbols, executable and successful Yorktown/Wolf session evidence
are preserved in [the Austin reference build](../legacy/utexas-reference/f78f2ec/README.md).
The read-only findings below describe the earlier search; statements about not
yet having booted or generated a map are superseded by that execution record.

## Scope and result

Verified current main with `git ls-remote`:
`f78f2ec733999617e4281ba3ed967bff8cd5d8f8`. This matches our imported snapshot
and the previously downloaded full repository archive. Examined its 595-file
inventory, relevant build scripts and documentation, and the disk ZIP inventory.
Did not search other DECWAR repositories or follow external implementation links.

There is no standalone DECWAR.MAP, DECWAR.SYM or DECWAR listing file in this
commit's ordinary file inventory. The bundled disk ZIP contains two opaque
PDP-10 disk images; their internal filesystem has not been mounted or searched.
This is not a claim that no such file exists inside those images or in repository
history. More importantly, the supplied environment appears sufficient to
regenerate a map from the reconstruction, subject to running and verifying it.

## A build-and-run environment is supplied

The repository's [README](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/readme.md)
describes restoring, compiling, linking and installing the game at startup,
then connecting by Telnet on port 2030 and running `r gam:decwar` after login.
This is corroborated by the executable build path:

1. `start.py` unpacks `docker/dsk-20251103.zip` if the disk directory is absent
   and starts Docker Compose.
2. `Dockerfile` builds the bundled SIMH PDP-10 KL simulator and BACK-10 tool.
3. `docker-compose.yaml` mounts the reconstruction and msc directories, creates
   the source tape using `msc/tape.py --simple`, then boots the simulator.
4. `simh/boot-from-disk.ini` attaches the two disks and invokes `simh/utexas.do`.
5. [simh/utexas.do](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/simh/utexas.do)
   restores sources, issues `compile/comp decwar, high, low, setup, warmac,
   msg, setmsg`, links with SYS:FORLIB, saves DECWAR.EXE and assigns GAM: to
   the installed directory.

The disk ZIP lists `kl_dskb0.rp6` (315,187,200 bytes) and `kl_dskb1.rp6`
(315,177,984 bytes). The repository also includes the FORTRAN-10 V6 tape and
`simh/fort10v6.do`; the disk-creation script invokes that installation workflow.
The compiler/runtime actually selected by the running disk must still be
identified from execution. Tape filenames alone do not prove exact versions.

This is substantially better evidence than an isolated source folder. We have
not independently booted it, verified a successful build, or played the resulting
binary yet. Successful execution would establish a reference for this pinned
reconstruction/environment, not authenticate an untouched 1981 release.

## The missing initialization file is present outside the imported subtree

[msc/decwar.ini](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/msc/decwar.ini)
contains these commands, with source CR/LF bytes:

```text
set prompt informative
set ocdef both
set output medium
targets
srscan 2 w
```

[msc/tape.py](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/msc/tape.py)
explicitly copies this file into the staging area used to build the source tape.
The prior comparison correctly found it absent from the imported 39-file
subtree; it is not absent from the complete project's runtime inputs. It should
be separately preserved with provenance and used as evidence for the Austin
default startup. File-absent behavior remains a separate case to test.

## How to obtain the map

[utexas23-reconstruction/L.MIC](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/utexas23-reconstruction/L.MIC)
documents `/M` for a map (default DECWAR.MAP), `/S` for a symbol file (default
DECWAR.SYM), and `/E` for a saved executable. Its documented production command
is `@L/M/S/E`. The script translates those into LINK's `/MAP`, `/SYFILE`, and
`/SSAVE` switches.

The ordinary automated LINK session in `simh/utexas.do` requests the saved game
but does not request a map or symbol file. That provides a concrete explanation
for not seeing one among the source files; it is an output we can request.

For a reference build, preserve the automation's exact module order, libraries
and build settings, and add map/symbol output to that LINK session in an isolated
working copy. Alternatively stage L.MIC and evaluate its documented invocation;
the existing tape script copies FOR/MAC sources and selected assets, not L.MIC,
so `@L/M/S/E` should not be assumed available immediately after automatic restore.
Compare the resulting link/save behavior before declaring the alternate path
equivalent. Do not replace the imported source or modify the active TS host.

Record the map and symbols alongside the source commit, compiler, assembler,
LINK/FORLIB/monitor identities, complete commands, warnings, executable hash and
startup transcript. Capture the same build's terminal behavior as a reference
for the port. A map from a preexisting disk binary could be stale relative to
the pinned source, so a fresh documented link is preferable.

## Consequences for the Austin plan

First try the supplied environment and capture a fresh map, symbols, build
output and initialization transcript. Use those artifacts to resolve layout
and compiler assumptions before adopting virtual addresses or startup repairs.
The virtual-layout strategy remains a fallback if the reconstructed environment
cannot be made to provide the required evidence; missing old artifacts need not
block a playable port indefinitely.

The repository's changelog also identifies a July 19, 2025 hit-link allocation
repair from `knhshp*10` to `knhshp*18`. This adds explicit reconstruction history
to the earlier observed queue difference. It supports treating this snapshot
as maintained runnable reconstruction code rather than a pristine historical
copy. No game-rule changes or licensing conclusions follow automatically.

Local records: `logs/austin-repository-artifact-search.log`,
`logs/austin-repository-disk-package.log`, and
`logs/austin-repository-search-provenance.log`.
