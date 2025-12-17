"use client";
import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TICKETING_FACTORY_ABI, TICKETING_CONTRACT_ABI } from '../../utils/abis';
import { FACTORY_ADDRESS } from '../../utils/contractAddress';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';



// Sub-component for individual Event Card
function EventCard({ address, onSelect, isSelected }: { address: `0x${string}`, onSelect: (addr: `0x${string}`) => void, isSelected: boolean }) {
    // Fetch Event Name
    const { data: eventName } = useReadContract({
        address: address,
        abi: TICKETING_CONTRACT_ABI,
        functionName: 'eventName',
    });

    // Fetch Event Description
    const { data: eventDescription } = useReadContract({
        address: address,
        abi: TICKETING_CONTRACT_ABI,
        functionName: 'eventDescription',
    });

    // Fetch Voting Deadline to derive Start Date
    const { data: votingDeadline } = useReadContract({
        address: address,
        abi: TICKETING_CONTRACT_ABI,
        functionName: 'votingDeadline',
    });

    const startDateDisplay = React.useMemo(() => {
        if (!votingDeadline) return "Loading Date...";
        // votingDeadline is BigInt (seconds)
        // Start Date = votingDeadline - 24h (86400 seconds)
        const startTimestamp = Number(votingDeadline) - 86400;
        return new Date(startTimestamp * 1000).toLocaleString();
    }, [votingDeadline]);

    return (
        <div
            onClick={() => onSelect(address)}
            className={`p-6 rounded-xl border cursor-pointer transition-all ${isSelected
                ? 'bg-blue-900/20 border-blue-500 shadow-blue-500/20 shadow-lg'
                : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
                }`}
        >
            <h3 className="text-xl font-bold text-white mb-2">{eventName as string || "Loading..."}</h3>
            <p className="text-zinc-400 text-sm mb-2 line-clamp-2">{eventDescription as string || "No description"}</p>
            <p className="text-emerald-400 text-xs font-mono mb-2">Start: {startDateDisplay}</p>
            <p className="text-xs font-mono text-zinc-600 truncate">{address}</p>
        </div>
    );
}

export default function OrganizerDashboard() {
    const { address: userAddress, isConnected } = useAccount();
    const [selectedEvent, setSelectedEvent] = useState<`0x${string}` | null>(null);
    const [tokenIdToScan, setTokenIdToScan] = useState('');

    // Fetch all events for this organizer
    const { data: myEvents, isLoading: isLoadingEvents } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: TICKETING_FACTORY_ABI,
        functionName: 'getOrganizerEvents',
        args: [userAddress as `0x${string}`],
        query: {
            enabled: !!userAddress
        }
    });

    // Fetch Details for Selected Event (votingDeadline, stats)
    const { data: votingDeadline } = useReadContract({
        address: selectedEvent || undefined,
        abi: TICKETING_CONTRACT_ABI,
        functionName: 'votingDeadline',
        query: { enabled: !!selectedEvent }
    });

    const { data: stats, refetch: refetchStats } = useReadContract({
        address: selectedEvent || undefined,
        abi: TICKETING_CONTRACT_ABI,
        functionName: 'stats',
        query: { enabled: !!selectedEvent }
    });

    // Withdrawal Logic
    const { writeContract: withdrawWrite, data: withdrawHash, isPending: isWithdrawing, error: withdrawError } = useWriteContract();
    const { isLoading: isConfirmingWithdraw, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

    const handleWithdraw = () => {
        if (!selectedEvent) return;
        withdrawWrite({
            address: selectedEvent,
            abi: TICKETING_CONTRACT_ABI,
            functionName: 'withdrawFunds'
        });
    };

    const canWithdraw = React.useMemo(() => {
        if (!votingDeadline || !stats) return false;
        const now = Math.floor(Date.now() / 1000);
        // Stats[5] is fundsWithdrawn (bool)
        const fundsWithdrawn = (stats as any)[5];

        return now > Number(votingDeadline) && !fundsWithdrawn;
    }, [votingDeadline, stats]);

    // Derived Status Text
    const withdrawalStatusText = React.useMemo(() => {
        if (!votingDeadline || !stats) return "Loading...";
        const fundsWithdrawn = (stats as any)[5];
        if (fundsWithdrawn) return "Funds Processed (Withdrawn/Burned)";

        const now = Math.floor(Date.now() / 1000);
        if (now <= Number(votingDeadline)) return "Voting Period Active";

        return "Ready to Withdraw";
    }, [votingDeadline, stats]);

    // Write Hook for Scanning
    const { writeContract, data: scanHash, isPending: isScanning, error: scanError } = useWriteContract();
    const { isLoading: isConfirmingScan, isSuccess: isScanSuccess } = useWaitForTransactionReceipt({ hash: scanHash });

    const handleScan = () => {
        if (!selectedEvent || !tokenIdToScan) return;

        try {
            // Prototype Logic: Assuming the "QR Payload" input IS just the Token ID.
            // If we wanted to support real QR payloads, we would decode the JSON/String here.
            // For now, we pass it directly as the ID.
            writeContract({
                address: selectedEvent,
                abi: TICKETING_CONTRACT_ABI,
                functionName: 'scanTicket',
                args: [BigInt(tokenIdToScan)]
            });
        } catch (err) {
            console.error("Scan failed:", err);
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-white p-8 relative">
            {/* Back Button */}
            <Link href="/" className="fixed left-8 top-1/2 -translate-y-1/2 bg-zinc-800 p-3 rounded-full hover:bg-zinc-700 transition-colors shadow-lg z-50 border border-zinc-700 group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-zinc-400 group-hover:text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </Link>

            <div className="max-w-6xl mx-auto pl-16">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Organizer Dashboard
                    </h1>
                    <ConnectButton />
                </div>

                {!isConnected ? (
                    <div className="text-center py-20 bg-zinc-900 rounded-xl border border-zinc-800">
                        <p className="text-zinc-500 mb-4">Please connect your wallet to view your events.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Event List Column */}
                        <div className="lg:col-span-1 space-y-4">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                Your Events
                            </h2>

                            {isLoadingEvents ? (
                                <p className="text-zinc-500 animate-pulse">Loading events...</p>
                            ) : (!myEvents || (myEvents as []).length === 0) ? (
                                <div className="p-8 text-center border border-zinc-800 rounded-xl bg-zinc-900/50">
                                    <p className="text-zinc-500 mb-4">No events found.</p>
                                    <Link href="/create-organization" className="text-blue-400 hover:text-blue-300 text-sm">
                                        Create your first event &rarr;
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(myEvents as `0x${string}`[]).map((evtAddr) => (
                                        <EventCard
                                            key={evtAddr}
                                            address={evtAddr}
                                            onSelect={setSelectedEvent}
                                            isSelected={selectedEvent === evtAddr}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Panel Column */}
                        <div className="lg:col-span-2">
                            {selectedEvent ? (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 h-full">

                                    <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold mb-2">Event Management</h2>
                                            <p className="text-zinc-500 text-sm">Target Contract: <code className="text-purple-400">{selectedEvent}</code></p>
                                        </div>

                                        {/* Withdraw Section */}
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-xs text-zinc-500 font-mono">{withdrawalStatusText}</span>
                                            <button
                                                onClick={handleWithdraw}
                                                disabled={!canWithdraw || isWithdrawing || isConfirmingWithdraw}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${canWithdraw
                                                    ? 'bg-green-600 hover:bg-green-500 text-white'
                                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isWithdrawing || isConfirmingWithdraw ? 'Processing...' : 'Withdraw Funds'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Withdrawal Feedback */}
                                    {(withdrawError || isWithdrawSuccess) && (
                                        <div className="mb-6">
                                            {withdrawError && (
                                                <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm">
                                                    Error: {withdrawError.message.includes("FundsAlreadyProcessed") ? "Already Processed" : withdrawError.message.split('\n')[0]}
                                                </div>
                                            )}
                                            {isWithdrawSuccess && (
                                                <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm">
                                                    Funds processed successfully! (Sent to wallet or burned based on conditions).
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Scan Input */}
                                    <div className="max-w-md mx-auto space-y-6 py-8">
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                                Simulate QR Code Scan (Enter QR Payload)
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={tokenIdToScan}
                                                    onChange={(e) => setTokenIdToScan(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-4 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    placeholder="QR Payload..."
                                                />
                                                <button
                                                    onClick={handleScan}
                                                    disabled={isScanning || !tokenIdToScan}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isScanning ? '...' : 'SCAN'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Feedback States */}
                                        {scanError && (
                                            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm">
                                                <p className="font-bold mb-1">Check-In Failed</p>
                                                <p className="opacity-80">
                                                    {scanError.message.includes('EntryPeriodExpired') ? 'Entry Deadline has passed.' :
                                                        scanError.message.includes('TicketAlreadyUsed') ? 'Ticket already used/burned.' :
                                                            scanError.message.includes('ERC721NonexistentToken') ? 'Invalid Ticket ID.' :
                                                                scanError.message}
                                                </p>
                                            </div>
                                        )}

                                        {isScanSuccess && (
                                            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-center animate-bounce-in">
                                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                </div>
                                                <p className="font-bold text-lg">Check-In Successful!</p>
                                                <p className="text-sm opacity-80">Ticket #{tokenIdToScan} marked as entered.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 border border-zinc-800 border-dashed rounded-xl p-12 bg-zinc-900/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                                    </svg>
                                    <p className="text-lg">Select an event from the list to start scanning.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
