# Sleepy Seder

`Sleepy Seder` is a one-screen Phaser arcade game about surviving a chaotic four-level seder by
keeping Dad awake with carefully launched matzo balls.

## Premise

You control a giant spoon on the left side of the table. Charge a shot, arc a matzo ball into Dad,
then dip the spoon back into the soup to reload before he nods off. Each new level empties another
wine glass and adds more trouble to the table.

## What Is In The Game

- Four short campaign levels with escalating wakefulness drain.
- A soup-dip reload loop instead of infinite ammo.
- Headshots, bonks, wakefulness management, and a visible countdown over Dad's head.
- Locust and frog hazards in the later levels.
- Briefing cards, impact sounds, snoring, and level-start music.

## Controls

- `ArrowUp`, `ArrowLeft`, `W`, or `A`: tilt the spoon upward.
- `ArrowDown`, `ArrowRight`, `S`, or `D`: tilt the spoon downward.
- Hold and release `Space`: charge and fire.
- Move the pointer: aim with mouse or touch.
- Click or tap: start, advance cards, or charge and fire.
- Dip the spoon into the soup bowl: reload.

## Play Locally

Open `index.html` directly in a browser, or serve the folder with a simple static file server such
as:

```bash
python3 -m http.server
```

Then open `http://127.0.0.1:8000/sleepy_seder/`.

## Docs

- Technical docs index: [docs/README.md](docs/README.md)
- Developer overview: [docs/developer_overview.md](docs/developer_overview.md)
- Gameplay systems: [docs/gameplay_systems.md](docs/gameplay_systems.md)

## License

This project is licensed under the GNU Affero General Public License v3.0. See
[LICENSE.md](LICENSE.md).
