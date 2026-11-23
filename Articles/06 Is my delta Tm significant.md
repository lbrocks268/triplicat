---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# Is my ΔT<sub>m</sub> real? Replicates, confidence intervals and thermal shift data

> [!warning] Draft, not checked yet
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "thermal shift assay significant shift", "delta Tm statistics", "how many replicates thermal shift assay", "DSF delta Tm confidence interval"
**Links to:** `thermal-shift.html`, `thermal-shift-tm.html`

---

You add a compound, and the melting temperature goes up by 0.4 °C. Is that binding, or is it the normal scatter between wells? A single ΔT<sub>m</sub> cannot answer that. You need replicates and a way to say how sure the difference is. This article shows the arithmetic with a confidence interval, which tells you more than a p value alone.

## Where the scatter comes from

Replicate wells of the same sample never give exactly the same T<sub>m</sub>. Pipetting, small differences in volume and evaporation, the position on the block and noise in the curve all contribute. The size of this scatter depends on your protein, your plate and your instrument, so it has to be measured in your own experiment, not assumed.

It also matters what your replicates replicate:

- **Wells from the same mix on the same plate** (technical replicates) capture pipetting and instrument noise. They do not capture differences between protein preparations or days.
- **Repeated runs or independent preparations** capture those as well. A shift that holds up across runs is far more convincing than one seen on a single plate.

## From replicates to a confidence interval

Take the T<sub>m</sub> of every well, not only the means. With n<sub>1</sub> wells of the sample and n<sub>2</sub> wells of the reference, their means and standard deviations s<sub>1</sub> and s<sub>2</sub>:

- **ΔT<sub>m</sub>** is the difference of the two means.
- **Its standard error** is SE = √(s<sub>1</sub>²/n<sub>1</sub> + s<sub>2</sub>²/n<sub>2</sub>).
- **The 95 % confidence interval** is ΔT<sub>m</sub> ± t · SE, where t comes from the t distribution with the Welch-Satterthwaite degrees of freedom (Welch, 1947). This form does not assume that both groups scatter equally.

If the interval excludes zero, the difference is significant at the 5 % level, which is the same decision as the Welch t test. The interval says more than that, though: its width shows how precisely you know the shift.

## Two made-up examples

The numbers below are invented to show the arithmetic. They are not measurements.

**A clear shift.** Three reference wells give 55.1, 54.8 and 55.3 °C, three wells with ligand give 58.4, 58.9 and 58.6 °C. ΔT<sub>m</sub> is +3.57 °C, and the 95 % confidence interval runs from +3.00 to +4.14 °C. Even the lower end is a shift of 3 °C.

**A small shift.** The same reference, and the compound gives 55.6, 55.2 and 55.7 °C. ΔT<sub>m</sub> is +0.43 °C, but the interval runs from −0.15 to +1.02 °C (p = 0.11). The data are compatible with no shift at all and with a shift of about 1 °C. This is not "no effect". It is "not resolved with three wells".

With only three wells per group the t value is large (about 2.8 for four degrees of freedom instead of about 2 for many), so small n is penalised twice: through the SE and through t.

## How to get a narrower interval

- **More replicates.** Four to six wells per condition narrow the interval noticeably compared with three. Put the reference on every plate with the same number of wells as the samples.
- **Less scatter.** One master mix per condition, the same volume in every well, a sealed plate, and no wells at the edge if your instrument shows edge effects.
- **Look at outlier wells, then decide.** A single well with a distorted curve can widen the interval a lot. Leave it out only for a reason you can name (a bubble, a curve without a transition, a pipetting error you noted), and say so in the methods. Do not leave wells out because the result looks nicer without them.
- **Several runs.** If you pool runs, check whether the reference itself moved between them. A whole plate can be shifted by a few tenths of a degree. In that case compare each sample with the reference of its own plate, or align the plates on the reference before pooling.

## Significant is not the same as meaningful

- **A tiny shift can be significant** when the replicates agree very well. Whether 0.3 °C matters for your question is a scientific judgement, not a statistical one.
- **Many compounds, many tests.** If you compare twenty compounds with the reference at the 5 % level, about one of them is expected to come out significant by chance even if none binds. For screens, treat single hits as candidates and confirm them in a separate run, or correct the p values for multiple testing.
- **ΔT<sub>m</sub> is not an affinity.** A larger shift does not by itself mean tighter binding. The size of the shift depends on the ligand concentration and on the thermodynamics of binding and unfolding (Niesen, Berglund and Vedadi, 2007).
- **The method has to be the same.** Compare only T<sub>m</sub> values from the same method and settings. How the derivative and the Boltzmann fit differ is explained in [getting T<sub>m</sub> from a thermal shift assay](thermal-shift-tm.html).

## What to report

The mean T<sub>m</sub> and SD of each group with n, ΔT<sub>m</sub> with its 95 % confidence interval, the test used (Welch), the T<sub>m</sub> method with its settings, and which wells were left out and why. A plot of the individual well values next to the means lets readers judge the scatter themselves.

## Try it

The [thermal shift tool](thermal-shift.html) calculates T<sub>m</sub> for every well, groups replicates by name or plate layout, and reports mean, SD, ΔT<sub>m</sub> with its 95 % confidence interval and the Welch p value against a reference you choose. It marks wells that lie far from the median of their group, lets you leave out single wells, and pools several plates, either as measured or aligned on the reference. It does not correct p values for multiple comparisons.

## References

- Niesen, F.H., Berglund, H. and Vedadi, M. (2007) 'The use of differential scanning fluorimetry to detect ligand interactions that promote protein stability', *Nature Protocols*, 2(9), pp. 2212-2221.
- Welch, B.L. (1947) 'The generalization of "Student's" problem when several different population variances are involved', *Biometrika*, 34(1-2), pp. 28-35.
