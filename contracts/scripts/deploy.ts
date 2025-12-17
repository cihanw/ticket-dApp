import { ethers } from "hardhat";

async function main() {
    const Factory = await ethers.getContractFactory("TicketingFactory");
    const factory = await Factory.deploy();

    await factory.waitForDeployment();

    console.log(`TicketingFactory deployed to ${factory.target}`);
    const fs = require('fs');
    const path = require('path');

    // Update local text file
    fs.writeFileSync('deployment_address.txt', factory.target);

    // Update frontend config
    const frontendConfigPath = path.join(__dirname, '../../frontend/utils/contractAddress.ts');
    const configContent = `export const FACTORY_ADDRESS = "${factory.target}";\n`;
    fs.writeFileSync(frontendConfigPath, configContent);
    console.log(`Updated frontend config at ${frontendConfigPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
