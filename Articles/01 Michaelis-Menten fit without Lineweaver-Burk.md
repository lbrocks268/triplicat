---
tags: [side-business, article]
status: active
date: 2026-11-16
---

# How to fit Michaelis-Menten kinetics (and why not with a Lineweaver-Burk plot)

> [!info] Text and references checked by Linus on 2026-11-16
> Drafted by Claude from general knowledge, then reviewed. Edit here and run `python3 build.py` in `website/` to update the site.

**Target search:** "michaelis menten fit", "calculate Km Vmax", "lineweaver burk vs nonlinear regression"
**Links to:** `kinetics.html`

---

You measured initial rates at a handful of substrate concentrations and now you need K<sub>m</sub> and V<sub>max</sub>. Many lab courses still teach the double-reciprocal plot for this. It is a good way to *look* at kinetic data and a poor way to *estimate* the parameters. This article explains why, and what to do instead.

## The model

For an enzyme that follows Michaelis-Menten kinetics (Michaelis and Menten, 1913), the initial rate depends on the substrate concentration as

v = V<sub>max</sub> · [S] / (K<sub>m</sub> + [S])

V<sub>max</sub> is the rate at saturating substrate. K<sub>m</sub> is the substrate concentration at which the rate is half of V<sub>max</sub>.

## What goes wrong with the double-reciprocal plot

Lineweaver and Burk (1934) rearranged the equation so that 1/v plotted against 1/[S] gives a straight line. The intercepts then give 1/V<sub>max</sub> and -1/K<sub>m</sub>.

The problem is the error. Your measurement error is roughly the same size for every rate. Taking the reciprocal turns a small error on a small rate into a very large error on 1/v. The points at the lowest substrate concentrations, which are the least precise, end up far out on the right of the plot and pull the line more than all other points together. The resulting K<sub>m</sub> and V<sub>max</sub> can be clearly off even when the data are good.

## What to do instead: fit the curve directly

Nonlinear regression fits the hyperbola to the untransformed data. Every point keeps its original weight. This is what statistics programs and the toolkit on this site do.

In R it is three lines:

```r
fit <- nls(v ~ Vmax * S / (Km + S), data = d,
           start = list(Vmax = max(d$v) * 1.2, Km = median(d$S)))
summary(fit)
```

The fit needs starting values. A V<sub>max</sub> a little above your highest rate and a K<sub>m</sub> in the middle of your concentration range usually work.

## Reading the result

- **Estimate and standard error.** The standard error says how well the data pin down the parameter. A K<sub>m</sub> of 0.85 ± 0.02 mM is well determined. A K<sub>m</sub> of 0.85 ± 0.60 mM is not.
- **95 % confidence interval.** The range of values compatible with your data. Report it, or the standard error, together with the estimate.
- **R².** Of limited use for nonlinear fits. A high R² does not show that the model is right. Look at the plot.

## Planning the experiment

Most bad fits are caused by the choice of concentrations, not by the mathematics.

- **Cover both sides of K<sub>m</sub>.** You need points well below K<sub>m</sub>, where the rate rises almost linearly, and points well above, where it levels off. A common rule of thumb is a range from about 0.2 to 5 times K<sub>m</sub>.
- **Reach saturation.** If your highest concentration is below about twice K<sub>m</sub>, the curve never bends enough and V<sub>max</sub> is an extrapolation.
- **Six to eight concentrations, in replicates.** Fit all individual values, not the means.
- **Measure initial rates.** The equation holds for the start of the reaction, while substrate depletion and product inhibition are negligible.

## When the model does not fit

- **The rate drops again at high substrate.** That points to substrate inhibition, which needs a different equation.
- **The curve is S-shaped.** That points to cooperativity (Hill equation).
- **The points scatter evenly around a line and never bend.** You are far below K<sub>m</sub>. Only the ratio V<sub>max</sub>/K<sub>m</sub> can be determined from such data.

## Try it

Paste your substrate concentrations and rates into the [enzyme kinetics tool](kinetics.html). It fits all individual points, reports standard errors and confidence intervals, and warns when saturation is not reached.

## References

- Michaelis, L. and Menten, M.L. (1913) 'Die Kinetik der Invertinwirkung', *Biochemische Zeitschrift*, 49, pp. 333-369.
- Lineweaver, H. and Burk, D. (1934) 'The determination of enzyme dissociation constants', *Journal of the American Chemical Society*, 56(3), pp. 658-666.
- Johnson, K.A. and Goody, R.S. (2011) 'The original Michaelis constant: translation of the 1913 Michaelis-Menten paper', *Biochemistry*, 50(39), pp. 8264-8269.

## Open points for Linus

- The "0.2 to 5 times K<sub>m</sub>" rule is a common rule of thumb; I have no specific source for it. Either find one or phrase it as your own practice.
- Add a real figure: the same data fitted both ways, with the two K<sub>m</sub> values side by side. The kinetics tool can produce the nonlinear one.
