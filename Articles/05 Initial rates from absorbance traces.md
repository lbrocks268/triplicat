---
tags: [side-business, article]
status: active
date: 2026-11-23
---

# Initial rates from absorbance traces: getting v<sub>0</sub> right before the Michaelis-Menten fit

> [!info] Approved for publication by Linus on 2026-11-23
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "how to calculate initial rate enzyme", "initial velocity from absorbance", "enzyme assay slope absorbance per minute to concentration"
**Links to:** `kinetics.html`, `michaelis-menten-fit.html`

---

A Michaelis-Menten fit needs one number per substrate concentration: the initial rate v<sub>0</sub>. What the photometer gives you is a progress curve, the absorbance over time. Turning that curve into a rate looks trivial, and it is the step where many kinetic data sets go wrong before any fitting starts.

## Why the initial rate

The Michaelis-Menten equation describes the rate at the start of the reaction, when the substrate concentration is still the one you pipetted and there is practically no product. As the reaction runs, several things bend the progress curve:

- **Substrate is used up.** The rate falls because there is less substrate, not because the enzyme changed.
- **Product accumulates.** Many enzymes are inhibited by their product, and some reactions run backwards noticeably.
- **The enzyme loses activity.** At assay temperature, dilute enzymes can lose activity within minutes.

All three make later slopes smaller. A slope taken from too long a window therefore underestimates v<sub>0</sub>, and it does so more at low substrate concentrations, where the substrate is used up proportionally faster. That distorts K<sub>m</sub>, not only V<sub>max</sub>.

## Finding the linear part

Plot every trace before you calculate anything. A typical trace has three parts:

- **A short start that does not belong to the reaction.** Mixing, temperature equilibration of the cuvette or plate, and in coupled assays the time until the coupling enzyme has caught up (the lag phase). Leave it out.
- **A straight stretch.** This is where the slope is v<sub>0</sub>.
- **A bend towards a plateau.** Leave it out.

Fit a straight line through the straight stretch, not just through the first and last point of it. A regression line uses all readings and is far less sensitive to a single noisy point. Then look at the residuals: if they form an arch instead of scattering around zero, the window still contains curvature and should be shorter.

You do not need the same window for every substrate concentration. Traces at low substrate bend earlier, so their linear part is shorter. What should be the same is the rule by which you choose the window.

## Correcting for the background

Subtract the slope of a control without enzyme (or without substrate, depending on what can react on its own), not just its absorbance. A constant offset in absorbance does not change a slope, but a slow non-enzymatic reaction, a drifting lamp or evaporation in a plate does. If the control slope is a sizeable part of the enzymatic slope at low substrate concentrations, those points carry little information.

If the absorbance falls during the reaction (for example when NADH is consumed), the slope is negative. Use its absolute value as the rate, and make sure the background is handled with the same sign.

## From absorbance per minute to concentration per minute

With the Beer-Lambert law the rate in concentration units is:

v = (ΔA/Δt) / (ε · l)

Here ε is the molar absorption coefficient of the compound whose absorbance changes, at the wavelength you measure, and l is the path length. With ε in M<sup>-1</sup> cm<sup>-1</sup>, l in cm and time in minutes, v comes out in M/min. Two points need care:

- **ε of the right species at the right wavelength.** Take it from a source you can cite, or measure it yourself with a dilution series of the product. If both substrate and product absorb at the wavelength, use the difference of their coefficients.
- **The path length in a microplate is not 1 cm.** It depends on the volume in the well and on the meniscus. Either use the path length correction of the plate reader, or calibrate with a standard curve of the product in the same plate, the same volume and the same buffer.

To compare enzymes or preparations, divide by the amount of enzyme in the assay. That gives a specific activity (for example in µmol min<sup>-1</sup> mg<sup>-1</sup>), and, if you know the concentration of active enzyme, the turnover number k<sub>cat</sub> from V<sub>max</sub>.

## Things that go wrong

- **The absorbance is too high.** Above the range in which your instrument responds linearly, a real change in concentration produces a smaller change in the reading, and the trace looks flatter than it is. The manual of the instrument states the range. Use less substrate or a shorter path length, or measure at a wavelength where the compound absorbs less.
- **The rate is not proportional to the amount of enzyme.** Check once with two or three enzyme amounts at the same substrate concentration. If doubling the enzyme does not double the slope, something else limits the rate (the coupling system, mixing, the detector) and v<sub>0</sub> is not a property of your enzyme.
- **Too few readings in the linear part.** If the reaction is so fast that the straight stretch contains only a handful of readings, use less enzyme rather than squeezing the window.
- **Replicates averaged too early.** Keep the rate of every replicate. The Michaelis-Menten fit should see all individual rates, so that their scatter enters the standard errors.

## Try it

The [enzyme kinetics tool](kinetics.html) takes the initial rates you calculated, one column per replicate, and fits the Michaelis-Menten equation by nonlinear least squares with standard errors and 95 % confidence intervals. It does not read raw progress curves; calculate the slopes first as described above. Why the fit should be nonlinear and not a Lineweaver-Burk plot is explained in [how to fit Michaelis-Menten kinetics](michaelis-menten-fit.html).
