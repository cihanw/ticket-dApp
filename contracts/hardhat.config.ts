import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // amoy: {
    //   url: "https://rpc-amoy.polygon.technology/",
    //   accounts: [process.env.PRIVATE_KEY || ""],
    // },
  },
};

export default config;
