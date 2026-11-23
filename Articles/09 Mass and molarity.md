---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# How many grams for a molar solution? Mass, molarity and the molar mass on the label

> [!warning] Draft, not checked yet
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "how many grams for molar solution", "molarity to grams calculator", "mass from molarity and volume", "hydrate molar mass buffer"
**Links to:** `calculators.html#molarity`, `dilution-c1v1.html`

---

You want 500 mL of a 150 mM solution and need to know how much to weigh. One formula answers that. The pitfalls are in the molar mass you put into it and in how you make up the volume.

## The formula

The amount of substance n is concentration times volume, and the mass is the amount times the molar mass M:

m = c · V · M

With c in mol/L, V in L and M in g/mol, m comes out in grams. The other way round, from a weighed mass to the concentration:

c = m / (V · M)

**Example.** 500 mL of 150 mM NaCl (M = 58.44 g/mol): m = 0.150 mol/L · 0.500 L · 58.44 g/mol = 4.38 g.

## Use the molar mass of what is in the bottle

The molar mass has to match the substance you weigh, not the substance you think of.

- **Hydrates.** Many salts are sold with crystal water. Calcium chloride, for example, exists anhydrous (110.98 g/mol) and as dihydrate (147.01 g/mol). For 100 mL of a 1 M solution that is 11.10 g or 14.70 g. Using the wrong one gives a concentration off by a third.
- **Salt forms and counter-ions.** Buffers, amino acids and drugs often come as hydrochloride, sodium salt or similar. The molar mass on the label of your bottle includes the counter-ion; a value from a textbook or a database may not.
- **Purity.** If the label states a purity well below 100 %, or the substance is hygroscopic and has taken up water, the real amount is lower than the weighed mass suggests. For most buffers this is negligible; for standards it is not.

The label or the certificate of analysis of the batch you use is the reliable source.

## Make up the volume correctly

- **Dissolve, then fill up to the final volume.** Dissolve the solid in less than the final volume, adjust the pH if needed, then fill up to the mark. Adding the solid to the full volume of water gives more than the intended volume and a lower concentration.
- **Adjust the pH before the final fill.** Acid or base added for the pH also adds volume.
- **Use a volumetric flask or a graduated cylinder for accuracy.** The scale on a beaker or bottle is a rough guide only.

## Weighing small amounts

If the calculated mass is a few milligrams, the relative error of the balance becomes large. Prepare a more concentrated stock with a mass that weighs well, then dilute it (see [how to calculate a dilution](dilution-c1v1.html)). Alternatively, weigh roughly and calculate the exact concentration from the mass you actually weighed, with c = m / (V · M).

## Try it

The [mass and molarity calculator](calculators.html#molarity) gives the mass for a target concentration, or the concentration for a weighed mass, from volume and molar mass, with the units you choose.
