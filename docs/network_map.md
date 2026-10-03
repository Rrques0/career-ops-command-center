# BLACKLINE FABRICATION NODE Network Map

The builder creates one base COMP:

`/project1/blackline_fabrication_node`

Primary children:

- `data`: live fake PLC state tables, product tables, terminal log tables, Python module DATs, and the frame Execute DAT.
- `screen_a`: control console composition, text overlays, graph source TOPs, scanline/glitch/warning stack, and final `screen_a_out`.
- `screen_b`: procedural factory bay with native Geometry COMPs, camera, lights, render TOP, detection overlays, and final `screen_b_out`.
- `window_screen_a` and `window_screen_b`: Window COMPs pointed at the two screen outputs. Assign them to your external displays after running the builder.

Canonical controls live on the root base custom parameter page named `BLACKLINE`:

- `Mode`: IDLE, PRODUCTION, SCAN, BREACH, LOCKDOWN, MANUAL OVERRIDE
- `Speed`: conveyor and motion rate
- `Intensity`: visual energy, scan brightness, camera drift
- `Defectrate`: fake product defect probability
- `Breachlevel`: warning and glitch pressure

The frame Execute DAT calls `td_modules/td_callbacks.py`, which reads those custom parameters and updates the tables, TOP text, product transforms, camera motion, and warning states.
