# hardhat-vite

Hardhat plugin wrapping Vite to configure and launch dApps.

## What

When developing a dApp, it is common to start the `hardhat node` and deploy contracts before starting whichever bundler the client code uses. This plugin wraps the Vite, a newer & very fast, bundler and exposes the commands as a Hardhat task.

You can either use it at the command line with `hardhat vite serve` or you could execute it after your `hardhat node` is ready, by wrapping the `"node:server-ready"` task:

```js
import { subtask } from "hardhat/config";
import { TASK_NODE_SERVER_READY } from "hardhat/builtin-tasks/task-names";

subtask(TASK_NODE_SERVER_READY, nodeReady);

async function nodeReady(args, hre, runSuper) {
  await runSuper(args);

  await hre.run("deploy");

  await hre.run("vite", {
    command: "serve",
    // Adding things here will be available in `import.meta.env`
    env: {
      RPC_URL: `http://${args.address}:${args.port}`,
    },
  });
}
```

## Installation

```bash
npm install hardhat-vite
```

Import the plugin in your `hardhat.config.js`:

```js
require("hardhat-vite");
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "hardhat-vite";
```

## Tasks

This plugin adds the `vite` task which accepts the Vite commands: `serve` (or `dev`), `build`, and `preview`. It can also be provided a JSON object of environment variable overrides.

```bash
Usage: hardhat [GLOBAL OPTIONS] vite [--env <JSON>] [command]

OPTIONS:

  --env	JSON object to be merged with Vite environment variables (default: {})

POSITIONAL ARGUMENTS:

  command	The Vite command to run (serve, build, preview)

vite: Runs Vite commands in the context of Hardhat

For global options help run: hardhat help
```

## Basic configuration

This plugin doesn't require any configuration, but allows all Vite options to be specified inside your `hardhat.config.js`. You may still choose to use a `vite.config.js` file, too!

See Vite's [config documentation](https://vitejs.dev/config/) for all the available options.
