---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# Percent solutions: w/v, v/v and w/w are not the same

> [!warning] Draft, not checked yet
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "percent solution w/v v/v", "how to make a 10% solution", "w/v vs w/w", "70% ethanol how to make"
**Links to:** `calculators.html#percent`, `molarity-mass.html`

---

"10 % SDS", "70 % ethanol", "1 % agarose". Percent concentrations are everywhere in protocols, and they hide which of three different definitions is meant. Usually the context tells you, but not always, and the difference can be large.

## Three definitions

- **% (w/v), weight per volume:** grams of substance per 100 mL of final solution. 10 % (w/v) SDS is 10 g SDS in a final volume of 100 mL. This is the usual meaning for solids dissolved in water (salts, SDS, agarose, BSA).
- **% (v/v), volume per volume:** millilitres of substance per 100 mL of final solution. 70 % (v/v) ethanol is 70 mL of ethanol in a final volume of 100 mL. This is the usual meaning for liquids mixed with water (ethanol, glycerol, DMSO).
- **% (w/w), weight per weight:** grams of substance per 100 g of solution. This is how concentrated acids, bases and hydrogen peroxide are labelled, and how some solid mixtures are specified.

If a protocol only says "%", a solid in water is almost always meant as w/v and a liquid in water as v/v. When it matters, write the definition down.

## Making them up

**w/v.** Weigh the substance, dissolve it in less than the final volume, then fill up to the final volume. Mass in grams = percent · final volume in mL / 100. For 250 mL of 2 % (w/v): 2 · 250 / 100 = 5 g.

**v/v.** Measure the liquid, then fill up to the final volume with water. Volume in mL = percent · final volume / 100. For 100 mL of 70 % (v/v) ethanol: 70 mL ethanol, filled up to 100 mL. Mixing ethanol and water gives slightly less volume than the sum of both, so filling up to the mark needs a little more than 30 mL of water. Adding exactly 30 mL gives a final volume a bit below 100 mL and a concentration slightly above 70 %.

**w/w.** Weigh both the substance and the solvent. Mass of substance = percent · total mass / 100. If you need the result per volume, you need the density of the solution, which for concentrated solutions differs clearly from 1 g/mL.

## Converting percent to molarity

For w/v this is straightforward: 1 % (w/v) is 10 g/L, so the molar concentration is 10 · percent / M, with M in g/mol. For v/v you also need the density of the pure liquid, and for w/w the density of the solution. The label of concentrated reagents usually states both the percentage and the density for this reason. How to go from molarity to grams is explained in [how many grams for a molar solution](molarity-mass.html).

## Things that go wrong

- **Diluting from a w/w stock as if it were w/v.** A concentrated acid labelled in % (w/w) is not the same concentration per mL. Convert with the density first.
- **Glycerol and other viscous liquids.** Pipetting viscous liquids by volume is inaccurate. Weighing them and converting with the density is often more reliable.
- **"Percent" of a percent.** Diluting a 10 % stock to 1 % is a dilution by a factor of 10, as long as both are the same kind of percent.

## Try it

The [percent solution calculator](calculators.html#percent) gives the grams for a % (w/v) solution or the millilitres for a % (v/v) solution for the final volume you choose.
