# Spectral GT RS

**Live showcase:** [jaronkbragg7337.github.io/spectral-gt-rs](https://jaronkbragg7337.github.io/spectral-gt-rs/)

**Drive test:** [open the browser sandbox](https://jaronkbragg7337.github.io/spectral-gt-rs/drive.html)

Spectral GT RS is a detailed procedural sports-car asset authored in Blender 5.1.2. The repository includes the editable source scene, a game-oriented GLB export, beauty renders, and the generator script.

## Download

- [Game-ready GLB](spectral_gt_rs_game_ready.glb)
- [Editable Blender source](spectral_gt_rs_master.blend)
- [Exterior beauty render](spectral_gt_beauty.png)
- [Interior cutaway render](spectral_gt_cockpit.png)
- [Night lighting render](spectral_gt_night.png)
- [Front detail render](spectral_gt_front.png)
- [Rear detail render](spectral_gt_rear.png)
- [Profile render](spectral_gt_profile.png)
- [Procedural build script](spectral_gt_car.py)
- [Real-time handoff notes](REALTIME.md)

## Asset notes

- Separate collections for body panels, glass, aero/trim, wheels/brakes, cockpit, and lights.
- Materials include clearcoat paint, carbon-fiber weave, smoked glass, rubber, brushed metal, leather, emissive lamps, and cockpit displays.
- Interior detail includes seats, bolsters, belts, steering wheel, gauge/display stack, vents, tunnel, shifter, and door accents.
- Mechanical detail includes undertray, subframes, control arms, toe links, dampers, coil rings, brake lines, engine-bay forms, radiator fins, turbo forms, and exhaust hardware.
- The GLB contains four animation clips: `Doors_PingPong`, `Doors_PingPong.001`, `Hood_Service_PingPong`, and `Steering_Input_PingPong`.
- A separate night-light rig and front/rear/profile camera set are saved in the Blender source; the showcase includes their rendered variants.
- Authored in meters with the vehicle front aligned to `+X`.
- The GLB is intended as a clean starting point for Unity, Unreal, Godot, Blender, and other glTF-capable tools. Export selection is limited to `CAR_EXPORT`, with staged cameras/lights excluded from the game handoff.
- `drive.html` is a dependency-light browser test cell using Three.js from a CDN. It provides a chase camera, closed-loop road, arcade steering, reset, telemetry, a tap-to-run auto-drive verification mode, and animation buttons without a login or server runtime.

## License

The original model, source script, renders, and showcase code in this repository are dedicated to the public domain under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). No permission or attribution is required, though credit is always appreciated. Third-party browser libraries loaded by the showcase retain their own licenses.
