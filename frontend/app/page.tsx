"use client";
import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress, formatEther } from 'viem';
import { TICKETING_CONTRACT_ABI } from '../utils/abis';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export default function Home() {
  const [contractAddress, setContractAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read Ticket Price if address is valid
  const isValidAddress = isAddress(contractAddress);
  const { data: ticketPrice, isLoading: isLoadingPrice } = useReadContract({
    address: isValidAddress ? contractAddress as `0x${string}` : undefined,
    abi: TICKETING_CONTRACT_ABI,
    functionName: 'TICKET_PRICE',
    query: {
      enabled: isValidAddress
    }
  });

  // Write Hook
  const { writeContract, data: hash, isPending: isMinting, error: mintError, reset: resetWrite } = useWriteContract();

  // Wait for Transaction Receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Effect to handle success state syncing
  // We use this effect to ensure "Success" only shows when isConfirmed BECOMES true implementation-wise
  // and we can clear it manually when starting a new mint.
  if (isConfirmed && !showSuccess && !isConfirming && hash) {
    setShowSuccess(true);
  }

  const handleMint = () => {
    setShowSuccess(false);
    setErrorMessage(null);
    resetWrite(); // Clear previous errors/success from wagmi state

    if (!isValidAddress || !ticketPrice) return;

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: TICKETING_CONTRACT_ABI,
      functionName: 'mintTicket',
      value: ticketPrice
    }, {
      onError: (err) => {
        // Catch immediate rejection (e.g. user denied)
        setErrorMessage(extractError(err));
      }
    });
  };

  // Improved Error Extraction
  const extractError = (err: any): string => {
    if (!err) return "Unknown Error";

    // console.log("Mint Error Debug:", err); // For developer debugging if needed

    const msg = err.shortMessage || err.message || err.toString();

    // Check specific contract errors
    if (msg.includes("WalletLimitExceeded")) return "Wallet Limit Exceeded (Max 2 per wallet).";
    if (msg.includes("SupplyExhausted")) return "Sold Out!";
    if (msg.includes("EntryPeriodExpired")) return "Entry Period Expired.";
    if (msg.includes("TicketAlreadyUsed")) return "Ticket Already Used.";

    // Fallback for generic errors
    if (msg.includes("User rejected")) return "Transaction rejected by user.";
    if (msg.includes("insufficient funds")) return "Insufficient Funds.";

    return msg.split('\n')[0].substring(0, 100);
  };

  // Sync hook error to local state if it happens asynchronously
  if (mintError && !errorMessage) {
    setErrorMessage(extractError(mintError));
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-between p-8 md:p-24 text-white bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/mainPage.png')" }}
    >
      <div className="z-10 w-full max-w-5xl flex items-center justify-between font-mono text-sm">
        <p className="flex justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit rounded-xl p-4 text-white">
          dTicket: Decentralized Event Ticketing
        </p>
        <div className="backdrop-blur-md bg-black/30 rounded-xl">
          <ConnectButton />
        </div>
      </div>

      {/* Minting Section */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg">
        <div className="bg-black/60 backdrop-blur-xl p-8 rounded-2xl border border-zinc-700 shadow-2xl w-full text-center space-y-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Mint Official Ticket
          </h1>

          <div className="space-y-2 text-left">
            <label className="text-sm text-zinc-400 ml-1">Event Contract Address</label>
            <input
              type="text"
              placeholder="0x..."
              className="w-full bg-zinc-900/80 border border-zinc-600 rounded-lg p-3 text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value);
                setShowSuccess(false); // Reset UI on input change
                setErrorMessage(null);
              }}
            />
          </div>

          {isValidAddress && (
            <div className="bg-zinc-800/50 p-4 rounded-lg flex justify-between items-center border border-zinc-700">
              <span className="text-zinc-400">Price:</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {isLoadingPrice ? "Loading..." : ticketPrice ? `${formatEther(ticketPrice)} ETH` : "Unknown"}
              </span>
            </div>
          )}

          <div className="bg-yellow-900/30 border border-yellow-700/50 p-3 rounded-lg">
            <p className="text-yellow-200/80 text-xs font-medium">
              Please double check the contract address and ticket price.
            </p>
          </div>

          <button
            onClick={handleMint}
            disabled={!isValidAddress || !ticketPrice || isMinting || isConfirming}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25"
          >
            {isMinting ? "Minting..." : isConfirming ? "Confirming..." : "MINT TICKET"}
          </button>

          {errorMessage && <p className="text-red-400 text-sm mt-2 font-mono break-all">{errorMessage}</p>}
          {showSuccess && <p className="text-green-400 text-sm mt-2 font-bold animate-pulse">Ticket Minted Successfully!</p>}
        </div>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left gap-4 bg-black/50 p-6 rounded-xl backdrop-blur-md">

        <Link href="/create-organization" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Create Organization{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Deploy a new event and start selling tickets.
          </p>
        </Link>

        <Link href="/organizer-dashboard" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Organizer Dashboard{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Manage your events, scan tickets, and withdraw funds.
          </p>
        </Link>

        <Link href="/my-tickets" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            My Tickets{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            View your purchased tickets and QR codes.
          </p>
        </Link>

        <Link href="/vote" className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Vote{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Rate events you attended to ensure quality control.
          </p>
        </Link>

      </div>
    </main>
  );
}
