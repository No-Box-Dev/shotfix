# shotfix

Screenshot + fix. Visual AI input for developers.

```
Cmd+Shift+E → click element → type "make this bigger" → Enter → AI fixes it
```

3 seconds. Zero config, zero accounts, zero cloud.

## Quick Start

**1. Start the dev server:**

```bash
npx shotfix
```

**2. Add to your page:**

```html
<script src="https://unpkg.com/shotfix/dist/shotfix.min.js"></script>
<script>Shotfix.init();</script>
```

**3. Capture:**

Press `Cmd+Shift+E` (or click the ⚡ button), click an element, type what's wrong, hit Enter.

Screenshot + element metadata saved to `.shotfix/captures/latest.json` + `latest.png`.

## MCP Server

For AI assistants (Claude, etc.):

```json
{
  "mcpServers": {
    "shotfix": {
      "command": "npx",
      "args": ["-y", "shotfix-mcp"]
    }
  }
}
```

Single tool: `shotfix_capture` — reads the latest capture with screenshot image.

## How It Works

The widget probes `localhost:2847` for the dev server. If found, the purple overlay mode activates. Everything stays local — no cloud, no accounts.

## License

MIT
