"use client";

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TICKETING_FACTORY_ABI, TICKETING_CONTRACT_ABI } from '../../utils/abis';
import { FACTORY_ADDRESS } from '../../utils/contractAddress';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';



type VoteTicket = {
    contractAddress: string;
    eventName: string;
    tokenId: string;
    hasVoted: boolean;
};

export default function VotePage() {
    const { address: userAddress, isConnected } = useAccount();
    const publicClient = usePublicClient();

    const [tickets, setTickets] = useState<VoteTicket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Voting State
    const { writeContract, data: hash, isPending: isVoting, error: voteError, reset: resetVote } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // 1. Get All Events
    const { data: allEvents, refetch: refetchEvents } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: TICKETING_FACTORY_ABI,
        functionName: 'getAllEvents',
    });

    const fetchTickets = async () => {
        if (!isConnected || !userAddress || !allEvents || !publicClient) return;
        setIsLoading(true);
        setTickets([]);
        const foundTickets: VoteTicket[] = [];

        try {
            for (const eventAddress of allEvents) {
                try {
                    const balance = await publicClient.readContract({
                        address: eventAddress,
                        abi: TICKETING_CONTRACT_ABI,
                        functionName: 'balanceOf',
                        args: [userAddress]
                    });

                    if (Number(balance) > 0) {
                        const name = await publicClient.readContract({
                            address: eventAddress,
                            abi: TICKETING_CONTRACT_ABI,
                            functionName: 'eventName'
                        });

                        const stats = await publicClient.readContract({
                            address: eventAddress,
                            abi: TICKETING_CONTRACT_ABI,
                            functionName: 'stats'
                        });
                        const totalMinted = Number(stats[0]);

                        let found = 0;
                        for (let i = 1; i <= totalMinted; i++) {
                            if (found >= Number(balance)) break;

                            try {
                                const owner = await publicClient.readContract({
                                    address: eventAddress,
                                    abi: TICKETING_CONTRACT_ABI,
                                    functionName: 'ownerOf',
                                    args: [BigInt(i)]
                                });

                                if (owner.toLowerCase() === userAddress.toLowerCase()) {
                                    // Check Status
                                    const ticketData = await publicClient.readContract({
                                        address: eventAddress,
                                        abi: TICKETING_CONTRACT_ABI,
                                        functionName: 'tickets',
                                        args: [BigInt(i)]
                                    });

                                    const status = ticketData[0]; // status
                                    const hasVoted = ticketData[1]; // hasVoted

                                    // Status 2 = BURNED
                                    if (status === 2) {
                                        foundTickets.push({
                                            contractAddress: eventAddress,
                                            eventName: String(name),
                                            tokenId: String(i),
                                            hasVoted: hasVoted
                                        });
                                    }
                                    found++;
                                }
                            } catch (e) { }
                        }
                    }
                } catch (err) { }
            }
            setTickets(foundTickets);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [userAddress, isConnected, allEvents, publicClient]);

    // Handle Vote
    const handleVote = (ticket: VoteTicket, isPositive: boolean) => {
        resetVote();
        setErrorMsg(null);
        setSuccessMsg(null);

        writeContract({
            address: ticket.contractAddress as `0x${string}`,
            abi: TICKETING_CONTRACT_ABI,
            functionName: 'vote',
            args: [BigInt(ticket.tokenId), isPositive]
        }, {
            onError: (err: any) => {
                const msg = err.shortMessage || err.message || "";
                if (msg.includes("AlreadyVoted")) setErrorMsg("You have already voted on this ticket.");
                else if (msg.includes("VoteEligibilityFailed")) setErrorMsg("Not eligible to vote (Must be attendee).");
                else setErrorMsg(msg.split('\n')[0].substring(0, 100));
            }
        });
    };

    // Effect for success/refresh
    useEffect(() => {
        if (isConfirmed && hash) {
            setSuccessMsg("Vote cast successfully!");
            // Short delay to let chain update before refresh
            setTimeout(() => {
                fetchTickets();
            }, 2000);
        }
    }, [isConfirmed, hash]);

    return (
        <main className="flex min-h-screen flex-col items-center p-8 bg-zinc-950 text-white font-mono">
            {/* Header */}
            <div className="z-10 w-full max-w-5xl flex items-center justify-between font-mono text-sm mb-12">
                <Link href="/" className="flex justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit rounded-xl p-4 text-white hover:bg-zinc-800 transition-colors">
                    &lt; Back to Main Page
                </Link>
                <div className="backdrop-blur-md bg-black/30 rounded-xl">
                    <ConnectButton />
                </div>
            </div>

            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600 mb-8">
                Vote on Events
            </h1>

            <p className="text-zinc-500 mb-8 max-w-lg text-center">
                Only tickets that have been scanned (attended) are eligible to vote.
                Your vote helps determine if the organizer receives their funds.
            </p>

            {errorMsg && <div className="bg-red-900/50 border border-red-700 p-4 rounded-xl mb-6 text-red-200">{errorMsg}</div>}
            {successMsg && <div className="bg-green-900/50 border border-green-700 p-4 rounded-xl mb-6 text-green-200 animate-pulse">{successMsg}</div>}

            {isVoting && <div className="mb-6 text-yellow-400 animate-pulse">Confirming Vote in Wallet...</div>}
            {isConfirming && <div className="mb-6 text-blue-400 animate-pulse">Waiting for transaction confirmation...</div>}

            {!isConnected ? (
                <div className="text-center text-zinc-400 mt-10">
                    <p>Please connect your wallet to vote.</p>
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center mt-20 space-y-4">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-zinc-500 animate-pulse">Finding eligible tickets...</p>
                </div>
            ) : tickets.length === 0 ? (
                <div className="text-center text-zinc-500 mt-10 p-8 border border-zinc-800 rounded-xl w-full max-w-lg">
                    <p className="text-xl mb-4">No eligible tickets found.</p>
                    <p className="text-sm">You must purchase a ticket AND have it scanned by the organizer to vote.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                    {tickets.map((ticket) => (
                        <div
                            key={`${ticket.contractAddress}-${ticket.tokenId}`}
                            className="bg-zinc-900/50 border border-zinc-700 p-6 rounded-xl relative overflow-hidden group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs text-orange-500 uppercase tracking-wider font-bold">Attendee</span>
                                {ticket.hasVoted && (
                                    <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded">Voted</span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{ticket.eventName}</h3>
                            <p className="text-zinc-500 text-sm mb-6">Ticket #{ticket.tokenId}</p>

                            {!ticket.hasVoted ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleVote(ticket, true)}
                                        disabled={isVoting || isConfirming}
                                        className="bg-green-600/20 hover:bg-green-600/40 border border-green-600/50 text-green-400 py-3 rounded-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <span>👍</span> Positive
                                    </button>
                                    <button
                                        onClick={() => handleVote(ticket, false)}
                                        disabled={isVoting || isConfirming}
                                        className="bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-red-400 py-3 rounded-lg font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <span>👎</span> Negative
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center bg-zinc-800/50 p-3 rounded-lg text-zinc-400 text-sm italic">
                                    Thank you for voting!
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
