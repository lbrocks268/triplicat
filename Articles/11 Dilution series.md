---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# Planning a dilution series: serial or each from the stock?

> [!warning] Draft, not checked yet
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "serial dilution calculator", "how to make a dilution series", "serial dilution vs independent dilution", "standard curve dilution series"
**Links to:** `calculators.html#series`, `dilution-c1v1.html`, `bradford-curve-not-linear.html`

---

Standard curves, titrations and MIC tests all need a dilution series. There are two ways to make one, and each has its own way of going wrong. Planning the volumes before you start avoids the most common problem: running out of liquid in the middle of the series.

## Two ways to make a series

**Serial dilution.** Each step is made from the previous one. With a factor of 2 and a stock of 1000 µg/mL you get 500, 250, 125, 62.5 ... µg/mL, each tube feeding the next.

- **Advantage:** every step uses a convenient transfer volume, and large factors (1:10, 1:10, 1:10) reach very low concentrations quickly.
- **Disadvantage:** errors carry forward. A pipetting error in step 2 is in every step after it, and small errors in each step multiply.

**Each step from the stock.** Every tube is diluted directly from the stock.

- **Advantage:** errors do not carry over. A mistake affects one tube only.
- **Disadvantage:** the low concentrations need very small transfer volumes from the stock, often too small to pipette accurately.

A common compromise is to make one or two intermediate dilutions and prepare the remaining steps from those.

## Constant factor or free concentrations

For titrations and MIC tests a constant factor (often 2 or 10) is usual, because it spreads the points evenly on a logarithmic scale. For a standard curve you often want specific concentrations instead, chosen to cover the range in which your samples fall and with more points where the curve bends. For a Bradford assay, for example, see [why your Bradford standard curve is not linear](bradford-curve-not-linear.html).

## Get the volumes right

In a serial dilution every tube gives part of its content to the next. So you have to decide what the volume per tube means:

- **Volume that is prepared.** Every tube is made up to the same volume (transfer + diluent). After the transfer to the next tube, the early tubes contain less than the last one. The pipetting volumes are round.
- **Volume that remains.** Every tube should still contain the same volume after the series is finished. Then each tube must be made up with extra for the next step. This has to be calculated backwards from the last tube, because how much extra a tube needs depends on the next step.

Either way, check that the column "transfer + diluent = prepared" adds up in every row before you start pipetting.

## Pipetting

- **Smallest volume.** Below a few microlitres, pipetting errors grow quickly (check the specifications of your pipette). If a step needs less, increase the volume per tube or add an intermediate step.
- **Mix before every transfer.** An unmixed tube passes on the wrong concentration, and the error carries to all later steps.
- **Fresh tip for every step.** Liquid on the outside of a tip carries over concentration.
- **Diluent first.** Put the diluent into all tubes first, then do the transfers in order.

## Try it

The [dilution series calculator](calculators.html#series) plans a series with a constant factor or with concentrations you choose, serial or each from the stock, for the volume that is prepared or the volume that remains. It lists transfer and diluent volumes per step, the total stock needed, and marks transfer volumes below a minimum that you set.
