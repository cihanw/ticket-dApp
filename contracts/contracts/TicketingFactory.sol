// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TicketingContract.sol";

contract TicketingFactory {
    // Event emitted when a new event is created
    event EventCreated(address indexed contractAddress, address indexed organizer, string name);

    // Array to keep track of all created events
    address[] public allEvents;

    // Mapping to see which events an organizer has created
    mapping(address => address[]) public organizerEvents;

    /**
     * @notice Create a new Ticketing Event
     * @param _name Name of the event
     * @param _description Description of the event
     * @param _maxSupply Total tickets available
     * @param _ticketPrice Price per ticket in Wei
     * @param _eventStartDate Timestamp of event start
     * @param _entryDuration Duration in seconds for entry window
     */
    function createEvent(
        string memory _name,
        string memory _description,
        uint256 _maxSupply,
        uint256 _ticketPrice,
        uint256 _eventStartDate,
        uint256 _entryDuration
    ) external returns (address) {
        // User becomes the owner of the new contract
        TicketingContract newEvent = new TicketingContract(
            msg.sender, // Initial Owner
            _name,
            _description,
            _maxSupply,
            _ticketPrice,
            _eventStartDate,
            _entryDuration
        );

        address eventAddr = address(newEvent);
        allEvents.push(eventAddr);
        organizerEvents[msg.sender].push(eventAddr);

        emit EventCreated(eventAddr, msg.sender, _name);

        return eventAddr;
    }

    /**
     * @notice Get all events in the system.
     */
    function getAllEvents() external view returns (address[] memory) {
        return allEvents;
    }

    /**
     * @notice Get events created by a specific organizer.
     */
    function getOrganizerEvents(address organizer) external view returns (address[] memory) {
        return organizerEvents[organizer];
    }
}
