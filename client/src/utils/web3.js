import { ethers } from 'ethers';
import { CAMPAIGN_MANAGER_ADDRESS, CAMPAIGN_MANAGER_ABI } from './contract.js';

export const BASE_SEPOLIA_CHAIN = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
      http: ['https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  },
};

export class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }

  async connectWallet() {
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        await this.switchToBaseSepolia();

        this.contract = new ethers.Contract(
          CAMPAIGN_MANAGER_ADDRESS,
          CAMPAIGN_MANAGER_ABI,
          this.signer
        );

        return await this.signer.getAddress();
      } else {
        throw new Error('MetaMask not found');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async switchToBaseSepolia() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_SEPOLIA_CHAIN.id.toString(16)}` }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${BASE_SEPOLIA_CHAIN.id.toString(16)}`,
                chainName: BASE_SEPOLIA_CHAIN.name,
                nativeCurrency: BASE_SEPOLIA_CHAIN.nativeCurrency,
                rpcUrls: [BASE_SEPOLIA_CHAIN.rpcUrls.default.http[0]],
                blockExplorerUrls: [BASE_SEPOLIA_CHAIN.blockExplorers.default.url],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Base Sepolia network');
        }
      } else {
        throw new Error('Failed to switch to Base Sepolia network');
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
        influencerCount: Number(info[6])
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
        reward: ethers.formatEther(winner.reward)
      }));
    } catch (error) {
      console.error('Error getting campaign winners:', error);
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