import { ethers } from "hardhat";
import { TicketingContract } from "../typechain-types";

async function main() {
    const [deployer, user1] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // 1. Deploy Factory
    const Factory = await ethers.getContractFactory("TicketingFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    console.log("Factory deployed to:", factory.target);

    // 2. Create Event
    const currentTimestamp = Math.floor(Date.now() / 1000);
    // Refund deadline is start - 6 hours.
    // If we want to refund NOW, start date must be > now + 6 hours.
    // Let's set start date to now + 24 hours (86400 seconds)
    const eventStartDate = currentTimestamp + 86400;
    const entryDuration = 3600; // 1 hour
    const ticketPrice = ethers.parseEther("0.1");

    // Create event
    const tx = await factory.createEvent(
        "Test Event",
        "Description",
        100, // Max Supply
        ticketPrice,
        eventStartDate,
        entryDuration
    );
    const receipt = await tx.wait();

    // Get Event Address from logs or getter
    const events = await factory.getAllEvents();
    const eventAddress = events[0];
    console.log("Event deployed to:", eventAddress);

    const ticketingContract = await ethers.getContractAt("TicketingContract", eventAddress) as unknown as TicketingContract;

    // 3. User1 Mints Ticket
    console.log("Minting ticket for User1...");
    await ticketingContract.connect(user1).mintTicket({ value: ticketPrice });

    const balanceBeforeRefund = await ethers.provider.getBalance(user1.address);
    console.log("User1 Balance before refund:", ethers.formatEther(balanceBeforeRefund));

    const ownerOfToken1 = await ticketingContract.ownerOf(1);
    console.log("Owner of Token 1:", ownerOfToken1);
    if (ownerOfToken1 !== user1.address) throw new Error("Mint failed or owner incorrect");

    const ticketStatsBefore = await ticketingContract.tickets(1);
    console.log("Ticket Status Before:", ticketStatsBefore.status); // Should be 1 (ACTIVE)

    // 4. Request Refund
    console.log("Requesting Refund...");
    // We need to verify that refund does NOT burn (send to 0x0) but sends to Contract.
    // And sends money back.

    // NOTE: Transaction cost will be deducted from balance, so balance check is approx.
    const refundTx = await ticketingContract.connect(user1).requestRefund(1);
    await refundTx.wait();

    // 5. Verify State
    const balanceAfterRefund = await ethers.provider.getBalance(user1.address);
    console.log("User1 Balance after refund:", ethers.formatEther(balanceAfterRefund));

    if (balanceAfterRefund <= balanceBeforeRefund) {
        console.error("Balance did not increase! (Note: Gas fees might affect this if increase is small, but 0.1 ETH should be visible)");
    } else {
        console.log("Balance increased (refund successful).");
    }

    const ownerAfter = await ticketingContract.ownerOf(1);
    console.log("Owner of Token 1 after refund:", ownerAfter);

    if (ownerAfter === eventAddress) {
        console.log("SUCCESS: Ticket transferred to Contract.");
    } else {
        console.error("FAILURE: Ticket not owned by contract. Owned by:", ownerAfter);
    }

    const ticketStatsAfter = await ticketingContract.tickets(1);
    console.log("Ticket Status After:", ticketStatsAfter.status);

    // Status 0: FOR_SALE, 1: ACTIVE, 2: BURNED
    if (ticketStatsAfter.status == 0n) {
        console.log("SUCCESS: Ticket Status is FOR_SALE (0).");
    } else {
        console.error("FAILURE: Ticket Status is", ticketStatsAfter.status, "Expected 0.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
