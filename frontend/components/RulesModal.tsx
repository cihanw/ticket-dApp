"use client";
import React from 'react';

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white text-xl"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold mb-6 text-white border-b border-zinc-800 pb-4">
                    Decentralized Ticket App Rules
                </h2>

                <div className="space-y-6 text-zinc-300">

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">1. Attendance Threshold (Fund Burning)</h3>
                        <p className="text-sm">
                            If less than <strong>30%</strong> of sold tickets result in a verified check-in, the event funds are automatically sent to the burn address (0x0...) rather than the organizer's wallet. This ensures organizers are incentivized to hold real events.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">2. Quality Control (Voting Mechanism)</h3>
                        <p className="text-sm">
                            Post-event, verified attendees can vote on the event quality. If more than <strong>50%</strong> of the verified attendees cast a negative vote, the funds are burned.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">3. Refund Policy (Time-Locked)</h3>
                        <p className="text-sm">
                            Ticket holders may execute a <code>refund()</code> function permissionlessly (without organizer approval) up to <strong>6 hours prior</strong> to the Event Start Date.
                            <br />
                            <span className="text-red-400 text-xs mt-1 block">Refund Lock: Refunds are strictly disabled within the 6-hour window preceding the event start time.</span>
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">4. Non-Transferability (Soulbound)</h3>
                        <p className="text-sm">
                            Tickets are Soulbound (SBT). The <code>transfer</code> and <code>transferFrom</code> functions revert for any transfer between wallets.
                            <br />
                            <em className="text-xs text-zinc-500">Excludes minting and burning/refunding transfers.</em>
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">5. Minting Cap</h3>
                        <p className="text-sm">
                            There is a hard cap of <strong>2 tickets</strong> per wallet address.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">6. Entry Deadline Logic</h3>
                        <p className="text-sm">
                            Check-ins attempted after <code>EventStartDate + EntryDuration</code> must revert and will be invalid.
                            <br />
                            <span className="text-emerald-400 text-xs mt-1 block">This Entry Deadline value will be explicitly displayed to users on the public Minting Page.</span>
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">7. Fund Release Policy</h3>
                        <p className="text-sm">
                            Funds remain locked in the smart contract until the Voting Deadline expires (Event Start + 24h). You may only withdraw funds after this deadline if all attendance and voting conditions are met; otherwise, funds are burned.
                        </p>
                    </section>
                </div>
                <div className="mt-8 pt-4 border-t border-zinc-800 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-semibold"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
}
