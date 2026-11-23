---
tags: [side-business, article]
status: active
date: 2026-11-23
---

# C<sub>1</sub>V<sub>1</sub> = C<sub>2</sub>V<sub>2</sub>: how to calculate a dilution, and what "1:10" really means

> [!info] Approved for publication by Linus on 2026-11-23
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "c1v1 c2v2 calculator", "how to calculate a dilution", "1:10 dilution meaning", "dilution formula biology"
**Links to:** `calculators.html#dilution`, `dilution-series.html`

---

Diluting a stock is the most common calculation at the bench, and the formula fits on a sticky note. Most mistakes do not come from the formula but from units, from the word "dilution factor", and from what exactly is added to what.

## The formula

The amount of substance does not change when you add solvent. Concentration times volume is therefore the same before and after:

C<sub>1</sub> · V<sub>1</sub> = C<sub>2</sub> · V<sub>2</sub>

- C<sub>1</sub> is the concentration of the stock, V<sub>1</sub> the volume of stock you take.
- C<sub>2</sub> is the concentration you want, V<sub>2</sub> the final volume.

Usually you know C<sub>1</sub>, C<sub>2</sub> and V<sub>2</sub> and want V<sub>1</sub>:

V<sub>1</sub> = C<sub>2</sub> · V<sub>2</sub> / C<sub>1</sub>

**Example.** You need 50 mL of 150 mM NaCl from a 2 M stock. V<sub>1</sub> = 0.150 M · 50 mL / 2 M = 3.75 mL. Take 3.75 mL of stock and fill up to 50 mL, which means adding about 46.25 mL of water.

## Units

C<sub>1</sub> and C<sub>2</sub> must be in the same unit, and V<sub>1</sub> comes out in the unit of V<sub>2</sub>. Mixing mM and M, or µg/mL and mg/mL, is the classic error that gives a result off by a factor of 1000. Convert first, then calculate.

The formula works for any concentration unit (molar, mass per volume, percent, "×" for buffer concentrates) as long as both concentrations use the same one. It does not work across units that need a molar mass, such as from mg/mL to mM. That step comes first.

## "Fill up to" versus "add"

V<sub>2</sub> is the final volume, not the volume of diluent. For 3.75 mL of stock in 50 mL final volume you add 46.25 mL of water, not 50 mL. For dilute aqueous solutions the difference between "fill up to" and "add the difference" is negligible. For concentrated stocks or mixtures with organic solvents, volumes are not strictly additive, and filling up to the mark is the more accurate way.

## What "1:10" means

Here the conventions in labs differ, and it is worth saying which one you mean.

- **1:10 as a dilution factor of 10.** One part of sample in a total of ten parts: 1 part stock plus 9 parts diluent. This is the usual meaning in microbiology and biochemistry.
- **1:10 as a ratio of parts.** One part of sample plus ten parts of diluent, a total of eleven parts, which is a dilution factor of 11.

For a factor of 2, the difference is between 1+1 and 1+2, which is a big one. If a protocol says "1:10" and the context does not make it clear, ask or write it as "1 + 9" or "dilution factor 10". The Triplicat calculators use 1:10 to mean a dilution factor of 10.

## Things that go wrong

- **The target is above the stock.** A dilution can only lower the concentration. If V<sub>1</sub> comes out larger than V<sub>2</sub>, the stock is too dilute.
- **Volumes too small to pipette.** If V<sub>1</sub> is below what your pipette handles accurately, make an intermediate dilution first, or prepare a larger final volume.
- **Mixing.** A concentrated stock layered under water is not a solution yet. Mix by inverting or vortexing (gently for proteins), and pipette concentrated or viscous stocks slowly.
- **Several dilutions in a row.** The factors multiply. Three steps of 1:10 give 1:1000. For a whole series, see [planning a dilution series](dilution-series.html).

## Try it

The [dilution calculator](calculators.html#dilution) takes stock concentration, target concentration and final volume, each with its own unit, and tells you how much stock and how much diluent to use.
