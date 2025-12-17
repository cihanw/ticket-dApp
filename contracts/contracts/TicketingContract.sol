// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TicketingContract is ERC721, Ownable, ReentrancyGuard {
    // ==========================================
    // Custom Errors
    // ==========================================
    error WalletLimitExceeded(uint256 held);
    error SupplyExhausted();
    error RefundPeriodExpired(uint256 current, uint256 deadline);
    error SoulboundTransferBlocked();
    error TicketAlreadyUsed(uint256 tokenId);
    error UnauthorizedAccess();
    error FundsAlreadyProcessed();
    error AlreadyVoted(uint256 tokenId);
    error VotingPeriodExpired(uint256 current, uint256 deadline);
    error VoteEligibilityFailed(uint256 tokenId);
    error AttendanceThresholdNotMet(uint256 entered, uint256 required);
    error InvalidTicketId(uint256 tokenId);
    error EntryPeriodExpired();
    error VotingPeriodNotEnded(uint256 current, uint256 deadline);

    // ==========================================
    // State Variables & Structs
    // ==========================================
    struct EventStats {
        uint256 totalMinted;
        uint256 totalSold;
        uint256 totalEntered;
        uint256 totalVoted;
        uint256 positiveVotes;
        bool fundsWithdrawn;
    }

    struct Ticket {
        uint8 status; // 0: NOTHING, 1: ACTIVE, 2: BURNED (Used)
        bool hasVoted;
    }

    uint8 constant STATUS_FOR_SALE = 0; 
    uint8 constant STATUS_ACTIVE = 1;
    uint8 constant STATUS_BURNED = 2; // Scanned/Used

    // Dynamic Variables set in Constructor
    uint256 public immutable MAX_SUPPLY;
    uint256 public immutable TICKET_PRICE;
    uint256 public constant MAX_PER_WALLET = 2; // Hard cap of 2 per wallet
    
    // Deadlines
    uint256 public immutable refundDeadline;
    uint256 public immutable entryDeadline; // Also acts as Event End for entry purposes? Or just entry cutoff.
    uint256 public immutable votingDeadline;
    
    // Metadata
    string public eventName;
    string public eventDescription;

    EventStats public stats;
    mapping(uint256 => Ticket) public tickets;
    
    // Refunded tickets stack for resale
    // Using an array as a stack
    uint256[] public refundedTicketIds;

    // ==========================================
    // Constructor
    // ==========================================
    constructor(
        address initialOwner,
        string memory _name,
        string memory _description,
        uint256 _maxSupply,
        uint256 _ticketPrice,
        uint256 _eventStartDate,
        uint256 _entryDuration
    ) ERC721("dTicket", "DTK") Ownable(initialOwner) {
        eventName = _name;
        eventDescription = _description;
        MAX_SUPPLY = _maxSupply;
        TICKET_PRICE = _ticketPrice;
        
        // Logic:
        // Refund Policy (Time-Locked): Up to 6 hours prior to Event Start Date.
        refundDeadline = _eventStartDate - 6 hours;
        
        // Entry Deadline: EventStartDate + EntryDuration
        entryDeadline = _eventStartDate + _entryDuration;
        
        // Voting Deadline: EventStartDate + 24 hours (Hardcoded Rule)
        votingDeadline = _eventStartDate + 24 hours;
    }

    // ==========================================
    // Core Function Implementation
    // ==========================================

    /**
     * @notice Purchase a ticket.
     * Checks if there are refunded tickets to resell first.
     */
    function mintTicket() external payable nonReentrant returns (uint256 tokenId) {
        if (msg.value != TICKET_PRICE) revert("Incorrect Value"); 
        if (balanceOf(msg.sender) + 1 > MAX_PER_WALLET) revert WalletLimitExceeded(balanceOf(msg.sender));

        // Check Resale Queue
        if (refundedTicketIds.length > 0) {
            // Pop from stack
            tokenId = refundedTicketIds[refundedTicketIds.length - 1];
            refundedTicketIds.pop();
            
            // Transfer from Contract to User
            // Since contract owns it, we can use _transfer or just transferFrom if allowed
            // We need to bypass the soulbound check for this specific action.
            // Transfer from Contract to User
            // Since contract owns it, we can use _transfer to move token without approval checks
            _transfer(address(this), msg.sender, tokenId);
            
            // Update Stats
            tickets[tokenId].status = STATUS_ACTIVE;
            // totalMinted unchanged
            stats.totalSold++;
        } else {
            // New Mint
            if (stats.totalMinted >= MAX_SUPPLY) revert SupplyExhausted();
            
            stats.totalMinted++;
            tokenId = stats.totalMinted;
            
            _safeMint(msg.sender, tokenId);
            tickets[tokenId].status = STATUS_ACTIVE;
            stats.totalSold++;
        }
    }

    /**
     * @notice Request a refund.
     * Transfers ticket back to contract.
     */
    function requestRefund(uint256 tokenId) external nonReentrant {
        if (block.timestamp >= refundDeadline) revert RefundPeriodExpired(block.timestamp, refundDeadline);
        if (ownerOf(tokenId) != msg.sender) revert UnauthorizedAccess();
        if (tickets[tokenId].status != STATUS_ACTIVE) revert InvalidTicketId(tokenId);
        
        // Transfer to contract
        // Use transferFrom instead of safeTransferFrom to avoid needing onERC721Received in this contract
        transferFrom(msg.sender, address(this), tokenId);

        // Update State
        tickets[tokenId].status = STATUS_FOR_SALE; // Effectively back in pool
        refundedTicketIds.push(tokenId);
        stats.totalSold--;

        // Refund Money
        payable(msg.sender).transfer(TICKET_PRICE);
    }

    /**
     * @notice Scan ticket at entry.
     * Organizer only.
     */
    function scanTicket(uint256 tokenId) external onlyOwner returns (bool valid) {
        if (block.timestamp > entryDeadline) revert EntryPeriodExpired();
        
        // Check if exists
        try this.ownerOf(tokenId) returns (address owner) {
            if (owner == address(0)) revert InvalidTicketId(tokenId);
        } catch {
             revert InvalidTicketId(tokenId);
        }

        if (tickets[tokenId].status == STATUS_BURNED) revert TicketAlreadyUsed(tokenId);
        if (tickets[tokenId].status != STATUS_ACTIVE) revert InvalidTicketId(tokenId);

        // Mark as Entered
        tickets[tokenId].status = STATUS_BURNED;
        stats.totalEntered++;
        
        return true;
    }

    /**
     * @notice Vote on event quality.
     */
    function vote(uint256 tokenId, bool isPositive) external {
        if (block.timestamp > votingDeadline) revert VotingPeriodExpired(block.timestamp, votingDeadline);
        if (ownerOf(tokenId) != msg.sender) revert VoteEligibilityFailed(tokenId);
        // Can only vote if they attended (scanned -> BURNED)
        if (tickets[tokenId].status != STATUS_BURNED) revert VoteEligibilityFailed(tokenId);
        if (tickets[tokenId].hasVoted) revert AlreadyVoted(tokenId);

        tickets[tokenId].hasVoted = true;
        stats.totalVoted++;
        if (isPositive) {
            stats.positiveVotes++;
        }
    }

    /**
     * @notice Settle funds after event.
     * Anyone can call this to trigger the payout or burn.
     * Logic:
     * 1. Check Deadline.
     * 2. Check Conditions (Attendance >= 30% AND NegativeVotes <= 50%).
     * 3. Send to Owner or Burn.
     */
    function withdrawFunds() external nonReentrant {
        if (stats.fundsWithdrawn) revert FundsAlreadyProcessed();
        if (block.timestamp <= votingDeadline) revert VotingPeriodNotEnded(block.timestamp, votingDeadline);
        
        stats.fundsWithdrawn = true; // Prevent re-entrancy / double withdraw

        // 1. Attendance Check
        // If 0 sold, funds are 0, safe to just return or do nothing, but for logic consistency:
        bool attendancePassed = true;
        if (stats.totalSold > 0) {
            // >= 30%
            uint256 required = (stats.totalSold * 30) / 100;
            if (stats.totalEntered < required) {
                attendancePassed = false;
            }
        }

        // 2. Voting Check
        // Negative > 50% => Fail. So Positive + Neutral must be >= 50%? 
        // Specification: "if more than 50% of the verified attendees cast a negative vote, the funds are burned."
        // Verified attendees who voted? Or just total votes? "of the verified attendees cast..." implies totalVoted.
        // If totalVoted = 10, Negative = 6 -> Burn.
        // Negative = totalVoted - positiveVotes.
        // Fail if (totalVoted - positiveVotes) > (totalVoted / 2)
        bool qualityPassed = true;
        if (stats.totalVoted > 0) {
            uint256 negativeVotes = stats.totalVoted - stats.positiveVotes;
            // Using integer division, strict > 50%.
            // Example: 10 votes. > 5 is 6, 7, 8, 9, 10.
            // 50% of 10 is 5. If 6 negative -> Burn.
            if (negativeVotes > (stats.totalVoted / 2)) {
                qualityPassed = false;
            }
        }

        if (attendancePassed && qualityPassed) {
            // Success: Send to Organizer
            payable(owner()).transfer(address(this).balance);
        } else {
            // Fail: Burn
            payable(address(0x000000000000000000000000000000000000dEaD)).transfer(address(this).balance);
        }
    }

    // ==========================================
    // Soulbound Overrides
    // ==========================================
    
    function _superTransfer(address from, address to, uint256 tokenId) internal {
        // Bypass the overridden transferFrom to allow internal logic
        super.transferFrom(from, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721) {
        // Allow if transferring to Contract (Refund)
        // Allow if transferring from Contract (Resale)
        if (to != address(this) && from != address(this)) {
            revert SoulboundTransferBlocked();
        }
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721) {
        if (to != address(this) && from != address(this)) {
            revert SoulboundTransferBlocked();
        }
        super.safeTransferFrom(from, to, tokenId, data);
    }
}
