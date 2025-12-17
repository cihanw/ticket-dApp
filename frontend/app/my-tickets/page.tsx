"use client";

import { useEffect, useState } from 'react';
import { useAccount, useReadContract, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TICKETING_FACTORY_ABI, TICKETING_CONTRACT_ABI } from '../../utils/abis';
import { FACTORY_ADDRESS } from '../../utils/contractAddress';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { QRCodeSVG } from 'qrcode.react';



type UserTicket = {
    contractAddress: string;
    eventName: string;
    tokenId: string;
};

type EventData = {
    address: string;
    name: string;
};

export default function MyTickets() {
    const { address: userAddress, isConnected } = useAccount();
    const publicClient = usePublicClient();

    const [tickets, setTickets] = useState<UserTicket[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);
    const [copied, setCopied] = useState(false);

    // Refund State
    const [refundError, setRefundError] = useState<string | null>(null);
    const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

    const { writeContract, data: hash, isPending: isRefunding, error: writeError, reset: resetWrite } = useWriteContract();
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
        const foundTickets: UserTicket[] = [];

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

                                    // Filter out BURNED (2)
                                    if (ticketData[0] !== 2) {
                                        foundTickets.push({
                                            contractAddress: eventAddress,
                                            eventName: String(name),
                                            tokenId: String(i)
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
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [userAddress, isConnected, allEvents, publicClient]);

    // Handle Refund
    const handleRefund = () => {
        if (!selectedTicket) return;
        resetWrite();
        setRefundError(null);
        setRefundSuccess(null);

        writeContract({
            address: selectedTicket.contractAddress as `0x${string}`,
            abi: TICKETING_CONTRACT_ABI,
            functionName: 'requestRefund',
            args: [BigInt(selectedTicket.tokenId)]
        }, {
            onError: (err: any) => {
                const msg = err.shortMessage || err.message || "";
                if (msg.includes("RefundPeriodExpired")) {
                    setRefundError("Refund period expired (Less than 6 hours to event).");
                } else if (msg.includes("UnauthorizedAccess")) {
                    setRefundError("You do not own this ticket.");
                } else {
                    setRefundError(msg.split('\n')[0].substring(0, 100));
                }
            }
        });
    };

    // Refund Success Effect
    useEffect(() => {
        if (isConfirmed && hash) {
            setRefundSuccess("Refund processing successful!");
            // Refresh list
            setTimeout(() => {
                setSelectedTicket(null);
                fetchTickets();
            }, 3000);
        }
    }, [isConfirmed, hash]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
                My Tickets
            </h1>

            {!isConnected ? (
                <div className="text-center text-zinc-400 mt-10">
                    <p>Please connect your wallet to view tickets.</p>
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center mt-20 space-y-4">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-zinc-500 animate-pulse">Scanning blockchain for your tickets...</p>
                </div>
            ) : tickets.length === 0 ? (
                <div className="text-center text-zinc-500 mt-10 p-8 border border-zinc-800 rounded-xl">
                    <p className="text-xl mb-4">No tickets found.</p>
                    <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
                        Go update your collection!
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                    {tickets.map((ticket) => (
                        <div
                            key={`${ticket.contractAddress}-${ticket.tokenId}`}
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setRefundError(null);
                                setRefundSuccess(null);
                                resetWrite();
                            }}
                            className="bg-zinc-900/50 border border-zinc-700 hover:border-purple-500/50 p-6 rounded-xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 group"
                        >
                            <div className="flexjustify-between items-start mb-4">
                                <span className="text-xs text-zinc-500 uppercase tracking-wider">Ticket</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                                {ticket.eventName}
                            </h3>
                            <div className="flex items-end justify-between mt-8">
                                <div className="text-4xl font-black text-zinc-800 group-hover:text-purple-500/20 transition-colors">
                                    #{ticket.tokenId}
                                </div>
                                <button className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg shadow-lg">
                                    Manage
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
                    <div
                        className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl max-w-md w-full shadow-2xl relative flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                            onClick={() => setSelectedTicket(null)}
                        >
                            ✕
                        </button>

                        <h3 className="text-xl font-bold mb-1 text-center">{selectedTicket.eventName}</h3>
                        <p className="text-zinc-500 mb-6 font-mono">Ticket #{selectedTicket.tokenId}</p>

                        <div className="p-4 bg-white rounded-xl mb-6">
                            <QRCodeSVG
                                value={selectedTicket.tokenId}
                                size={200}
                                level="H"
                            />
                        </div>

                        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between mb-4">
                            <div className="text-xs text-zinc-500 font-mono truncate mr-2">
                                Payload: {selectedTicket.tokenId}
                            </div>
                            <button
                                onClick={() => handleCopy(selectedTicket.tokenId)}
                                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                            >
                                {copied ? "COPIED" : "COPY"}
                            </button>
                        </div>

                        <div className="w-full border-t border-zinc-800 pt-4 mt-2">
                            <button
                                onClick={handleRefund}
                                disabled={isRefunding || isConfirming}
                                className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-900 text-red-400 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                {isRefunding || isConfirming ? "Processing Refund..." : "Request Refund"}
                            </button>
                            {refundError && <p className="text-red-400 text-xs mt-2 text-center">{refundError}</p>}
                            {refundSuccess && <p className="text-green-400 text-xs mt-2 text-center animate-pulse">{refundSuccess}</p>}
                        </div>

                        <p className="text-zinc-600 text-xs mt-4 text-center">
                            Show QR code for entry, or Refund if you can't make it (&lt; 6h cutoff).
                        </p>
                    </div>
                </div>
            )}
        </main>
    );
}
