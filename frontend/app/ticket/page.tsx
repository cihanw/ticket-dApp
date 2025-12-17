"use client";
import React, { useState, useEffect } from "react"; // Added useEffect import
import { useAccount, useReadContract, useWriteContract, useSignMessage } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

const ABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "tickets",
        "outputs": [
            { "internalType": "uint8", "name": "status", "type": "uint8" },
            { "internalType": "bool", "name": "hasVoted", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    // We need to implement a way to find *which* token IDs a user owns. 
    // Standard ERC-721 doesn't enumerate tokens by owner easily without Enumerable extension.
    // For this DEMO, we will just check IDs 1 to 20 to see if we own them.
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "ownerOf",
        "outputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "requestRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function TicketPage() {
    const { address } = useAccount();
    const [myTickets, setMyTickets] = useState<any[]>([]);
    const { signMessageAsync } = useSignMessage();
    const [qrPayload, setQrPayload] = useState<string | null>(null);

    // Hacky way to find user tokens for demo without Enumerable
    const { data: balance } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'balanceOf',
        args: [address],
    });

    // We can't easily loop hooks, so we should do this inside a useEffect that calls a specific 'fetch' or manually reading.
    // For simplicity in this generated code, I'll rely on the user knowing their ID or just hardcode checking the first few.
    // Ideally, we would add 'tokenOfOwnerByIndex' to the contract if we wanted this to be easy.

    // Let's IMPROVE the contract plan slightly in future, but for now, we assume I own ID #1 if I bought first.

    // To make this functional without changing contract now:
    // We will simulate "My Tickets" by just showing an input to "Claim ID" or manually check ID 1..5.

    const [checkId, setCheckId] = useState(1);

    // Manually read specific ticket
    const { data: ownerOfResult, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'ownerOf',
        args: [BigInt(checkId)],
    });

    const { data: ticketData } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'tickets',
        args: [BigInt(checkId)],
    }) as any;

    const isOwner = ownerOfResult === address;
    const ticketStatus = ticketData ? ticketData[0] : 0; // 1=Active, 2=Burned

    const generateQR = async () => {
        if (!address) return;
        const timestamp = Math.floor(Date.now() / 1000);
        const msg = `Entry Verification for Ticket #${checkId} at ${timestamp}`;
        const sig = await signMessageAsync({ message: msg });

        const payload = JSON.stringify({
            id: checkId,
            owner: address,
            ts: timestamp,
            sig: sig
        });
        setQrPayload(payload);
    };

    const { writeContract } = useWriteContract();

    const requestRefund = () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'requestRefund',
            args: [BigInt(checkId)]
        });
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
            <Link href="/" className="mb-8 hover:underline text-zinc-400">← Back</Link>
            <h1 className="text-3xl font-bold mb-8">My Tickets</h1>

            <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-lg text-center">
                <div className="mb-6 flex justify-center items-center gap-2">
                    <span>Check Token ID:</span>
                    <input
                        type="number"
                        value={checkId}
                        onChange={(e) => setCheckId(parseInt(e.target.value))}
                        className="bg-zinc-800 rounded px-2 py-1 w-16 text-center"
                    />
                    <button onClick={() => refetch()} className="text-xs bg-zinc-700 px-2 py-1 rounded">Check</button>
                </div>

                {isOwner ? (
                    <div className="flex flex-col items-center">
                        <div className={`text-sm mb-4 px-3 py-1 rounded-full ${ticketStatus === 1 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                            Status: {ticketStatus === 1 ? 'ACTIVE' : ticketStatus === 2 ? 'USED/BURNED' : 'UNKNOWN'}
                        </div>

                        {ticketStatus === 1 && (
                            <>
                                <button
                                    onClick={generateQR}
                                    className="mb-4 px-6 py-2 bg-purple-600 rounded-md font-bold hover:bg-purple-500"
                                >
                                    Reveal QR Code
                                </button>

                                <button
                                    onClick={requestRefund}
                                    className="text-xs text-red-500 hover:text-red-400 underline"
                                >
                                    Request Refund (0.01 ETH)
                                </button>
                            </>
                        )}

                        {qrPayload && ticketStatus === 1 && (
                            <div className="mt-4 p-4 bg-white rounded-xl">
                                <QRCodeSVG value={qrPayload} size={200} />
                                <p className="text-black text-xs mt-2 w-64 break-words opacity-50">
                                    {qrPayload}
                                </p>
                            </div>
                        )}

                        {ticketStatus === 2 && (
                            <p className="text-zinc-500">This ticket has been used. Thank you for attending!</p>
                        )}
                    </div>
                ) : (
                    <p className="text-zinc-500">You do not own Ticket #{checkId}</p>
                )}
            </div>
        </main>
    )
}
