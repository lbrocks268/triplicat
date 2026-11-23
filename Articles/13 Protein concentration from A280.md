---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# Protein concentration from A<sub>280</sub>: extinction coefficient, units and pitfalls

> [!warning] Draft, not checked yet
> Drafted by Claude from general knowledge on 2026-11-23. References checked by Claude via Crossref and PubMed. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "protein concentration a280 calculation", "extinction coefficient protein concentration", "a280 mg/ml formula", "abs 0.1% extinction coefficient"
**Links to:** `calculators.html#a280`, `bradford-curve-not-linear.html`, `enzyme-kinetics-bradford-thermal-shift.html`

---

For a purified protein, the absorbance at 280 nm is the quickest way to its concentration: no reagent, no standard curve, and the sample can be recovered. It is also more accurate than a dye assay, provided the extinction coefficient is right and the sample is clean.

## Where the absorbance comes from

At 280 nm, proteins absorb mainly through tryptophan and tyrosine, and a little through cystine (two cysteines joined by a disulfide bond). The other amino acids hardly contribute. That is why two proteins at the same mg/mL can give very different readings, and why each protein needs its own extinction coefficient.

## The calculation

The Beer-Lambert law connects absorbance A, extinction coefficient ε, concentration c and path length l:

A = ε · c · l

so c = A / (ε · l), multiplied by the dilution factor if you diluted the sample before measuring.

The coefficient comes in two forms, and confusing them is the most common error:

- **Molar ε** in M<sup>-1</sup> cm<sup>-1</sup>. It gives the concentration in mol/L. Multiply by the molar mass to get g/L, which is the same as mg/mL.
- **ε<sub>0.1 %</sub>** (also written "Abs 0.1 %"), the absorbance of a 1 mg/mL solution at 1 cm path length. It gives the concentration directly in mg/mL.

They are related by ε<sub>0.1 %</sub> = ε / M, with M in g/mol.

**Example with made-up values.** A protein with ε = 30 000 M<sup>-1</sup> cm<sup>-1</sup> and M = 40 000 g/mol reads A<sub>280</sub> = 0.60 in a 1 cm cuvette. c = 0.60 / 30 000 M = 20 µM, which is 0.80 mg/mL. Its ε<sub>0.1 %</sub> is 30 000 / 40 000 = 0.75.

## Getting ε for your protein

From the sequence, ε at 280 nm of a folded protein in water can be estimated as (Pace et al., 1995):

ε = 5500 · (number of Trp) + 1490 · (number of Tyr) + 125 · (number of cystines), in M<sup>-1</sup> cm<sup>-1</sup>

Tools such as ProtParam do this for you from the sequence (Gasteiger et al., 2005). They usually give two values, one assuming all cysteines form disulfides and one assuming none do. Use the one that fits your protein: a cytoplasmic protein in a reducing buffer has no cystines.

The estimate is reasonably reliable for proteins that contain tryptophan and less so for those that do not (Pace et al., 1995). If accuracy matters, measure ε, for example by comparing the absorbance in native buffer with that in denaturing conditions (Gill and von Hippel, 1989; Pace et al., 1995).

Remember to use the sequence of the protein you actually have: with its tag, without a cleaved signal peptide.

## Things that go wrong

- **Nucleic acids.** DNA and RNA absorb strongly at 280 nm as well, with a maximum near 260 nm. A raised A<sub>260</sub>/A<sub>280</sub> ratio points to contamination, and the protein concentration will be overestimated.
- **The blank.** Use exactly the buffer the protein is in. Imidazole, DTT, some detergents and other additives absorb in the UV.
- **Scattering.** Aggregates and particles scatter light and raise the reading at all wavelengths. A reading at a wavelength where the protein does not absorb (above about 320 nm) shows whether this is happening. Centrifuge the sample before measuring.
- **Outside the linear range.** At high absorbances the photometer no longer responds linearly, and at very low ones the signal is close to the noise. Dilute concentrated samples and use a longer path or more concentrated sample for dilute ones.
- **Mixtures.** A<sub>280</sub> with a protein-specific ε only works for a pure protein. For a lysate or a mixture, use a dye or BCA assay with a standard instead; see [what each assay tells you](enzyme-kinetics-bradford-thermal-shift.html).

## Try it

The [A<sub>280</sub> calculator](calculators.html#a280) takes the absorbance, ε (molar or ε<sub>0.1 %</sub>), the molar mass, the path length and the dilution factor, and gives mg/mL and the molar concentration. It warns about absorbances above 2 and below 0.05.

## References

- Gasteiger, E., Hoogland, C., Gattiker, A., Duvaud, S., Wilkins, M.R., Appel, R.D. and Bairoch, A. (2005) 'Protein identification and analysis tools on the ExPASy server', in *The Proteomics Protocols Handbook*. Humana Press, pp. 571-607.
- Gill, S.C. and von Hippel, P.H. (1989) 'Calculation of protein extinction coefficients from amino acid sequence data', *Analytical Biochemistry*, 182(2), pp. 319-326.
- Pace, C.N., Vajdos, F., Fee, L., Grimsley, G. and Gray, T. (1995) 'How to measure and predict the molar absorption coefficient of a protein', *Protein Science*, 4(11), pp. 2411-2423.
