"use client";
import React, { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import Link from "next/link";

const ABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "scanTicket",
        "outputs": [{ "internalType": "bool", "name": "valid", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function OrganizerPage() {
    const [payload, setPayload] = useState("");
    const [scanResult, setScanResult] = useState<null | { valid: boolean, msg: string }>(null);
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const handleScan = async () => {
        try {
            const data = JSON.parse(payload);
            // In a real app, we verify the signature here off-chain using 'viem' verifyMessage
            // For this demo, we trust the payload has the ID and just try to burn it on chain.

            console.log("Scanning ID:", data.id);

            writeContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: 'scanTicket',
                args: [BigInt(data.id)]
            });

        } catch (e) {
            setScanResult({ valid: false, msg: "Invalid JSON Payload" });
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
            <Link href="/" className="mb-8 hover:underline text-zinc-400">← Back</Link>
            <h1 className="text-3xl font-bold mb-8">Organizer Gatekeeper</h1>

            <div className="w-full max-w-md p-6 bg-zinc-900 rounded-xl border border-zinc-800">
                <label className="block text-sm font-medium mb-2 text-zinc-400">Paste QR Payload</label>
                <textarea
                    className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-md p-2 font-mono text-xs text-green-400 focus:outline-none focus:border-blue-500"
                    placeholder='{"id": 1, "owner": "0x...", "sig": "0x..."}'
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                />

                <button
                    onClick={handleScan}
                    disabled={!payload || isPending}
                    className="w-full mt-4 py-3 bg-blue-600 rounded-md font-bold hover:bg-blue-500 disabled:opacity-50"
                >
                    {isPending ? "Processing on Chain..." : "Validate Entry"}
                </button>

                {error && (
                    <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-md text-red-200 text-sm">
                        <p className="font-bold">Error:</p>
                        <p>{error.message.includes("TicketAlreadyUsed") ? "Ticket Already Used!" : error.message}</p>
                    </div>
                )}

                {isConfirmed && (
                    <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-md text-green-200 text-sm">
                        <p className="font-bold">Success!</p>
                        <p>Ticket validated and burned on-chain.</p>
                    </div>
                )}

                {scanResult && !scanResult.valid && (
                    <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-md text-red-200 text-sm">
                        <p>{scanResult.msg}</p>
                    </div>
                )}
            </div>
        </main>
    )
}
