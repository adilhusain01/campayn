// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IAnkrFlowStaking.sol";
import "./interfaces/IAnkrFlowToken.sol";

contract CampaignManagerWithStaking {
    address public owner;
    uint256 public campaignCounter;

    // Liquid Staking Integration - Ankr Flow EVM Contracts
    IAnkrFlowStaking public constant ANKR_STAKING = IAnkrFlowStaking(0xFE8189A3016cb6A3668b8ccdAC520CE572D4287a);
    IAnkrFlowToken public constant ANKR_FLOW = IAnkrFlowToken(0x1b97100eA1D7126C4d60027e231EA4CB25314bdb);

    // Platform fee collection
    address public treasury;
    uint256 public totalPlatformFees;
    bool public stakingEnabled = true;

    struct Campaign {
        uint256 id;
        address company;
        uint256 totalReward;
        uint256 registrationEnd;
        uint256 campaignEnd;
        bool isActive;
        bool isCompleted;
        uint256 influencerCount;
        uint256 remainingReward;
    }

    struct Winner {
        address influencer;
        uint256 rank;
        uint256 reward;
        uint256 submissionTime;
    }

    struct CampaignStaking {
        uint256 stakedAmount;           // Original FLOW amount staked
        uint256 ankrFlowReceived;       // ankrFLOW tokens received
        uint256 stakingStartTime;       // When staking began
        uint256 expectedUnstakeTime;    // When we can unstake (campaign end)
        bool isStaked;                  // Whether campaign funds are currently staked
        uint256 finalFlowReceived;      // FLOW received after unstaking (0 if not unstaked yet)
        uint256 stakingGainsGenerated;  // Platform fees from staking gains
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => address[]) public campaignInfluencers;
    mapping(uint256 => mapping(address => bool)) public isInfluencerRegistered;
    mapping(uint256 => Winner[]) public campaignWinners;
    mapping(uint256 => CampaignStaking) public campaignStaking;

    // Events
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

    // Liquid Staking Events
    event CampaignStaked(
        uint256 indexed campaignId,
        uint256 flowAmount,
        uint256 ankrFlowReceived,
        uint256 stakingStartTime
    );

    event CampaignUnstaked(
        uint256 indexed campaignId,
        uint256 flowReceived,
        uint256 stakingGains,
        uint256 platformFee
    );

    event StakingEnabled(bool enabled);

    event PlatformFeesWithdrawn(
        address indexed treasury,
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
        treasury = msg.sender; // Default treasury to owner
        campaignCounter = 0;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury cannot be zero address");
        treasury = _treasury;
    }

    function setStakingEnabled(bool _enabled) external onlyOwner {
        stakingEnabled = _enabled;
        emit StakingEnabled(_enabled);
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

        // Automatically stake campaign funds for liquid staking rewards
        if (stakingEnabled) {
            _stakeCampaignFunds(newCampaignId, msg.value);
        }

        emit CampaignCreated(
            newCampaignId,
            msg.sender,
            msg.value,
            campaigns[newCampaignId].registrationEnd,
            campaigns[newCampaignId].campaignEnd
        );

        return newCampaignId;
    }

    function _stakeCampaignFunds(uint256 campaignId, uint256 amount) internal {
        try ANKR_STAKING.stakeAndClaimAethC{value: amount}() returns (uint256 ankrFlowReceived) {
            campaignStaking[campaignId] = CampaignStaking({
                stakedAmount: amount,
                ankrFlowReceived: ankrFlowReceived,
                stakingStartTime: block.timestamp,
                expectedUnstakeTime: campaigns[campaignId].campaignEnd,
                isStaked: true,
                finalFlowReceived: 0,
                stakingGainsGenerated: 0
            });

            emit CampaignStaked(campaignId, amount, ankrFlowReceived, block.timestamp);
        } catch {
            // If staking fails, continue without staking (fallback to normal campaign)
            campaignStaking[campaignId] = CampaignStaking({
                stakedAmount: 0,
                ankrFlowReceived: 0,
                stakingStartTime: 0,
                expectedUnstakeTime: 0,
                isStaked: false,
                finalFlowReceived: 0,
                stakingGainsGenerated: 0
            });
        }
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
        uint256 availableForRewards = totalReward;

        // Handle liquid staking if campaign was staked
        if (campaignStaking[campaignId].isStaked) {
            uint256 totalFlowReceived = _unstakeCampaignFunds(campaignId);

            if (totalFlowReceived >= totalReward) {
                // We got more FLOW back than original (staking gains!)
                uint256 stakingGains = totalFlowReceived - totalReward;
                campaignStaking[campaignId].stakingGainsGenerated = stakingGains;
                totalPlatformFees += stakingGains;

                // Use original reward amount for distribution
                availableForRewards = totalReward;

                emit CampaignUnstaked(campaignId, totalFlowReceived, stakingGains, stakingGains);
            } else {
                // Edge case: received less than original (shouldn't happen with Ankr but safety first)
                availableForRewards = totalFlowReceived;
                emit CampaignUnstaked(campaignId, totalFlowReceived, 0, 0);
            }
        }

        uint256[] memory rewards = new uint256[](winners.length);
        uint256 totalDistributed = 0;

        // Clear previous winners (if any)
        delete campaignWinners[campaignId];

        // Calculate fixed reward distribution (50%, 30%, 20% only for actual winners)
        if (winners.length == 1) {
            rewards[0] = (availableForRewards * 50) / 100;
        } else if (winners.length == 2) {
            rewards[0] = (availableForRewards * 50) / 100;
            rewards[1] = (availableForRewards * 30) / 100;
        } else if (winners.length == 3) {
            rewards[0] = (availableForRewards * 50) / 100;
            rewards[1] = (availableForRewards * 30) / 100;
            rewards[2] = (availableForRewards * 20) / 100;
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
        uint256 refundAmount = availableForRewards - totalDistributed;
        campaigns[campaignId].remainingReward = 0;

        if (refundAmount > 0) {
            payable(campaigns[campaignId].company).transfer(refundAmount);
            emit RefundIssued(campaignId, campaigns[campaignId].company, refundAmount);
        }

        campaigns[campaignId].isActive = false;
        campaigns[campaignId].isCompleted = true;

        emit CampaignCompleted(campaignId, winners, rewards, refundAmount);
    }

    function _unstakeCampaignFunds(uint256 campaignId) internal returns (uint256) {
        require(campaignStaking[campaignId].isStaked, "Campaign not staked");

        uint256 ankrFlowBalance = campaignStaking[campaignId].ankrFlowReceived;

        try ANKR_STAKING.unstakeAethC(ankrFlowBalance) returns (uint256 flowReceived) {
            campaignStaking[campaignId].isStaked = false;
            campaignStaking[campaignId].finalFlowReceived = flowReceived;

            return flowReceived;
        } catch {
            // If unstaking fails, use original amount as fallback
            campaignStaking[campaignId].isStaked = false;
            uint256 originalAmount = campaignStaking[campaignId].stakedAmount;
            campaignStaking[campaignId].finalFlowReceived = originalAmount;

            return originalAmount;
        }
    }

    // Emergency withdraw for campaign creator (if campaign fails)
    function emergencyWithdraw(uint256 campaignId) external onlyCompanyOrOwner(campaignId) {
        require(campaigns[campaignId].isActive, "Campaign is not active");
        require(!campaigns[campaignId].isCompleted, "Campaign already completed");
        require(block.timestamp >= campaigns[campaignId].campaignEnd + 7 days, "Must wait 7 days after campaign end");

        uint256 refundAmount;

        if (campaignStaking[campaignId].isStaked) {
            // Unstake first, then refund original amount (platform keeps gains)
            uint256 totalReceived = _unstakeCampaignFunds(campaignId);
            uint256 originalAmount = campaigns[campaignId].totalReward;

            if (totalReceived >= originalAmount) {
                uint256 stakingGains = totalReceived - originalAmount;
                totalPlatformFees += stakingGains;
                refundAmount = originalAmount;
            } else {
                refundAmount = totalReceived;
            }
        } else {
            refundAmount = campaigns[campaignId].remainingReward;
        }

        require(refundAmount > 0, "No funds to withdraw");

        campaigns[campaignId].remainingReward = 0;
        campaigns[campaignId].isActive = false;
        campaigns[campaignId].isCompleted = true;

        payable(campaigns[campaignId].company).transfer(refundAmount);

        emit RefundIssued(campaignId, campaigns[campaignId].company, refundAmount);
    }

    // Platform fee management
    function withdrawPlatformFees() external onlyOwner {
        require(totalPlatformFees > 0, "No platform fees to withdraw");

        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;

        payable(treasury).transfer(amount);

        emit PlatformFeesWithdrawn(treasury, amount);
    }

    // Emergency unstake for active campaigns if needed
    function emergencyUnstakeCampaign(uint256 campaignId) external onlyOwner {
        require(campaigns[campaignId].isActive, "Campaign not active");
        require(campaignStaking[campaignId].isStaked, "Campaign not staked");

        uint256 flowReceived = _unstakeCampaignFunds(campaignId);
        campaigns[campaignId].remainingReward = flowReceived;
    }

    // View functions
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

    function getCampaignStakingInfo(uint256 campaignId) external view returns (
        uint256 stakedAmount,
        uint256 ankrFlowReceived,
        uint256 stakingStartTime,
        bool isStaked,
        uint256 finalFlowReceived,
        uint256 stakingGainsGenerated
    ) {
        CampaignStaking memory staking = campaignStaking[campaignId];
        return (
            staking.stakedAmount,
            staking.ankrFlowReceived,
            staking.stakingStartTime,
            staking.isStaked,
            staking.finalFlowReceived,
            staking.stakingGainsGenerated
        );
    }

    function getCurrentStakingValue(uint256 campaignId) external view returns (uint256) {
        if (!campaignStaking[campaignId].isStaked) {
            return campaignStaking[campaignId].finalFlowReceived;
        }

        try ANKR_STAKING.getExchangeRate() returns (uint256 rate) {
            uint256 ankrFlowAmount = campaignStaking[campaignId].ankrFlowReceived;
            return (ankrFlowAmount * rate) / 1e18;
        } catch {
            return campaignStaking[campaignId].stakedAmount;
        }
    }

    function getCampaignWinners(uint256 campaignId) external view returns (Winner[] memory) {
        return campaignWinners[campaignId];
    }

    function getCampaignInfluencers(uint256 campaignId) external view returns (address[] memory) {
        return campaignInfluencers[campaignId];
    }

    function getActiveCampaigns() external view returns (uint256[] memory) {
        uint256[] memory activeCampaigns = new uint256[](campaignCounter);
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= campaignCounter; i++) {
            if (campaigns[i].isActive) {
                activeCampaigns[activeCount] = i;
                activeCount++;
            }
        }

        uint256[] memory result = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeCampaigns[i];
        }

        return result;
    }

    function isInfluencerRegisteredForCampaign(uint256 campaignId, address influencer) external view returns (bool) {
        return isInfluencerRegistered[campaignId][influencer];
    }

    function getCampaignWinnerCount(uint256 campaignId) external view returns (uint256) {
        return campaignWinners[campaignId].length;
    }

    // Fallback function to receive Ether
    receive() external payable {}
}