import type { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig } from "hardhat/types";
import { HardhatPluginError } from "hardhat/plugins";
import { extendConfig, subtask, task, types } from "hardhat/config";
import * as path from "path";
import type { InlineConfig } from "vite";
import { createServer, build, preview } from "vite";
import * as pkg from "../package.json";

// Add our types to the Hardhat config
declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    vite?: InlineConfig;
  }

  interface HardhatConfig {
    vite: InlineConfig;
  }
}

export const PLUGIN_NAME = pkg.name;
export const PLUGIN_VERSION = pkg.version;

export type Commands = "serve" | "dev" | "build" | "preview";
export type EnvOverrides = Record<string, any>;
export const TASK_VITE = "vite";
export const TASK_VITE_SERVE = "vite:serve";
export const TASK_VITE_BUILD = "vite:build";
export const TASK_VITE_PREVIEW = "vite:preview";

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  // Below are some gnarly target overrides to get Vite to support native BigInts,
  // which is common in web3 projects
  const build_target = ["es2020"];
  if (userConfig.vite?.build) {
    if (Array.isArray(userConfig.vite.build.target)) {
      build_target.push(...userConfig.vite.build.target);
    }
    if (typeof userConfig.vite.build.target === "string") {
      if (userConfig.vite.build.target.toLowerCase() !== "es2020") {
        build_target.push(userConfig.vite.build.target);
      }
    }
  }

  const optimizeDeps_esbuildOptions_esbuildTarget = ["es2020"];
  if (userConfig.vite?.optimizeDeps?.esbuildOptions) {
    if (Array.isArray(userConfig.vite.optimizeDeps.esbuildOptions.target)) {
      optimizeDeps_esbuildOptions_esbuildTarget.push(...userConfig.vite.optimizeDeps.esbuildOptions.target);
    }
    if (typeof userConfig.vite.optimizeDeps.esbuildOptions.target === "string") {
      if (userConfig.vite.optimizeDeps.esbuildOptions.target.toLowerCase() !== "es2020") {
        optimizeDeps_esbuildOptions_esbuildTarget.push(userConfig.vite.optimizeDeps.esbuildOptions.target);
      }
    }
  }

  config.vite = {
    // Users can override this but we want to default to `false` instead of `true`
    clearScreen: false,
    // Users can override this but we want to default to using hardhat's cache
    cacheDir: path.join(config.paths.cache, ".vite"),
    // Users can override this but we default the root to hardhat's root
    root: config.paths.root,
    ...userConfig.vite,
    build: {
      ...userConfig.vite?.build,
      // Adding es2020 target is needed to support BigInt out-of-the-box
      target: build_target,
    },
    optimizeDeps: {
      ...userConfig.vite?.optimizeDeps,
      esbuildOptions: {
        ...userConfig.vite?.optimizeDeps?.esbuildOptions,
        // Adding es2020 target is needed to support BigInt out-of-the-box
        target: optimizeDeps_esbuildOptions_esbuildTarget,
      },
    },
  };
});

subtask(TASK_VITE_SERVE, viteServe).addOptionalParam(
  "env",
  "JSON object to be merged with Vite environment variables",
  {},
  types.json
);

async function viteServe(args: { env: EnvOverrides }, hre: HardhatRuntimeEnvironment) {
  const server = await createServer(hre.config.vite);

  for (const [key, value] of Object.entries(args.env)) {
    server.config.env[key] = value;
  }

  await server.listen();

  server.printUrls();

  return server;
}

subtask(TASK_VITE_BUILD, viteBuild).addOptionalParam(
  "env",
  "JSON object to be merged with Vite environment variables",
  {},
  types.json
);

async function viteBuild(args: { env: EnvOverrides }, hre: HardhatRuntimeEnvironment) {
  const importReplacements: EnvOverrides = {};
  for (const [key, value] of Object.entries(args.env)) {
    importReplacements[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return build({
    ...hre.config.vite,
    define: {
      ...hre.config.vite.define,
      ...importReplacements,
    },
  });
}

subtask(TASK_VITE_PREVIEW, vitePreview).addOptionalParam(
  "env",
  "JSON object to be merged with Vite environment variables",
  {},
  types.json
);

async function vitePreview(args: { env: EnvOverrides }, hre: HardhatRuntimeEnvironment) {
  await hre.run(TASK_VITE_BUILD, { env: args.env });

  const server = await preview(hre.config.vite);

  server.printUrls();

  return server;
}

task(TASK_VITE, "Runs Vite commands in the context of Hardhat", vite)
  .addOptionalPositionalParam("command", "The Vite command to run (serve, build, preview)", undefined, types.string)
  .addOptionalParam("env", "JSON object to be merged with Vite environment variables", {}, types.json);

async function vite(args: { command?: Commands; env: EnvOverrides }, hre: HardhatRuntimeEnvironment) {
  switch (args.command) {
    case "build": {
      return await hre.run(TASK_VITE_BUILD, { env: args.env });
    }
    case "preview": {
      const server: Awaited<ReturnType<typeof preview>> = await hre.run(TASK_VITE_PREVIEW, {
        env: args.env,
      });
      return waitUntilClosed(server.httpServer);
    }
    case "serve":
    case "dev":
    default: {
      const server: Awaited<ReturnType<typeof createServer>> = await hre.run(TASK_VITE_SERVE, {
        env: args.env,
      });

      return Promise.all([waitUntilClosed(server.httpServer), waitUntilClosed(server.ws)]);
    }
  }
}

// Utility similar to the function hardhat uses to keep the `hardhat node` open
function waitUntilClosed(
  ee?: {
    on: (evt: string, fn: (result: void) => void) => void;
  } | null
): Promise<void> {
  if (!ee) {
    return Promise.reject(new HardhatPluginError(PLUGIN_NAME, "Server not available"));
  }

  return new Promise((resolve, reject) => {
    ee.on("close", resolve);
    ee.on("error", reject);
  });
}
