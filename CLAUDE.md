# Shotfix

Visual AI input for developers. Screenshot + fix in 3 seconds.

## What It Does

```
Cmd+Shift+E → purple overlay → click element → type "make this bigger" → Enter
  → screenshot + element metadata saved to .shotfix/captures/latest.json + latest.png
  → AI reads files → fixes the code
```

Zero config, zero accounts, zero cloud. Everything local.

## Architecture

### Widget (browser JS)
Standalone JS bundle. Loads on any page, probes `localhost:2847/health`. If dev server found → purple overlay mode active.

### CLI (`npx shotfix`)
Single command: starts local server on port 2847. Receives captures, writes to disk.

### MCP Server (`shotfix-mcp`)
Single tool: `shotfix_capture` — reads `.shotfix/captures/latest.json` + `latest.png` for AI assistants.

## File Structure

```
shotfix/
├── widget/
│   ├── src/
│   │   ├── index.js          # Entry: init(), probe, trigger, keyboard shortcut
│   │   ├── quickcapture.js   # Purple overlay, element selection, type bar
│   │   ├── capture.js        # Screenshot via html2canvas
│   │   ├── elements.js       # Element detection + info extraction
│   │   ├── metadata.js       # Browser/OS/console/URL entities
│   │   ├── trigger.js        # Floating trigger button (lightning bolt)
│   │   └── styles.js         # All CSS
│   ├── dist/
│   │   └── shotfix.min.js
│   ├── demo.html
│   └── package.json
├── cli/
│   ├── src/
│   │   ├── bin.ts            # Entry
│   │   ├── cli.ts            # Dev server on :2847
│   │   ├── index.ts          # MCP server (single tool)
│   │   └── tools/
│   │       └── capture.ts    # Read latest capture files
│   ├── package.json
│   └── tsconfig.json
├── LICENSE
├── README.md
└── CLAUDE.md
```

## Development

### Build widget
```bash
cd widget && npm install && npm run build
```

### Build CLI
```bash
cd cli && npm install && npm run build
```

### Test end-to-end
1. `cd cli && node dist/bin.js` → server on :2847
2. Open `widget/demo.html` in browser
3. `Cmd+Shift+E` → click element → type → Enter
4. Check `.shotfix/captures/latest.json` + `latest.png`

## Key Details

- **Port**: 2847 (fixed, predictable)
- **Capture dir**: `.shotfix/captures/`
- **CSS prefix**: `.shotfix-*`
- **Console prefix**: `[Shotfix]`
- **Trigger**: Purple lightning bolt, right edge
- **Widget init**: `Shotfix.init()` — no required options
- **Optional**: `Shotfix.init({ getContext: () => ({ userId: '...' }) })`

## Captures JSON Format

```json
{
  "title": "make this bigger",
  "description": "",
  "url": "http://localhost:3000/dashboard",
  "timestamp": "2026-03-13T...",
  "screenshot": "latest.png",
  "browser": "Chrome 133",
  "viewport": "1440x900",
  "consoleErrors": [],
  "urlEntities": {},
  "elements": [{ "tagName": "button", "selector": "...", ... }],
  "context": null
}
```
