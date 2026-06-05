# Amazon Run — Stylized 3D Prototype

Amazon Run is a browser-based stylized 3D river boat prototype built with **Three.js**.

## Current version

This version includes:

- Full-screen third-person 3D river boat gameplay
- Amazon jungle river setting
- Stylized wooden boat
- Floating supply crates
- Light river hazards
- Jungle banks, trees, ruins, birds, fog, and water ripples
- Mission HUD
- Amazon Run logo image
- Hamburger menu in the upper-left corner
- Fullscreen toggle
- Reset View option
- Restart Mission option
- Mobile-friendly touch controls

## How to play

Mission:

> Deliver 3 supply crates to the river outpost.

Controls:

- **A / D** or **Left / Right Arrow** — steer
- **W / S** or **Up / Down Arrow** — adjust speed
- **Spacebar** — gentle boost
- On touch devices, use the on-screen steering and boost buttons.

## Fullscreen

The game attempts to enter fullscreen when the player starts the mission.

If the browser blocks fullscreen, use the hamburger menu in the upper-left corner and choose:

> Toggle Fullscreen

## Fixing zoom or camera issues

If the browser view gets zoomed or the camera feels off, open the hamburger menu and choose:

> Reset View

The page also includes viewport and touch settings to reduce accidental pinch-zoom and double-tap zoom on mobile browsers.

## GitHub Pages setup

Upload these files to the root of your GitHub repository:

- `index.html`
- `amazon-run-logo.png`
- `README.md`

Then enable GitHub Pages:

1. Go to your repository.
2. Open **Settings**.
3. Open **Pages**.
4. Set the source to your main branch and root folder.
5. Save and open the published GitHub Pages link.

## Notes

This is still a prototype. The next improvements would be:

- Better 3D boat model
- Better crate model
- Jungle sound loop
- Engine sound
- Dock/outpost delivery point
- More natural river bends
- Better mobile steering
- Save/load progress
