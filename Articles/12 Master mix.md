---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# Master mix: how much excess, and what belongs in it

> [!warning] Draft, not checked yet
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "master mix calculator", "pcr master mix calculation", "how much extra master mix", "master mix excess percent"
**Links to:** `calculators.html#mastermix`

---

A master mix combines everything that every reaction gets into one tube, so that you pipette once per reaction instead of once per component. That saves time and makes reactions more alike. The calculation is simple; the questions are how much excess to make and what to leave out.

## Why a master mix

- **Fewer pipetting steps.** Five components for 24 reactions is 120 pipetting steps one by one, and 24 with a master mix (plus the template).
- **Smaller errors.** Pipetting 0.5 µL of enzyme into each tube is inaccurate. Pipetting 12 µL of it into the mix is not.
- **Reactions that differ only in what should differ.** Every tube gets the same mix; only the template or the variable component changes.

## The calculation

For each component: volume per reaction times the number of reactions you calculate for. Water fills each reaction up to its final volume, minus whatever is added separately (usually the template):

water per reaction = reaction volume − sum of the components − template volume

The mix volume per tube is the reaction volume minus the template. That is what you dispense into each tube before adding the template.

## How much excess

Every transfer leaves a little behind: in the tip, on the tube wall, in the dead volume of a multichannel reservoir. Without excess, the last tube comes up short. So you calculate for more reactions than you have.

There are two ways to state it: a percentage (for example 24 reactions + 10 % = 26.4 reactions) or a number of extra reactions (24 + 2). Both are fine. How much you need depends on your pipettes, the viscosity of the mix and the number of reactions. A practical check: after a run, look at what is left in the tube. If it is always a lot, reduce the excess; if the last tube was ever short, increase it.

## What belongs in the mix, and what not

- **In the mix:** everything that is the same in every reaction. Buffer, nucleotides, primers if they are the same for all, polymerase or enzyme, water.
- **Not in the mix:** what differs between reactions (template, the variable substrate concentration, inhibitors at different concentrations). Add it to each tube separately.
- **Controls:** a no-template control gets the master mix and water instead of template. Include it in the number of reactions.

## Practical points

- **Enzyme last.** Add enzymes last, keep them cold and do not vortex them hard.
- **Mix the master mix before dispensing.** Glycerol from enzyme stocks sinks to the bottom.
- **Write it down.** Note the volumes per reaction and the number you calculated for. When a result looks odd, the master mix sheet is the first thing to check.

## Try it

The [master mix calculator](calculators.html#mastermix) takes the reaction volume, the number of reactions, the excess in percent, the template volume and any number of components, and gives the volume of each component for the mix, the water to fill up, and how much mix to dispense per tube. The template is deliberately left out of the mix.
