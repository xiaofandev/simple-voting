// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    
    struct Ballot {
        string title;
        string[] options;
        uint startTime;
        uint duration;
    }

    Ballot[] ballots;

    // who voted on what ballot
    mapping(address => mapping(uint => bool)) public whoVotes;
    // the voting count for each option on each ballot
    mapping(uint => mapping(uint => uint)) public votingCount;

    function createBallot(string memory title, string[] memory options, uint startTime, uint duration) public {
        require(options.length >= 2, "Provide at least 2 options");
        require(startTime > block.timestamp, "Start time must be in the future");
        require(duration >= 1, "Duration must be at least 1 second");
        Ballot memory newBallot = Ballot(title, options, startTime, duration);
        ballots.push(newBallot);
    }

    function getBallotByIndex(uint index) public view returns (Ballot memory) {
        Ballot memory ballot = ballots[index];
        return ballot;
    }

    function castVote(uint ballotIndex, uint optionIndex) public {
        require(!whoVotes[msg.sender][ballotIndex], "You have already voted in this ballot");
        Ballot memory ballot = ballots[ballotIndex];
        require(block.timestamp >= ballots[ballotIndex].startTime, "Ballot has not started yet");
        require(block.timestamp < ballot.startTime + ballot.duration, "Ballot has ended");
        whoVotes[msg.sender][ballotIndex] = true;
        votingCount[ballotIndex][optionIndex]++;
    }

    function hasVoted(address voter, uint ballotIndex) external view returns (bool) {
        return whoVotes[voter][ballotIndex];
    }

    function getVotingCount(uint ballotIndex, uint optionIndex) external view returns (uint) {
        return votingCount[ballotIndex][optionIndex];
    }

    function getResult(uint ballotIndex) external view returns (uint[] memory) {
        uint optionCount = ballots[ballotIndex].options.length;
        uint[] memory result = new uint[](optionCount);
        for (uint i = 0; i < optionCount; i++) {
            result[i] = votingCount[ballotIndex][i];
        }
        return result;
    }

    function getWinners(uint ballotIndex) external view returns (bool[] memory) {
        Ballot memory ballot = ballots[ballotIndex];
        uint lenth = ballot.options.length;
        uint max;

        for (uint i = 0; i < lenth; i++) {
            if (votingCount[ballotIndex][i] > max) {
                max = votingCount[ballotIndex][i];
            }
        }

        bool[] memory result = new bool[](lenth);
        for (uint i = 0; i < lenth; i++) {
            if (votingCount[ballotIndex][i] == max) {
                result[i] = true;
            }
        }
        return result;
    }

}