// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CampaignManager {
    address public owner;
    uint256 public campaignCounter;

    struct Campaign {
        uint256 id;
        address company;
        uint256 totalReward;
        uint256 registrationEnd;
        uint256 campaignEnd;
        bool isActive;
        bool isCompleted;
        uint256 influencerCount;
        uint256 remainingReward; // Track remaining reward for refunds
    }

    struct Winner {
        address influencer;
        uint256 rank;
        uint256 reward;
        uint256 submissionTime; // For FCFS tie-breaking
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => address[]) public campaignInfluencers;
    mapping(uint256 => mapping(address => bool)) public isInfluencerRegistered;
    mapping(uint256 => Winner[]) public campaignWinners; // Dynamic array for flexible winners

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed company,
        uint256 totalReward,
        uint256 registrationEnd,
        uint256 campaignEnd
    );

    event InfluencerRegistered(
        uint256 indexed campaignId,
        address indexed influencer
    );

    event CampaignCompleted(
        uint256 indexed campaignId,
        address[] winners,
        uint256[] rewards,
        uint256 refundAmount
    );

    event RewardDistributed(
        uint256 indexed campaignId,
        address indexed influencer,
        uint256 amount,
        uint256 rank
    );

    event RefundIssued(
        uint256 indexed campaignId,
        address indexed company,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyCompanyOrOwner(uint256 campaignId) {
        require(
            msg.sender == campaigns[campaignId].company || msg.sender == owner,
            "Only campaign company or owner can call this function"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        campaignCounter = 0;
    }

    function createCampaign(
        uint256 _registrationDuration,
        uint256 _campaignDuration
    ) external payable returns (uint256) {
        require(msg.value > 0, "Campaign reward must be greater than 0");
        require(_registrationDuration > 0, "Registration duration must be greater than 0");
        require(_campaignDuration > _registrationDuration, "Campaign duration must be greater than registration duration");

        campaignCounter++;
        uint256 newCampaignId = campaignCounter;

        campaigns[newCampaignId] = Campaign({
            id: newCampaignId,
            company: msg.sender,
            totalReward: msg.value,
            registrationEnd: block.timestamp + _registrationDuration,
            campaignEnd: block.timestamp + _campaignDuration,
            isActive: true,
            isCompleted: false,
            influencerCount: 0,
            remainingReward: msg.value
        });

        emit CampaignCreated(
            newCampaignId,
            msg.sender,
            msg.value,
            campaigns[newCampaignId].registrationEnd,
            campaigns[newCampaignId].campaignEnd
        );

        return newCampaignId;
    }

    function registerInfluencer(uint256 campaignId) external {
        require(campaigns[campaignId].isActive, "Campaign is not active");
        require(block.timestamp <= campaigns[campaignId].registrationEnd, "Registration period has ended");
        require(!isInfluencerRegistered[campaignId][msg.sender], "Influencer already registered");

        isInfluencerRegistered[campaignId][msg.sender] = true;
        campaignInfluencers[campaignId].push(msg.sender);
        campaigns[campaignId].influencerCount++;

        emit InfluencerRegistered(campaignId, msg.sender);
    }

    // Enhanced completion function with flexible participants
    function completeCampaignFlexible(
        uint256 campaignId,
        address[] memory winners,
        uint256[] memory submissionTimes
    ) external onlyOwner {
        require(campaigns[campaignId].isActive, "Campaign is not active");
        require(!campaigns[campaignId].isCompleted, "Campaign already completed");
        require(block.timestamp >= campaigns[campaignId].campaignEnd, "Campaign has not ended yet");
        require(winners.length == submissionTimes.length, "Winners and submission times length mismatch");
        require(winners.length <= 3, "Maximum 3 winners allowed");
        require(winners.length >= 1, "At least 1 winner required");

        uint256 totalReward = campaigns[campaignId].totalReward;
        uint256[] memory rewards = new uint256[](winners.length);
        uint256 totalDistributed = 0;

        // Clear previous winners (if any)
        delete campaignWinners[campaignId];

        // Calculate fixed reward distribution (50%, 30%, 20% only for actual winners)
        if (winners.length == 1) {
            // Only 1st place: 50% of total reward
            rewards[0] = (totalReward * 50) / 100;
        } else if (winners.length == 2) {
            // 1st and 2nd place: 50% and 30% of total reward
            rewards[0] = (totalReward * 50) / 100; // 1st place
            rewards[1] = (totalReward * 30) / 100; // 2nd place
        } else if (winners.length == 3) {
            // All three places: 50%, 30%, 20% of total reward
            rewards[0] = (totalReward * 50) / 100; // 1st place
            rewards[1] = (totalReward * 30) / 100; // 2nd place
            rewards[2] = (totalReward * 20) / 100; // 3rd place
        }

        // Distribute rewards to winners
        for (uint256 i = 0; i < winners.length; i++) {
            require(winners[i] != address(0), "Winner address cannot be zero");
            require(isInfluencerRegistered[campaignId][winners[i]], "Winner must be registered influencer");

            // Store winner information
            campaignWinners[campaignId].push(Winner({
                influencer: winners[i],
                rank: i + 1,
                reward: rewards[i],
                submissionTime: submissionTimes[i]
            }));

            // Transfer reward
            payable(winners[i]).transfer(rewards[i]);
            totalDistributed += rewards[i];

            emit RewardDistributed(campaignId, winners[i], rewards[i], i + 1);
        }

        // Calculate and handle refund (remaining percentage goes back to creator)
        uint256 refundAmount = totalReward - totalDistributed;
        campaigns[campaignId].remainingReward = 0;

        if (refundAmount > 0) {
            // Return unused funds to campaign creator
            payable(campaigns[campaignId].company).transfer(refundAmount);
            emit RefundIssued(campaignId, campaigns[campaignId].company, refundAmount);
        }

        campaigns[campaignId].isActive = false;
        campaigns[campaignId].isCompleted = true;

        emit CampaignCompleted(campaignId, winners, rewards, refundAmount);
    }

    // Emergency withdraw for campaign creator (if campaign fails)
    function emergencyWithdraw(uint256 campaignId) external onlyCompanyOrOwner(campaignId) {
        require(campaigns[campaignId].isActive, "Campaign is not active");
        require(!campaigns[campaignId].isCompleted, "Campaign already completed");
        require(block.timestamp >= campaigns[campaignId].campaignEnd + 7 days, "Must wait 7 days after campaign end");

        uint256 refundAmount = campaigns[campaignId].remainingReward;
        require(refundAmount > 0, "No funds to withdraw");

        campaigns[campaignId].remainingReward = 0;
        campaigns[campaignId].isActive = false;
        campaigns[campaignId].isCompleted = true;

        payable(campaigns[campaignId].company).transfer(refundAmount);

        emit RefundIssued(campaignId, campaigns[campaignId].company, refundAmount);
    }

    // Get campaign information
    function getCampaignInfo(uint256 campaignId) external view returns (
        address company,
        uint256 totalReward,
        uint256 registrationEnd,
        uint256 campaignEnd,
        bool isActive,
        bool isCompleted,
        uint256 influencerCount,
        uint256 remainingReward
    ) {
        Campaign memory campaign = campaigns[campaignId];
        return (
            campaign.company,
            campaign.totalReward,
            campaign.registrationEnd,
            campaign.campaignEnd,
            campaign.isActive,
            campaign.isCompleted,
            campaign.influencerCount,
            campaign.remainingReward
        );
    }

    // Get campaign winners
    function getCampaignWinners(uint256 campaignId) external view returns (Winner[] memory) {
        return campaignWinners[campaignId];
    }

    // Get campaign influencers
    function getCampaignInfluencers(uint256 campaignId) external view returns (address[] memory) {
        return campaignInfluencers[campaignId];
    }

    // Get active campaigns
    function getActiveCampaigns() external view returns (uint256[] memory) {
        uint256[] memory activeCampaigns = new uint256[](campaignCounter);
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= campaignCounter; i++) {
            if (campaigns[i].isActive) {
                activeCampaigns[activeCount] = i;
                activeCount++;
            }
        }

        // Resize array to actual count
        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeCampaigns[i];
        }

        return result;
    }

    // Check if influencer is registered for campaign
    function isInfluencerRegisteredForCampaign(uint256 campaignId, address influencer) external view returns (bool) {
        return isInfluencerRegistered[campaignId][influencer];
    }

    // Get campaign winner count
    function getCampaignWinnerCount(uint256 campaignId) external view returns (uint256) {
        return campaignWinners[campaignId].length;
    }

    // Fallback function to receive Ether
    receive() external payable {}
}