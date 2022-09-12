// We load the plugin here.
import type { HardhatUserConfig } from "hardhat/types";

import "../../../";

const config: HardhatUserConfig = {
  solidity: "0.8.10",
  vite: {
    build: {
      target: ["chrome58", "edge16"],
    },
    optimizeDeps: {
      esbuildOptions: {
        target: ["chrome58", "edge16"],
      },
    },
  },
};

export default config;
