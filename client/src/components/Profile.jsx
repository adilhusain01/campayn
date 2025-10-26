import { useState, useEffect } from "react";
import { useWallet } from "../hooks/useWallet.js";
import { useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { toast } from "sonner";

const Profile = ({ walletAddress }) => {
  const {
    user,
    isConnected,
    disconnectWallet
  } = useWallet();

  const { wallets } = useWallets();
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
  const externalWallet = wallets.find(wallet => wallet.walletClientType !== 'privy');
  const activeWallet = embeddedWallet || externalWallet;

  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  useEffect(() => {
    if (isConnected && walletAddress && activeWallet) {
      fetchBalance();
    }
  }, [isConnected, walletAddress, activeWallet]);

  const fetchBalance = async () => {
    try {
      setLoading(true);

      if (!activeWallet || !walletAddress) {
        console.log("No active wallet or address available");
        setBalance("0");
        return;
      }

      // Get the provider from the active wallet
      const provider = await activeWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);

      // Get the balance in wei
      const balanceWei = await ethersProvider.getBalance(walletAddress);

      // Convert from wei to STT
      const balanceSTT = ethers.formatEther(balanceWei);
      setBalance(balanceSTT);

      console.log("Balance fetched:", balanceSTT, "STT");
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast.error("Failed to fetch balance");
      setBalance("0");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success("Wallet address copied to clipboard!");
  };

  const validateWithdrawForm = () => {
    if (!withdrawAmount || !recipientAddress) {
      toast.error("Please fill in all fields");
      return false;
    }

    if (parseFloat(withdrawAmount) <= 0) {
      toast.error("Withdraw amount must be greater than 0");
      return false;
    }

    if (parseFloat(withdrawAmount) > parseFloat(balance)) {
      toast.error("Insufficient balance");
      return false;
    }

    // Basic address validation
    if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
      toast.error("Invalid recipient address");
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateWithdrawForm()) return;

    try {
      setLoading(true);

      if (!activeWallet || !walletAddress) {
        throw new Error("No active wallet available");
      }

      // Get the provider and signer
      const provider = await activeWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Convert amount to wei
      const amountWei = ethers.parseEther(withdrawAmount);

      // Estimate gas
      const gasEstimate = await ethersProvider.estimateGas({
        to: recipientAddress,
        value: amountWei,
      });

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * 120n / 100n;

      // Send the transaction
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountWei,
        gasLimit,
      });

      toast.success("Withdrawal transaction sent!");

      // Wait for transaction confirmation
      await tx.wait();

      toast.success("Withdrawal completed successfully!");

      // Reset form and refresh balance
      setWithdrawAmount("");
      setRecipientAddress("");
      setWithdrawDialogOpen(false);
      await fetchBalance();

    } catch (error) {
      console.error("Withdrawal error:", error);
      if (error.message && error.message.includes("insufficient funds")) {
        toast.error("Insufficient funds for transaction (including gas fees)");
      } else if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else {
        toast.error("Withdrawal failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.google?.name) return user.google.name;
    if (user.email?.address) return user.email.address;
    if (walletAddress) return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    return 'User';
  };

  const getUserDisplayType = () => {
    if (!user) return '';
    if (user.google?.email) return `Google: ${user.google.email}`;
    if (user.email?.address) return `Email: ${user.email.address}`;
    return 'Wallet User';
  };

  return (
    <div className="max-w-4xl">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black mb-6 pixel-text-shadow" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>💎 WALLET & PROFILE</h2>
        <p className="text-black font-bold text-lg" style={{
          fontFamily: "'Orbitron', monospace",
          textTransform: 'uppercase'
        }}>MANAGE YOUR SOMNIA WALLET AND PROFILE SETTINGS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* User Profile Section */}
        <div className="bg-white p-6 pixel-border pixel-shadow" style={{
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
        }}>
          <h3 className="text-xl font-black text-black mb-6 flex items-center" style={{
            fontFamily: "'Orbitron', monospace",
            textTransform: 'uppercase'
          }}>
            <span className="bg-black text-white w-8 h-8 flex items-center justify-center text-sm font-black mr-3 pixel-border" style={{
              fontFamily: "'Orbitron', monospace"
            }}>👤</span>
            USER PROFILE
          </h3>

          <div className="space-y-4">
            {/* User Info Display */}
            <div className="bg-black text-white p-4 pixel-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-lg pixel-border">
                  👤
                </div>
                <div className="flex-1">
                  <div className="font-black text-lg" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>
                    {getUserDisplayName()}
                  </div>
                  <div className="text-gray-300 text-sm" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>
                    {getUserDisplayType()}
                  </div>
                </div>
                {user?.google && (
                  <span className="px-3 py-1 bg-white/20 pixel-border text-white text-xs font-black" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>
                    GOOGLE
                  </span>
                )}
              </div>
            </div>

            {/* Wallet Address */}
            <div>
              <label className="block mb-2 font-black text-black" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}>► WALLET ADDRESS</label>
              <div className="flex gap-2">
                <input
                  value={walletAddress || ''}
                  readOnly
                  className="flex-1 p-3 border-3 border-black text-sm bg-white font-bold font-mono"
                  style={{
                    fontFamily: "'Orbitron', monospace"
                  }}
                />
                <button
                  onClick={handleCopyAddress}
                  className="pixel-button px-4 py-3 text-sm font-black" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}
                >
                  📋
                </button>
              </div>
            </div>

            {/* Network Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-black text-black text-sm" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>► NETWORK</label>
                <input
                  value="SOMNIA TESTNET"
                  readOnly
                  className="w-full p-3 border-3 border-black text-sm bg-white font-bold"
                  style={{
                    fontFamily: "'Orbitron', monospace"
                  }}
                />
              </div>
              <div>
                <label className="block mb-2 font-black text-black text-sm" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>► WALLET TYPE</label>
                <input
                  value="EMBEDDED"
                  readOnly
                  className="w-full p-3 border-3 border-black text-sm bg-white font-bold"
                  style={{
                    fontFamily: "'Orbitron', monospace"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Balance & Actions */}
        <div className="bg-white p-6 pixel-border pixel-shadow" style={{
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
        }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-black flex items-center" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>
              <span className="bg-black text-white w-8 h-8 flex items-center justify-center text-sm font-black mr-3 pixel-border" style={{
                fontFamily: "'Orbitron', monospace"
              }}>💰</span>
              BALANCE & ACTIONS
            </h3>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className="pixel-button px-3 py-2 text-sm font-black" style={{
                fontFamily: "'Orbitron', monospace"
              }}
            >
              {loading ? '⟳' : '🔄'}
            </button>
          </div>

          {/* Balance Display */}
          <div className="text-center p-6 bg-black text-white pixel-border mb-6">
            <div className="text-gray-300 text-sm mb-2 font-black" style={{
              fontFamily: "'Orbitron', monospace",
              textTransform: 'uppercase'
            }}>CURRENT BALANCE</div>
            <div className="text-3xl font-black text-yellow-400" style={{
              fontFamily: "'Orbitron', monospace"
            }}>
              {loading ? (
                <div className="animate-pulse">LOADING...</div>
              ) : (
                `${parseFloat(balance).toFixed(4)} STT`
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setWithdrawDialogOpen(true)}
              disabled={parseFloat(balance) <= 0}
              className="w-full pixel-button py-4 px-6 text-lg font-black pixel-shadow transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}
            >
              💸 WITHDRAW STT
            </button>

            <button
              onClick={disconnectWallet}
              className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-black pixel-border pixel-shadow transition-all duration-100 text-lg"
              style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}
            >
              🚪 DISCONNECT WALLET
            </button>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {withdrawDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white pixel-border pixel-shadow max-w-md w-full" style={{
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
          }}>
            {/* Modal Header */}
            <div className="bg-black text-white p-4 pixel-border">
              <h3 className="text-lg font-black flex items-center" style={{
                fontFamily: "'Orbitron', monospace",
                textTransform: 'uppercase'
              }}>
                💸 WITHDRAW STT TOKENS
              </h3>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-black text-sm font-bold" style={{
                fontFamily: "'Orbitron', monospace"
              }}>
                Send your STT tokens to an external wallet address
              </p>

              {/* Amount Input */}
              <div>
                <label className="block mb-2 font-black text-black" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>► AMOUNT (STT)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.0001"
                  min="0"
                  max={balance}
                  placeholder="0.0000"
                  className="w-full p-3 border-3 border-black text-base bg-white font-bold"
                  style={{
                    fontFamily: "'Orbitron', monospace"
                  }}
                />
                <div className="mt-2 text-black text-sm font-bold" style={{
                  fontFamily: "'Orbitron', monospace"
                }}>
                  Available: {parseFloat(balance).toFixed(4)} STT
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {['25%', '50%', '75%', 'MAX'].map((percent, index) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => {
                      const multiplier = index === 3 ? 1 : (index + 1) * 0.25;
                      setWithdrawAmount((parseFloat(balance) * multiplier).toFixed(4));
                    }}
                    className="px-3 py-2 bg-black text-white font-black text-sm pixel-border hover:bg-gray-800 transition-all duration-100"
                    style={{
                      fontFamily: "'Orbitron', monospace"
                    }}
                  >
                    {percent}
                  </button>
                ))}
              </div>

              {/* Recipient Address */}
              <div>
                <label className="block mb-2 font-black text-black" style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}>► RECIPIENT ADDRESS</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 border-3 border-black text-base bg-white font-bold font-mono"
                  style={{
                    fontFamily: "'Orbitron', monospace"
                  }}
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-100 border-3 border-yellow-500 p-3 pixel-border">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 font-black">⚠️</span>
                  <p className="text-yellow-800 text-sm font-bold" style={{
                    fontFamily: "'Orbitron', monospace"
                  }}>
                    Please double-check the recipient address. Transactions cannot be reversed.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setWithdrawDialogOpen(false)}
                className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-black pixel-border transition-all duration-100"
                style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading}
                className="flex-1 pixel-button py-3 px-4 font-black transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "'Orbitron', monospace",
                  textTransform: 'uppercase'
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin mr-2" style={{
                      borderRadius: 0
                    }}></div>
                    PROCESSING...
                  </span>
                ) : (
                  "💸 WITHDRAW"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;