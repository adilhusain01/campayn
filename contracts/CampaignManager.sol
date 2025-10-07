// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CampaignManager {
    struct Campaign {
        uint256 id;
        address company;
        uint256 totalReward;
        uint256 registrationEnd;
        uint256 campaignEnd;
        bool isActive;
        bool isCompleted;
        uint256 influencerCount;
        mapping(address => bool) registeredInfluencers;
        address[] influencerList;
    }

    struct Winner {
        address influencer;
        uint256 rank;
        uint256 reward;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Winner[3]) public campaignWinners;

    uint256 public campaignCounter;
    address public owner;

    event CampaignCreated(uint256 indexed campaignId, address indexed company, uint256 totalReward, uint256 registrationEnd, uint256 campaignEnd);
    event InfluencerRegistered(uint256 indexed campaignId, address indexed influencer);
    event CampaignCompleted(uint256 indexed campaignId, address[3] winners, uint256[3] rewards);
    event RewardDistributed(uint256 indexed campaignId, address indexed influencer, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyCompany(uint256 campaignId) {
        require(msg.sender == campaigns[campaignId].company, "Only campaign company can call this function");
        _;
    }

    modifier campaignExists(uint256 campaignId) {
        require(campaignId > 0 && campaignId <= campaignCounter, "Campaign does not exist");
        _;
    }

    modifier campaignActive(uint256 campaignId) {
        require(campaigns[campaignId].isActive, "Campaign is not active");
        require(!campaigns[campaignId].isCompleted, "Campaign is already completed");
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
        require(msg.value > 0, "Must deposit ETH for campaign rewards");
        require(_registrationDuration > 0, "Registration duration must be positive");
        require(_campaignDuration > 0, "Campaign duration must be positive");

        campaignCounter++;
        uint256 campaignId = campaignCounter;

        Campaign storage newCampaign = campaigns[campaignId];
        newCampaign.id = campaignId;
        newCampaign.company = msg.sender;
        newCampaign.totalReward = msg.value;
        newCampaign.registrationEnd = block.timestamp + _registrationDuration;
        newCampaign.campaignEnd = newCampaign.registrationEnd + _campaignDuration;
        newCampaign.isActive = true;
        newCampaign.isCompleted = false;
        newCampaign.influencerCount = 0;

        emit CampaignCreated(campaignId, msg.sender, msg.value, newCampaign.registrationEnd, newCampaign.campaignEnd);

        return campaignId;
    }

    function registerInfluencer(uint256 campaignId)
        external
        campaignExists(campaignId)
        campaignActive(campaignId)
    {
        require(block.timestamp <= campaigns[campaignId].registrationEnd, "Registration period has ended");
        require(!campaigns[campaignId].registeredInfluencers[msg.sender], "Influencer already registered");

        campaigns[campaignId].registeredInfluencers[msg.sender] = true;
        campaigns[campaignId].influencerList.push(msg.sender);
        campaigns[campaignId].influencerCount++;

        emit InfluencerRegistered(campaignId, msg.sender);
    }

    function completeCampaign(
        uint256 campaignId,
        address[3] memory winners,
        uint256[3] memory /* scores */
    ) external onlyOwner campaignExists(campaignId) campaignActive(campaignId) {
        require(block.timestamp >= campaigns[campaignId].campaignEnd, "Campaign period has not ended");
        require(campaigns[campaignId].influencerCount >= 3, "Need at least 3 influencers to complete campaign");

        for (uint i = 0; i < 3; i++) {
            require(campaigns[campaignId].registeredInfluencers[winners[i]], "Winner must be registered influencer");
        }

        campaigns[campaignId].isCompleted = true;

        uint256 totalReward = campaigns[campaignId].totalReward;
        uint256[3] memory rewards = [
            (totalReward * 50) / 100,  // 50% for 1st place
            (totalReward * 30) / 100,  // 30% for 2nd place
            (totalReward * 20) / 100   // 20% for 3rd place
        ];

        for (uint i = 0; i < 3; i++) {
            campaignWinners[campaignId][i] = Winner({
                influencer: winners[i],
                rank: i + 1,
                reward: rewards[i]
            });

            payable(winners[i]).transfer(rewards[i]);
            emit RewardDistributed(campaignId, winners[i], rewards[i]);
        }

        emit CampaignCompleted(campaignId, winners, rewards);
    }

    function emergencyWithdraw(uint256 campaignId)
        external
        onlyCompany(campaignId)
        campaignExists(campaignId)
    {
        require(!campaigns[campaignId].isCompleted, "Cannot withdraw from completed campaign");
        require(
            block.timestamp > campaigns[campaignId].campaignEnd + 7 days,
            "Can only withdraw 7 days after campaign end"
        );

        uint256 amount = campaigns[campaignId].totalReward;
        campaigns[campaignId].totalReward = 0;
        campaigns[campaignId].isActive = false;

        payable(msg.sender).transfer(amount);
    }

    function getCampaignInfo(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (
            address company,
            uint256 totalReward,
            uint256 registrationEnd,
            uint256 campaignEnd,
            bool isActive,
            bool isCompleted,
            uint256 influencerCount
        )
    {
        Campaign storage campaign = campaigns[campaignId];
        return (
            campaign.company,
            campaign.totalReward,
            campaign.registrationEnd,
            campaign.campaignEnd,
            campaign.isActive,
            campaign.isCompleted,
            campaign.influencerCount
        );
    }

    function getCampaignInfluencers(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (address[] memory)
    {
        return campaigns[campaignId].influencerList;
    }

    function getCampaignWinners(uint256 campaignId)
        external
        view
        campaignExists(campaignId)
        returns (Winner[3] memory)
    {
        return campaignWinners[campaignId];
    }

    function isInfluencerRegistered(uint256 campaignId, address influencer)
        external
        view
        campaignExists(campaignId)
        returns (bool)
    {
        return campaigns[campaignId].registeredInfluencers[influencer];
    }

    function getActiveCampaigns() external view returns (uint256[] memory) {
        uint256[] memory activeCampaigns = new uint256[](campaignCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= campaignCounter; i++) {
            if (campaigns[i].isActive && !campaigns[i].isCompleted) {
                activeCampaigns[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeCampaigns[i];
        }

        return result;
    }

    receive() external payable {}
}