# kapture-tasks

Example showing how to use the [Kapture](https://github.com/kalisio/kapture) screenshot service with [feathers-tasks](../../packages/feathers-tasks) workers and [@pdfme/generator](https://pdfme.com) for PDF generation.

## Architecture

```
Client (Vite :8080)
  ├── Tab Kapture  → tasks.create({ type: 'kapture', payload })
  └── Tab PDF      → tasks.create({ type: 'pdfme',   payload })

Server (Feathers/Express :3030)
  ├── Worker kapture  → POST /capture → returns PNG base64
  └── Worker pdfme    → POST /capture → builds PDF with @pdfme/generator → returns PDF base64
```

**Two workers:**

| Worker | Description | Output |
|--------|-------------|--------|
| `kapture` | Direct call to the Kapture service | PNG |
| `pdfme` | Calls Kapture with the map size derived from the template, then generates a PDF with the captured image embedded | PDF |

**Map size calculation for PDF:**  
The template JSON defines the `map` field in millimetres. The server converts to pixels at 96 DPI before calling Kapture:  
`px = Math.round(mm × 96 / 25.4)` → A4: 813×596 px, A3: 1150×843 px.

**Persistence:**  
`task-store` is a plain `MemoryService` registered by the app — feathers-tasks does not ship its own backend. Any Feathers-compatible service (MongoDB, etc.) can replace it.

## Prerequisites

### 1. Install dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Start Redis

feathers-tasks uses BullMQ which requires Redis. Use the `k-redis` helper from [kalisio/development](https://github.com/kalisio/development):

```bash
# First time only — symlink the helper scripts
cd /path/to/development
./install-kalisio-tools.sh

# Set the data directory (add to ~/.bashrc to make it permanent)
export REDIS_DATA_DIR=/path/to/redis-data

k-redis
```

### 3. Start Kano

```bash
k-dev kalisio apps
```

Kano frontend: `http://localhost:8086`

### 4. Start Kapture

```bash
cd /path/to/kapture
yarn
APP_URL=http://localhost:8086 \
APP_NAME=kano \
APP_JWT= \
yarn start
```

## Running

```bash
cd examples/kapture-tasks
KAPTURE_URL=http://localhost:3000 pnpm dev
```

This starts both processes in parallel:
- **Feathers server** → `http://localhost:3030`
- **Vite client** → `http://localhost:8080`

Separate terminals (recommended to see logs clearly):

```bash
# Terminal 1
KAPTURE_URL=http://localhost:3000 pnpm dev:server

# Terminal 2
pnpm dev:client
```

## Server endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/templates` | List available PDF templates |
| `GET` | `/templates/:name` | Return a template JSON (consumed by pdfme Form) |
| `GET` | `/download/:id` | Stream task result as binary file |
| `GET` | `/admin/tasks` | Bull Board — queue and job inspector |
