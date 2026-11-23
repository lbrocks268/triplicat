---
tags: [side-business, article]
status: draft
date: 2026-11-23
---

# rpm or × g? Converting centrifuge speed and why the rotor radius matters

> [!warning] Draft, not checked yet
> Drafted by Claude from general knowledge on 2026-11-23. Open points are in `Articles/open-points.local.md`. Edit here and run `python3 docs/build.py` to update the site.

**Target search:** "rpm to g calculator", "convert rpm to rcf", "rcf formula rotor radius", "centrifuge x g to rpm"
**Links to:** `calculators.html#rcf`

---

A protocol says "centrifuge at 13 000 rpm". Your centrifuge has a different rotor. Will you get the same result? Not necessarily, because what pellets your sample is the acceleration, and the acceleration depends on the speed and on the radius. That is why × g (relative centrifugal force, RCF) is the number a protocol should give.

## The formula

The acceleration at a distance r from the axis of a rotor turning at a given speed is ω² · r, with ω the angular velocity. Expressed as a multiple of the standard gravity g and with the speed in revolutions per minute:

RCF = (2π · rpm / 60)² · r / g

With r in millimetres this becomes

RCF = 1.118 · 10<sup>-6</sup> · r · rpm²

(with r in centimetres the constant is 1.118 · 10<sup>-5</sup>). The other way round:

rpm = √(RCF / (1.118 · 10<sup>-6</sup> · r))

## Same rpm, different force

Because the radius enters directly, the same rpm gives different forces in different rotors. Two example radii (illustrative, not specific rotors) at 13 000 rpm:

- r = 60 mm: about 11 300 × g
- r = 80 mm: about 15 100 × g

That is a difference of a third. And because the speed enters squared, a protocol in × g translated into rpm for the wrong radius is off accordingly. For 10 000 × g at r = 80 mm you need about 10 600 rpm.

## Which radius

A tube spans a range of distances from the axis. Rotor manuals usually give:

- **r<sub>max</sub>**, the distance to the bottom of the tube, where the force is largest and the pellet forms,
- **r<sub>min</sub>**, the distance to the top of the liquid,
- sometimes **r<sub>av</sub>**, the average.

Protocols and centrifuge displays usually refer to r<sub>max</sub>. If you compare values, make sure both use the same radius. The radius differs between rotors and adapters, so take it from the manual or the label of the rotor you use, not from a different centrifuge.

## Things to keep in mind

- **Time matters too.** Pelleting depends on force and time together. Doubling the force does not mean you can halve the time for every sample, but for a given protocol keep both as stated.
- **Do not exceed the rotor's limits.** Every rotor and every tube type has a maximum speed or force. The conversion does not check that; the manual does.
- **Balance the rotor.** Opposite positions need equal masses, not just equal volumes, especially with dense solutions.
- **Write × g in your own protocols.** It is the only value that someone with a different centrifuge can reproduce.

## Try it

The [rpm and RCF calculator](calculators.html#rcf) converts in both directions with the rotor radius in millimetres or centimetres and shows the formula it uses.
