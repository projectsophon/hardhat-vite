import * as path from "path";
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing";
import type { EnvOverrides } from "../";
import type { HardhatRuntimeEnvironment, RunSuperFunction } from "hardhat/types";

describe("hardhat-vite", function () {
  describe("config", function () {
    afterEach("Resetting hardhat", async function () {
      resetHardhatContext();
    });

    it("disables `clearScreen` by default", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-defaults"));

      const hre = require("hardhat");

      assert.equal(hre.config.vite.clearScreen, false);
    });

    it("uses hardhat's cache by default", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-defaults"));

      const hre = require("hardhat");

      assert.equal(hre.config.vite.cacheDir, path.join(hre.config.paths.cache, ".vite"));
    });

    it("uses hardhat's root by default", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-defaults"));

      const hre = require("hardhat");

      assert.equal(hre.config.vite.root, hre.config.paths.root);
    });

    it("adds es2020 target to support native BigInt", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-defaults"));

      const hre = require("hardhat");

      assert.include(hre.config.vite.build.target, "es2020");
      assert.include(hre.config.vite.optimizeDeps.esbuildOptions.target, "es2020");
    });

    it("will not add es2020 if already specified", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-es2020-target"));

      const hre = require("hardhat");

      assert.deepEqual(hre.config.vite.build.target, ["es2020"]);
      assert.deepEqual(hre.config.vite.optimizeDeps.esbuildOptions.target, ["es2020"]);
    });

    it("allows es2020 to coexist with other targets", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-es2022-target"));

      const hre = require("hardhat");

      assert.includeMembers(hre.config.vite.build.target, ["es2020", "es2022"]);
      assert.includeMembers(hre.config.vite.optimizeDeps.esbuildOptions.target, ["es2020", "es2022"]);
    });

    it("adds es2020 to an array of other targets", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-target-array"));

      const hre = require("hardhat");

      assert.includeMembers(hre.config.vite.build.target, ["es2020", "chrome58", "edge16"]);
      assert.includeMembers(hre.config.vite.optimizeDeps.esbuildOptions.target, ["es2020", "chrome58", "edge16"]);
    });
  });

  describe("task: vite serve", function () {
    afterEach("Resetting hardhat", async function () {
      resetHardhatContext();
    });

    it("allows users to start a dev server", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-silent"));

      const hre = require("hardhat");

      const { TASK_VITE_SERVE } = require("../");

      const server = await hre.run(TASK_VITE_SERVE);

      assert.exists(server.httpServer);
      assert.exists(server.ws);

      await server.close();
    });

    it("allows users to provide extra env to dev server", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-silent"));

      const hre = require("hardhat");

      const { TASK_VITE_SERVE } = require("../");

      const server = await hre.run(TASK_VITE_SERVE, {
        env: {
          foo: "bar",
        },
      });

      assert.equal(server.config.env.foo, "bar");

      await server.close();
    });
  });

  describe("task: vite build", function () {
    afterEach("Resetting hardhat", async function () {
      resetHardhatContext();
    });

    it("allows users to build their project", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-silent"));

      const hre = require("hardhat");

      const { TASK_VITE_BUILD } = require("../");

      const { output } = await hre.run(TASK_VITE_BUILD);

      assert.exists(output[0]);
      assert.include(output[0].fileName, "index.");
      assert.include(output[0].fileName, ".js");

      assert.exists(output[1]);
      assert.equal(output[1].fileName, "index.html");
      assert.equal(output[1].type, "asset");
    });

    it("allows users to provide extra env to be replaced in the built files", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-silent"));

      const hre = require("hardhat");

      const { TASK_VITE_BUILD } = require("../");

      const { output } = await hre.run(TASK_VITE_BUILD, {
        env: {
          foo: "bar",
        },
      });

      assert.include(output[0].code, 'console.log("bar")');
    });
  });

  describe("task: vite preview", function () {
    afterEach("Resetting hardhat", async function () {
      resetHardhatContext();
    });

    it("allows users to preview their project", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-silent"));

      const hre = require("hardhat");

      const { TASK_VITE_PREVIEW } = require("../");

      const server = await hre.run(TASK_VITE_PREVIEW);

      assert.exists(server.httpServer);

      await new Promise((resolve) => server.httpServer.close(resolve));
    });

    it("runs build task before preview server is started", async function () {
      process.chdir(path.join(__dirname, "fixture-projects", "hardhat-silent"));

      const { subtask } = require("hardhat/config");
      const hre = require("hardhat");

      const { TASK_VITE_BUILD, TASK_VITE_PREVIEW } = require("../");

      let buildRun = false;
      let passedEnv = {};

      subtask(
        TASK_VITE_BUILD,
        async function (
          args: { env: EnvOverrides },
          hre: HardhatRuntimeEnvironment,
          runSuper: RunSuperFunction<{ env: EnvOverrides }>
        ) {
          buildRun = true;
          passedEnv = args.env;

          await runSuper();
        }
      );

      const server = await hre.run(TASK_VITE_PREVIEW, {
        env: {
          foo: "bar",
        },
      });

      assert.isTrue(buildRun);
      assert.deepEqual(passedEnv, { foo: "bar" });

      await new Promise((resolve) => server.httpServer.close(resolve));
    });
  });
});
