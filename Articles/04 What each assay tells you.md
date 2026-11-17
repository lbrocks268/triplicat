---
tags: [side-business, article]
status: active
date: 2026-11-17
---

# Enzyme kinetics, Bradford, thermal shift: what each assay tells you

> [!info] Text checked by Linus on 2026-11-17
> Drafted by Claude from general knowledge, the lab example from Linus's bachelor thesis in general terms. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "what is a thermal shift assay used for", "Bradford assay principle and limitations", "why measure enzyme kinetics", "Km and Vmax meaning"
**Links to:** `kinetics.html`, `bradford.html`, `thermal-shift.html`, `michaelis-menten-fit.html`, `bradford-curve-not-linear.html`, `thermal-shift-tm.html`

---

Three assays turn up in almost every protein lab: a Bradford assay to know how much protein you have, enzyme kinetics to know what the enzyme does with its substrate, and a thermal shift assay to know how stable the protein is and whether something binds to it. They answer different questions, and each has a blind spot. This article explains what each one measures, what it is good for, and where it misleads you.

## Bradford: how much protein is in the tube?

**What it measures.** The dye Coomassie Brilliant Blue G-250 binds to protein in acidic solution, and its absorbance maximum moves from about 465 nm to 595 nm (Bradford, 1976). You read the absorbance at 595 nm and convert it to a concentration with a standard curve of a known protein, usually BSA.

**What it is good for.**

- Checking the yield after a purification step.
- Loading equal amounts of protein on a gel or in an assay.
- Following protein through a series of fractions.
- Any situation where you need a quick, cheap number and a few percent of error do not matter.

**Where it misleads you.**

- **The answer depends on your protein.** The dye binds mainly to basic and aromatic residues, so proteins with a different composition than the standard give a different colour per microgram. The number is "BSA equivalents", not an absolute mass.
- **Detergents interfere.** SDS and many other detergents disturb the dye, so lysis and elution buffers can shift the result. Include the buffer in the blank and in the standards.
- **The curve is not a straight line.** Over a wide range it bends. See [why your Bradford standard curve is not linear](bradford-curve-not-linear.html).

**Alternatives.** For a pure protein with a known sequence, the absorbance at 280 nm is often more accurate, see the [A<sub>280</sub> calculator](calculators.html#a280). For samples with detergents, a BCA assay is a common choice.

## Enzyme kinetics: what does the enzyme do with its substrate?

**What it measures.** You measure the initial rate of the reaction at a series of substrate concentrations. The rate rises and levels off. Fitting the Michaelis-Menten equation (Michaelis and Menten, 1913) gives two numbers:

- **V<sub>max</sub>**, the rate when the enzyme is saturated with substrate. It depends on how much active enzyme is in the assay.
- **K<sub>m</sub>**, the substrate concentration at which the rate is half of V<sub>max</sub>. A low K<sub>m</sub> means the enzyme reaches half its top speed at low substrate concentrations.

If you know the concentration of active enzyme, V<sub>max</sub> divided by it gives k<sub>cat</sub>, the turnover number, and k<sub>cat</sub>/K<sub>m</sub> is the usual measure of how efficiently an enzyme uses a substrate.

**What it is good for.**

- Characterising a new enzyme or a new substrate.
- Comparing mutants or variants with the wild type.
- Comparing substrates: which one does the enzyme prefer?
- Finding conditions (pH, temperature, cofactors) under which the enzyme works best.
- As the basis for inhibitor studies, where you compare kinetics with and without an inhibitor.

**Where it misleads you.**

- **Initial rates only.** The equation assumes that substrate is not used up and product does not inhibit. Take the slope from the early, linear part of each progress curve.
- **The substrate range decides the quality.** Without concentrations well above K<sub>m</sub>, V<sub>max</sub> is guessed rather than measured, and without concentrations below K<sub>m</sub>, K<sub>m</sub> is poorly defined.
- **Not every enzyme follows Michaelis-Menten.** Substrate inhibition (the rate falls again at high substrate) and cooperativity (a sigmoid instead of a hyperbola) need other models.
- **Linearised plots distort the errors.** Fit the curve directly, see [how to fit Michaelis-Menten kinetics](michaelis-menten-fit.html).

## Thermal shift: how stable is the protein, and does something bind?

**What it measures.** The protein is heated step by step in the presence of a dye such as SYPRO Orange. When the protein unfolds, the dye binds to the exposed hydrophobic regions and fluoresces. The melting temperature T<sub>m</sub> is the midpoint of this transition. If a ligand binds to the folded protein, it often stabilises it, and T<sub>m</sub> rises. That rise is the "thermal shift", ΔT<sub>m</sub> (Niesen, Berglund and Vedadi, 2007).

**What it is good for.**

- Screening ligands, fragments or cofactors for binding, many conditions at once in a qPCR instrument.
- Finding a buffer, pH or salt concentration in which the protein is most stable, for example before crystallisation or long-term storage.
- Comparing the stability of mutants with the wild type.
- A quick quality check of a new protein batch: a clean transition suggests a folded protein.

**Where it misleads you.**

- **ΔT<sub>m</sub> is not an affinity.** The size of the shift depends on the ligand concentration and on the thermodynamics of binding and unfolding. A larger shift does not by itself mean tighter binding.
- **No shift does not prove no binding.** Some ligands bind without a measurable change in stability, and some destabilise the protein.
- **The dye has its own preferences.** Detergents, lipids and some buffer components bind the dye and raise the background. Proteins with large exposed hydrophobic surfaces can give a high signal before they unfold.
- **One T<sub>m</sub> per curve is a simplification.** Multi-domain proteins can unfold in steps. See [getting T<sub>m</sub> from a thermal shift assay](thermal-shift-tm.html).

## An example from the lab

The assays are most useful together. Two point mutants of the same enzyme, both close to the active site, show why.

**A bulkier residue at the entrance of the substrate channel.** One mutation replaced a small residue with a larger one. K<sub>m</sub> stayed close to the wild type, and so did the thermal shift that the substrate caused. V<sub>max</sub>, however, dropped to about half. Read together, this suggests that the mutant still binds the substrate about as well as before but turns it over more slowly. The structure fits that reading: the residue does not touch the substrate, but it sits at the entrance of the channel that leads to the active site, so access rather than binding is the likely problem. One caveat: V<sub>max</sub> per milligram also falls when part of the protein in a preparation is inactive, so this interpretation assumes that both preparations were comparable.

**A residue that holds the substrate in place.** The second mutation replaced a residue that coordinates the substrate with alanine. Here everything changed. Less than a tenth of the activity remained, K<sub>m</sub> rose by one to two orders of magnitude for both substrates tested, and the substrate shifted the melting temperature of the mutant much less than that of the wild type. Kinetics and thermal shift point the same way: the substrate no longer binds properly.

The lesson: V<sub>max</sub> alone cannot tell you why an enzyme got slower. K<sub>m</sub> and the thermal shift with the substrate show whether binding is affected. K<sub>m</sub> is not a pure binding constant, but when it rises sharply and the thermal shift shrinks at the same time, weaker binding is the simplest explanation.

## Which assay for which question?

- **"How much protein do I have?"** Bradford, or A<sub>280</sub> for a pure protein.
- **"How fast does my enzyme work, and how much substrate does it need?"** Enzyme kinetics: K<sub>m</sub> and V<sub>max</sub>.
- **"Is my mutant still active?"** Enzyme kinetics, ideally with k<sub>cat</sub>.
- **"Is my mutant still folded and stable?"** Thermal shift: compare T<sub>m</sub>.
- **"Does this compound bind?"** Thermal shift as a first screen; confirm hits with a method that measures binding directly.
- **"In which buffer is my protein happiest?"** Thermal shift across a buffer screen.

The assays also depend on each other: kinetics and thermal shift both need a known protein concentration, which usually comes from a Bradford or A<sub>280</sub> measurement. An error in that first number carries through to k<sub>cat</sub> and to the amount of protein per well.

## Try it

All three analyses run in your browser: [enzyme kinetics](kinetics.html), [Bradford](bradford.html) and [thermal shift](thermal-shift.html). Each comes with demo data, so you can see what the input and the result look like before you use your own measurements.

## References

- Bradford, M.M. (1976) 'A rapid and sensitive method for the quantitation of microgram quantities of protein utilizing the principle of protein-dye binding', *Analytical Biochemistry*, 72, pp. 248-254.
- Michaelis, L. and Menten, M.L. (1913) 'Die Kinetik der Invertinwirkung', *Biochemische Zeitschrift*, 49, pp. 333-369.
- Niesen, F.H., Berglund, H. and Vedadi, M. (2007) 'The use of differential scanning fluorimetry to detect ligand interactions that promote protein stability', *Nature Protocols*, 2(9), pp. 2212-2221.

## Open points for Linus

- Check every statement against your own experience. In particular: the dye shift "from about 465 nm to 595 nm", "binds mainly to basic and aromatic residues", "BCA for samples with detergents", and the claim that some ligands bind without a measurable thermal shift.
- Check the three references (authors, year, volume, pages). Bradford 1976 and Niesen 2007 are the classic sources; Michaelis and Menten 1913 is in German.
- Decide whether k<sub>cat</sub> and k<sub>cat</sub>/K<sub>m</sub> belong here. The kinetics tool reports only K<sub>m</sub> and V<sub>max</sub>, not k<sub>cat</sub>.
- The thermal shift article ("Try it") says replicates are grouped by name. Since 2026-11-17 the tool also reads instrument exports and groups by a plate layout; that article could mention it.
- "An example from the lab" is based on Linus's bachelor thesis (two point mutants), written in general terms on 2026-11-17: no residue numbers, no protein or substrate names, no absolute values (only "about half", "less than a tenth", "one to two orders of magnitude"). Check that the wording matches what the thesis found, that nothing identifies the protein, and whether the group is fine with describing it at this level.
- The caveat about V<sub>max</sub> and inactive protein in the first example was added by Claude as a general point; it is not a statement from the thesis. Keep or drop it.
- Once this is published: add a short "What is this for?" box on each analysis page with a link here (Claude can do that).
