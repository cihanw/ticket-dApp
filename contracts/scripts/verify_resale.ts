import { ethers } from "hardhat";
import { TicketingContract } from "../typechain-types";

async function main() {
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("Testing with accounts:", deployer.address, user1.address, user2.address);

    const Factory = await ethers.getContractFactory("TicketingFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const eventStartDate = currentTimestamp + 86400;
    const entryDuration = 3600;
    const ticketPrice = ethers.parseEther("0.1");
    // Max Supply = 1 (to force resale logic if we wanted to test supply limits, but 
    // here we just want to ensure we pick up the refunded one)

    // Create event
    const tx = await factory.createEvent(
        "Resale Test Event",
        "Description",
        10, // Max Supply enough for now
        ticketPrice,
        eventStartDate,
        entryDuration
    );
    await tx.wait();

    const events = await factory.getAllEvents();
    const eventAddress = events[0];
    const ticketingContract = await ethers.getContractAt("TicketingContract", eventAddress) as unknown as TicketingContract;

    // 1. User1 Mints Ticket #1
    console.log("User1 buying ticket...");
    await ticketingContract.connect(user1).mintTicket({ value: ticketPrice });

    console.log("Owner of #1:", await ticketingContract.ownerOf(1));

    // 2. User1 Refunds Ticket #1
    console.log("User1 refunding ticket...");
    await ticketingContract.connect(user1).requestRefund(1);

    console.log("Owner of #1 after refund:", await ticketingContract.ownerOf(1)); // Should be contract

    // 3. User2 Mints (should get Ticket #1 from resale stack)
    console.log("User2 buying ticket (expecting resale)...");
    try {
        await ticketingContract.connect(user2).mintTicket({ value: ticketPrice });
        console.log("User2 bought ticket successfully!");
        console.log("Owner of #1:", await ticketingContract.ownerOf(1));
        if ((await ticketingContract.ownerOf(1)) === user2.address) {
            console.log("SUCCESS: Resale worked.");
        } else {
            console.error("FAILURE: User2 does not own ticket #1.");
        }
    } catch (e: any) {
        console.error("FAILURE: User2 mint failed!");
        console.error(e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
