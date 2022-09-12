// We load the plugin here.
import type { HardhatUserConfig } from "hardhat/types";

import "../../../";

const config: HardhatUserConfig = {
  solidity: "0.8.10",
  vite: {
    build: {
      target: "es2020",
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "es2020",
      },
    },
  },
};

export default config;
