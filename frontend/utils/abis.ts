export const TICKETING_FACTORY_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "contractAddress",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "organizer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            }
        ],
        "name": "EventCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "allEvents",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_name",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_description",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_maxSupply",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_ticketPrice",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_eventStartDate",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_entryDuration",
                "type": "uint256"
            }
        ],
        "name": "createEvent",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllEvents",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "organizer",
                "type": "address"
            }
        ],
        "name": "getOrganizerEvents",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "organizerEvents",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const TICKETING_CONTRACT_ABI = [
    {
        "inputs": [],
        "name": "eventName",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "eventDescription",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "scanTicket",
        "outputs": [{ "internalType": "bool", "name": "valid", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "votingDeadline",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "EntryPeriodExpired",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "TicketAlreadyUsed",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "UnauthorizedAccess",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "TICKET_PRICE",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "mintTicket",
        "outputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "held", "type": "uint256" }],
        "name": "WalletLimitExceeded",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "SupplyExhausted",
        "type": "error"
    },
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "ownerOf",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "stats",
        "outputs": [
            { "internalType": "uint256", "name": "totalMinted", "type": "uint256" },
            { "internalType": "uint256", "name": "totalSold", "type": "uint256" },
            { "internalType": "uint256", "name": "totalEntered", "type": "uint256" },
            { "internalType": "uint256", "name": "totalVoted", "type": "uint256" },
            { "internalType": "uint256", "name": "positiveVotes", "type": "uint256" },
            { "internalType": "bool", "name": "fundsWithdrawn", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "tickets",
        "outputs": [
            { "internalType": "uint8", "name": "status", "type": "uint8" },
            { "internalType": "bool", "name": "hasVoted", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "internalType": "bool", "name": "isPositive", "type": "bool" }
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "AlreadyVoted",
        "type": "error"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "VoteEligibilityFailed",
        "type": "error"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "requestRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "current", "type": "uint256" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "name": "RefundPeriodExpired",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "withdrawFunds",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "FundsAlreadyProcessed",
        "type": "error"
    }
] as const;
