---
tags: [side-business, article]
status: active
date: 2026-11-16
---

# Why your Bradford standard curve is not linear, and what to do about it

> [!info] Text and references checked by Linus on 2026-11-16
> Drafted by Claude from general knowledge, then reviewed. Edit here and run `python3 build.py` in `website/` to update the site.

**Target search:** "bradford standard curve not linear", "bradford assay curve flattens", "bradford quadratic fit"
**Links to:** `bradford.html`

---

You pipette a BSA dilution series, add the reagent, read the plate, and the points bend. The upper standards sit below the straight line through the lower ones. Nothing went wrong. The Bradford assay is not linear over a wide range, and the curvature is built into its chemistry.

## Where the curvature comes from

The assay uses Coomassie Brilliant Blue G-250 (Bradford, 1976). In the acidic reagent the free dye is mostly in a reddish-brown form. When it binds protein, it is stabilised in a blue form that absorbs at about 595 nm. You measure the blue form.

Two things bend the curve:

- **The dye is used up.** Each bit of protein binds dye. At higher protein concentrations less free dye is left, so every further microgram of protein produces a little less colour.
- **The free dye also absorbs at 595 nm.** The background is therefore not constant. It falls as dye is converted to the bound form.

The result is a curve that is close to linear at low protein concentrations and flattens towards the top.

## Four ways to handle it

**1. Stay in the near-linear range.** Use standards only over the lower part of the range and dilute your samples so that they fall inside it. This is the simplest solution and often enough. The manual of your reagent states the range the manufacturer considers linear.

**2. Fit a curve instead of a line.** A second-order polynomial (A = b<sub>0</sub> + b<sub>1</sub>·c + b<sub>2</sub>·c²) follows the bend well over the usual working range. Use at least five or six standard concentrations so that the extra parameter is supported by data. Do not read samples beyond the highest standard: a polynomial behaves unpredictably outside the range it was fitted to.

**3. Measure at two wavelengths.** Zor and Selinger (1996) showed that the ratio of the absorbances at 590 nm and 450 nm is linear with protein concentration over a wider range than the absorbance at 590 nm alone. This needs a reader that measures both wavelengths.

**4. Dilute and measure again.** Whatever model you use, a sample above the highest standard should be diluted and measured again, not extrapolated.

## Other reasons for a strange curve

- **The blank.** Either subtract the reagent blank from everything, or include it as a standard at zero concentration and let the fit determine the intercept. Do not do both.
- **The wrong standard protein.** The dye responds differently to different proteins, because binding depends on the amino acid composition, mainly basic and aromatic residues (Compton and Jones, 1985). BSA gives a strong response. A concentration "in BSA equivalents" can differ clearly from the true concentration of your protein.
- **Interfering substances.** Detergents such as SDS or Triton, and strongly alkaline buffers, disturb the assay. Prepare the standards in the same buffer as the samples where possible.
- **Timing.** The colour develops within minutes and then drifts. Read standards and samples after the same incubation time.
- **Single readings.** Measure standards and samples at least in duplicate. One outlier in a single dilution series is enough to tilt the whole curve.

## How to judge the fit

R² is close to 1 for nearly every Bradford curve, straight or bent, so it tells you little. Look at the plot. If the points lie above the line in the middle and below it at both ends, the relationship is curved and a straight line is the wrong model.

## Try it

The [Bradford tool](bradford.html) fits a linear or a quadratic curve through all individual standard readings, calculates every sample with its dilution factor, and marks samples that lie outside the range of the standards.

## References

- Bradford, M.M. (1976) 'A rapid and sensitive method for the quantitation of microgram quantities of protein utilizing the principle of protein-dye binding', *Analytical Biochemistry*, 72(1-2), pp. 248-254.
- Compton, S.J. and Jones, C.G. (1985) 'Mechanism of dye response and interference in the Bradford protein assay', *Analytical Biochemistry*, 151(2), pp. 369-374.
- Zor, T. and Selinger, Z. (1996) 'Linearization of the Bradford protein assay increases its sensitivity: theoretical and experimental studies', *Analytical Biochemistry*, 236(2), pp. 302-308.
