---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# Thermal shift data straight from the qPCR instrument: reading the export without reformatting

> [!warning] Draft, not checked yet
> Drafted by Claude on 2026-11-23. The description of the export is based on one real export from Linus's lab (structure only, no values). Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "thermal shift assay data export qPCR", "DSF raw data csv analysis", "analyse melt curve export excel", "thermal shift analysis without software licence"
**Links to:** `thermal-shift.html`, `thermal-shift-tm.html`, `delta-tm-significant.html`

---

A thermal shift run on a qPCR instrument ends with a file full of numbers and, often, no licence for the analysis software on the computer where you want to work. Many people then spend an hour in Excel rearranging columns before the actual analysis starts. This is rarely necessary. This article explains what a raw data export usually looks like, what to watch out for, and how to get from the file to T<sub>m</sub> values without retyping anything.

## Export the raw data, not only the results

Most instrument software can export several things: a results table with T<sub>m</sub> values it has already calculated, and the raw melt data, the fluorescence of every well at every temperature step. Export the raw data. Only with them can you check the curves, choose the method and settings yourself, and repeat the analysis later.

Keep one unchanged copy of the file, and note the instrument, the software and its version next to it. If a result is ever questioned, that file is the evidence.

## What the file looks like

Two layouts are common.

**Long format: one row per well and reading.** An export we have seen from a qPCR instrument starts like this (values replaced by placeholders):

```
Well,Well Position,Reading,Temperature,Fluorescence
1,A01,1,<temperature>,<fluorescence>
1,A01,2,<temperature>,<fluorescence>
...
2,A02,1,<temperature>,<fluorescence>
```

Every well appears as a run of rows, one per temperature step. After the raw block, separated by an empty line, the same file contained two further blocks: the instrument's own first derivative, and fitted Boltzmann curves. Those are useful for comparison, but the analysis should start from the raw fluorescence.

**Wide format: one column per well.** The first column is the temperature, then one column per well. This is what you get when someone has already rearranged the data in a spreadsheet, and what several analysis tools expect.

Both contain the same information. Converting one into the other by hand is where copy errors creep in.

## Things to check before you analyse

- **Rows are letters, columns are numbers.** In A01 to H12, the letter is the row and the number the column. It is easy to swap them in your head, especially when replicates lie down a column (A02, B02, C02) instead of across a row. Check your plate map against the well names in the file before assigning samples.
- **A01 and A1 are the same well.** Some programs write the leading zero, some do not. A good tool treats them as the same.
- **Do not open and save the export in Excel.** Depending on the language settings, Excel can turn decimal points into thousands separators or values into dates, and it saves with a semicolon or comma depending on your system. Use the original file. If you must open it, close it without saving.
- **Decimal comma.** Files from a German or French system often use a comma as decimal separator and a semicolon between columns. That is fine as long as the analysis reads it correctly. Check one value in the result against the file.
- **All wells cover the same temperatures.** Usually they do. If the temperatures differ slightly between wells, they have to be interpolated onto a common grid before means of curves can be formed. Each well's T<sub>m</sub> can still be calculated from its own readings.
- **Empty and blank wells.** Wells without protein or without dye give flat or odd curves. Leave them out of the analysis by not assigning them to a group, rather than deleting rows in the file.

## Which sample is in which well

The export knows positions, not samples. You add the samples with a plate layout: a small table with the row letters down the side, the column numbers across the top and a sample name in each cell, as you would draw it in your lab book. Wells with the same name are treated as replicates. Writing the layout once and reusing it for every run of the same design saves time and avoids mistakes.

## Comparing with the instrument's own values

If the export contains the instrument's derivative or its T<sub>m</sub> values, use them as a check. The T<sub>m</sub> from the maximum of the derivative depends on the smoothing, so small differences between two programs are normal. Large differences in single wells are worth a look at the curve: usually the curve has two transitions, a high starting signal, or its steepest point at the edge of the temperature range. How the methods differ is explained in [getting T<sub>m</sub> from a thermal shift assay](thermal-shift-tm.html).

## Try it

The [thermal shift tool](thermal-shift.html) reads long-format exports with columns for well, temperature and fluorescence directly, pasted or opened as a file. It uses the first block and ignores further blocks such as the instrument's derivative. It also reads the wide format, with decimal point or decimal comma. Samples are assigned by pasting a plate layout or by clicking wells on a plate editor, and layouts can be saved in your browser for the next run. The data stay in your browser. If your instrument's export is not read, there is a link on the page to send an example file.

What to do with the T<sub>m</sub> values afterwards, and when a shift is real, is the topic of [is my ΔT<sub>m</sub> real?](delta-tm-significant.html).
