# Secure Event Ticketing DApp

A decentralized event ticketing platform built with Next.js, Hardhat, and Wagmi.

## Features

- **Decentralized Ticketing**: Tickets are ERC-721 NFTs.
- **Organizer Dashboard**: Create events, view sales stats, and scan tickets.
- **User Experience**: Mint tickets, view "My Tickets", and generate QR codes for entry.
- **Refund System**: Users can request refunds. Refunded tickets are returned to the pool for resale.
- **Voting Logic**: Attendees can vote on events after they have been scanned.
- **Automated Configuration**: Frontend automatically connects to the latest deployed contract.

## Prerequisites

- **Node.js** (v18 or later recommended)
- **Git**

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ticket_dApp
```

### 2. Install Dependencies
You need to install dependencies for both the smart contracts and the frontend.

**Contracts:**
```bash
cd contracts
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

## Running the Project

Follow these steps to start the local development environment.

### Step 1: Start the Local Blockchain Node
Open a terminal and run:
```bash
cd contracts
npx hardhat node
```
*Keep this terminal open.*

### Step 2: Deploy Smart Contracts
Open a **second terminal** and run:
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
```
> **Note:** This command automatically updates the frontend configuration (`frontend/utils/contractAddress.ts`) with the new factory address. You do not need to copy-paste addresses manually.

### Step 3: Start the Frontend
Open a **third terminal** and run:
```bash
cd frontend
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

## Usage Guide

1.  **Connect Wallet**: Use the "Connect Wallet" button (uses RainbowKit). For local development, import one of the Hardhat accounts (e.g., Account #0) into your MetaMask.
2.  **Create Organization**: Navigate to "Create Organization" to deploy a new Event Contract.
3.  **Organizer Dashboard**: View your created events.
4.  **Mint Tickets**: Use the event address to mint tickets on the main page.
5.  **My Tickets**: View your tickets, reveal QR codes, or request refunds.
6.  **Refunds**: If you request a refund, the ticket is returned to the contract and becomes available for others to buy.
7.  **Organizer Scan**: Organizers can paste the QR payload in the "Organizer Gatekeeper" page to validate entry.
8.  **Voting**: After a ticket is scanned, the user can vote on the event.

## Troubleshooting

-   **"Nonce too high"**: If you restart the Hardhat node, reset your MetaMask account (Settings > Advanced > Clear activity tab data).
-   **"Contract not found"**: Ensure you have deployed the contracts *after* starting the node, and that the frontend uses the correct network (Localhost).
