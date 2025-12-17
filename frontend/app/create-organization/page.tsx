"use client";
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { TICKETING_FACTORY_ABI } from '../../utils/abis';
import { RulesModal } from '../../components/RulesModal';
import { FACTORY_ADDRESS } from '../../utils/contractAddress';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

// Updated Factory Address


export default function CreateOrganization() {
    const { isConnected } = useAccount();
    const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        maxSupply: '',
        ticketPrice: '',
        eventStartDate: '',
        entryDuration: ''
    });

    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

    useEffect(() => {
        if (isConfirmed && receipt) {
            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: TICKETING_FACTORY_ABI,
                        data: log.data,
                        topics: log.topics
                    });
                    if (decoded.eventName === 'EventCreated') {
                        // args properties depend on abi definition. 
                        // ABI: event EventCreated(address indexed contractAddress, address indexed organizer, string name);
                        // viem decodes args as an object with named keys if valid ABI
                        const args = decoded.args as unknown as { contractAddress: string };
                        setDeployedAddress(args.contractAddress);
                        break;
                    }
                } catch (e) {
                    // Ignore logs that don't match or fail decode
                    continue;
                }
            }
        }
    }, [isConfirmed, receipt]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDeploy = () => {
        if (!formData.name || !formData.maxSupply || !formData.ticketPrice || !formData.eventStartDate || !formData.entryDuration) {
            alert("Please fill in all fields");
            return;
        }

        try {
            const startTimestamp = Math.floor(new Date(formData.eventStartDate).getTime() / 1000);
            // Entry Duration in seconds. Input is likely hours? Let's assume hours for user friendliness, convert to seconds.
            // Or if input type is number (hours), we multiply by 3600.
            // Let's assume the user enters HOURS.
            const durationSeconds = Number(formData.entryDuration) * 3600;

            writeContract({
                address: FACTORY_ADDRESS,
                abi: TICKETING_FACTORY_ABI,
                functionName: 'createEvent',
                args: [
                    formData.name,
                    formData.description,
                    BigInt(formData.maxSupply),
                    parseEther(formData.ticketPrice), // ETH to Wei
                    BigInt(startTimestamp),
                    BigInt(durationSeconds)
                ]
            });
        } catch (err) {
            console.error("Error preparing transaction:", err);
            alert("Error preparing transaction. Check inputs.");
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-white p-8 relative">
            {/* Floating Back Button */}
            <Link href="/" className="fixed left-8 top-1/2 -translate-y-1/2 bg-zinc-800 p-3 rounded-full hover:bg-zinc-700 transition-colors shadow-lg z-50 border border-zinc-700 group">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-zinc-400 group-hover:text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </Link>

            <div className="max-w-4xl mx-auto pl-16">
                <div className="flex justify-between items-center mb-12">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        Create Organization / New Event
                    </h1>
                    <ConnectButton />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-2 bg-zinc-900 p-8 rounded-xl border border-zinc-800 shadow-xl">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Organization / Event Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Summer Music Festival"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                    placeholder="Event details..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Total Ticket Supply</label>
                                    <input
                                        type="number"
                                        name="maxSupply"
                                        value={formData.maxSupply}
                                        onChange={handleInputChange}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Ticket Price (ETH)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        name="ticketPrice"
                                        value={formData.ticketPrice}
                                        onChange={handleInputChange}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.01"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Event Start Date</label>
                                    <input
                                        type="datetime-local"
                                        name="eventStartDate"
                                        value={formData.eventStartDate}
                                        onChange={handleInputChange}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Entry Deadline (Hours from Start)</label>
                                    <input
                                        type="number"
                                        name="entryDuration"
                                        value={formData.entryDuration}
                                        onChange={handleInputChange}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 24"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Check-ins allowed until: Start Date + {formData.entryDuration || '0'}h
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleDeploy}
                                disabled={!isConnected || isPending}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                            >
                                {isPending ? 'Deploying Contract...' : 'Create Organization & Event'}
                            </button>

                            {writeError && (
                                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm">
                                    Error: {writeError.message}
                                </div>
                            )}

                            {hash && (
                                <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700 break-all">
                                    <p className="text-zinc-400 text-xs mb-1">Transaction Hash:</p>
                                    <p className="font-mono text-sm text-blue-400">{hash}</p>
                                </div>
                            )}

                            {isConfirmed && (
                                <div className="p-6 bg-green-900/20 border border-green-800 rounded-lg text-center animate-in fade-in slide-in-from-bottom-4">
                                    <p className="text-green-400 font-bold text-lg mb-2">Organization Created Successfully!</p>
                                    {deployedAddress && (
                                        <div className="mt-4 p-4 bg-black/40 rounded-lg border border-green-800/50">
                                            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Deployed Event Endpoint</p>
                                            <div className="flex items-center justify-between gap-2 bg-black/40 p-2 rounded border border-zinc-800">
                                                <code className="text-sm font-mono text-white truncate">{deployedAddress}</code>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(deployedAddress)}
                                                    className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
                                                    title="Copy Address"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-2">Use this address for the Minting Page.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Rules Section */}
                    <div className="lg:col-span-1">
                        <div
                            onClick={() => setIsRulesModalOpen(true)}
                            className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer group h-full flex flex-col justify-center items-center text-center shadow-lg"
                        >
                            <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Platform Rules</h3>
                            <p className="text-zinc-400 text-sm">
                                Click here to view the Decentralized Ticket App Rules and Smart Contract Logic.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <RulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
        </main>
    );
}
