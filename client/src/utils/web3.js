import { ethers } from 'ethers';
import { CAMPAIGN_MANAGER_ADDRESS, CAMPAIGN_MANAGER_ABI } from './contract.js';

export const SOMNIA_TESTNET = {
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia Testnet Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Somnia Testnet Explorer', url: 'https://shannon-explorer.somnia.network/' },
  },
};

export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }

  async connectWallet(signer = null) {
    try {
      if (signer) {
        this.signer = signer;
        this.provider = signer.provider;
      } else if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
      } else {
        throw new Error('No wallet found');
      }

      await this.switchToSomniaTestnet();

      this.contract = new ethers.Contract(
        CAMPAIGN_MANAGER_ADDRESS,
        CAMPAIGN_MANAGER_ABI,
        this.signer
      );

      return await this.signer.getAddress();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async switchToSomniaTestnet() {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${SOMNIA_TESTNET.id.toString(16)}` }],
        });
      }
    } catch (switchError) {
      if (switchError.code === 4902 && window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${SOMNIA_TESTNET.id.toString(16)}`,
                chainName: SOMNIA_TESTNET.name,
                nativeCurrency: SOMNIA_TESTNET.nativeCurrency,
                rpcUrls: [SOMNIA_TESTNET.rpcUrls.default.http[0]],
                blockExplorerUrls: [SOMNIA_TESTNET.blockExplorers.default.url],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Somnia Testnet network');
        }
      } else if (switchError.code !== 4902) {
        throw new Error('Failed to switch to Somnia Testnet network');
      }
    }
  }

  async createCampaign(registrationDuration, campaignDuration, rewardAmount) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.createCampaign(
        registrationDuration,
        campaignDuration,
        { value: ethers.parseEther(rewardAmount.toString()) }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => log.fragment?.name === 'CampaignCreated');

      return {
        txHash: receipt.hash,
        campaignId: event?.args?.campaignId?.toString()
      };
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async registerInfluencer(campaignId) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.registerInfluencer(campaignId);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        success: true
      };
    } catch (error) {
      console.error('Error registering influencer:', error);
      throw error;
    }
  }

  async getCampaignInfo(campaignId) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const info = await this.contract.getCampaignInfo(campaignId);
      return {
        company: info[0],
        totalReward: ethers.formatEther(info[1]),
        registrationEnd: Number(info[2]) * 1000,
        campaignEnd: Number(info[3]) * 1000,
        isActive: info[4],
        isCompleted: info[5],
        influencerCount: Number(info[6]),
        remainingReward: ethers.formatEther(info[7] || 0)
      };
    } catch (error) {
      console.error('Error getting campaign info:', error);
      throw error;
    }
  }

  async getActiveCampaigns() {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const campaignIds = await this.contract.getActiveCampaigns();
      return campaignIds.map(id => Number(id));
    } catch (error) {
      console.error('Error getting active campaigns:', error);
      throw error;
    }
  }

  async getCampaignWinners(campaignId) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const winners = await this.contract.getCampaignWinners(campaignId);
      return winners.map(winner => ({
        influencer: winner.influencer,
        rank: Number(winner.rank),
        reward: ethers.formatEther(winner.reward),
        submissionTime: Number(winner.submissionTime)
      }));
    } catch (error) {
      console.error('Error getting campaign winners:', error);
      throw error;
    }
  }

  async completeCampaignFlexible(campaignId, winners, submissionTimes) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.completeCampaignFlexible(campaignId, winners, submissionTimes);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        success: true
      };
    } catch (error) {
      console.error('Error completing campaign:', error);
      throw error;
    }
  }

  async getCampaignWinnerCount(campaignId) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      return Number(await this.contract.getCampaignWinnerCount(campaignId));
    } catch (error) {
      console.error('Error getting winner count:', error);
      throw error;
    }
  }

  async emergencyWithdraw(campaignId) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.emergencyWithdraw(campaignId);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        success: true
      };
    } catch (error) {
      console.error('Error emergency withdrawing:', error);
      throw error;
    }
  }

  async isInfluencerRegistered(campaignId, address) {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      return await this.contract.isInfluencerRegistered(campaignId, address);
    } catch (error) {
      console.error('Error checking influencer registration:', error);
      throw error;
    }
  }
}

export const web3Service = new Web3Service();