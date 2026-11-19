---
tags: [side-business, article]
status: active
date: 2026-11-16
---

# Getting T<sub>m</sub> from a thermal shift assay: derivative or Boltzmann fit?

> [!info] Text and references checked by Linus on 2026-11-16
> Drafted by Claude from general knowledge, then reviewed. Edit here and run `python3 build.py` in `website/` to update the site.

**Target search:** "thermal shift assay Tm calculation", "DSF data analysis", "melting temperature first derivative boltzmann"
**Links to:** `thermal-shift.html`

---

A thermal shift assay, also called differential scanning fluorimetry (DSF), gives you one melting curve per well. The number you want from each curve is the melting temperature T<sub>m</sub>, and from a set of curves the shift ΔT<sub>m</sub> between conditions. There are two common ways to get T<sub>m</sub>. They usually agree within a few tenths of a degree, and it helps to know why they sometimes do not.

## What the curve shows

The sample contains protein and a dye such as SYPRO Orange, whose fluorescence is low in water and high in a hydrophobic environment. As the temperature rises, the protein unfolds and exposes hydrophobic regions. The dye binds and the fluorescence rises. After the maximum the signal typically falls again, which is commonly attributed to aggregation of the unfolded protein and dissociation of the dye (Niesen, Berglund and Vedadi, 2007).

T<sub>m</sub> is the midpoint of the rising part: the temperature at which half of the protein is unfolded, in the simplest two-state picture.

## Method 1: maximum of the first derivative

The midpoint of a sigmoid is where it is steepest. So you calculate the slope dF/dT along the curve and take the temperature at which it is largest.

- **Advantage:** no model. It works for curves that are not clean sigmoids, and it ignores what happens after the maximum.
- **Caveat:** differentiating amplifies noise, so the curve has to be smoothed first. The smoothing window matters. Too narrow and noise spikes are picked as the maximum. Too wide and the peak is flattened and shifted. A Savitzky-Golay filter (Savitzky and Golay, 1964) smooths and differentiates in one step and is a common choice.

Most instrument software reports this value.

## Method 2: Boltzmann fit

Here you fit a sigmoid to the rising part of the curve:

F = F<sub>min</sub> + (F<sub>max</sub> - F<sub>min</sub>) / (1 + exp((T<sub>m</sub> - T) / a))

T<sub>m</sub> is a parameter of the fit and comes with a standard error. The parameter a describes how steep the transition is.

- **Advantage:** it uses all points of the transition and is less sensitive to noise in single points.
- **Caveat:** you must cut off the falling part after the maximum, and the result depends on where you cut. The equation also assumes flat baselines before and after the transition, which real curves often do not have.

## Which one should you use?

For comparing conditions within one experiment, either is fine as long as you use the same method and the same settings for every well. Do not mix values from two methods in one table. State the method, including the smoothing window or the fitted range, in your methods section.

The two methods disagree mainly when the curve is asymmetric or the baselines are sloped. That is a sign to look at the curve, not to pick the nicer number.

## Things that go wrong

- **High fluorescence at the start.** The dye already binds at low temperature. The protein may be partly unfolded or aggregated, or a buffer component such as a detergent binds the dye.
- **Two transitions.** Multi-domain proteins and complexes can unfold in steps. A single T<sub>m</sub> does not describe such a curve.
- **The steepest point lies at the edge of the range.** That is usually an artefact at the first or last temperatures. Restrict the search window to the region of the transition.
- **Over-interpreting small shifts.** Differences well below 1 °C are often within the well-to-well scatter. Measure at least triplicates and compare the shift with the standard deviation of the reference.
- **Reading ΔT<sub>m</sub> as affinity.** A larger shift does not by itself mean tighter binding. The size of the shift also depends on the ligand concentration and on the thermodynamics of binding and unfolding.

## Try it

The [thermal shift tool](thermal-shift.html) takes one column per well or the export of a qPCR instrument, calculates T<sub>m</sub> either from the smoothed first derivative or with a Boltzmann fit (both values are shown side by side), groups replicates by their name or by a plate layout, and reports mean, standard deviation and ΔT<sub>m</sub> with its 95 % confidence interval against a reference of your choice. The smoothing window and the search range can be set.

## References

- Niesen, F.H., Berglund, H. and Vedadi, M. (2007) 'The use of differential scanning fluorimetry to detect ligand interactions that promote protein stability', *Nature Protocols*, 2(9), pp. 2212-2221.
- Pantoliano, M.W. et al. (2001) 'High-density miniaturized thermal shift assays as a general strategy for drug discovery', *Journal of Biomolecular Screening*, 6(6), pp. 429-440.
- Savitzky, A. and Golay, M.J.E. (1964) 'Smoothing and differentiation of data by simplified least squares procedures', *Analytical Chemistry*, 36(8), pp. 1627-1639.
