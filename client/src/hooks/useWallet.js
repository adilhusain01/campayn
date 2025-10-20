import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'
import { web3Service } from '../utils/web3.js'
import { ethers } from 'ethers'

export function useWallet() {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const [address, setAddress] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy')
  const externalWallet = wallets.find(wallet => wallet.walletClientType !== 'privy')
  const activeWallet = embeddedWallet || externalWallet


  const connectWallet = async () => {
    try {
      setIsConnecting(true)

      if (!authenticated) {
        await login()
        return
      }

      if (activeWallet) {
        try {
          await activeWallet.switchChain(0x221) // Flow EVM Testnet (545 in hex)
        } catch (chainError) {
          console.warn('Chain switch failed, continuing with current chain:', chainError)
        }

        const provider = await activeWallet.getEthereumProvider()
        const ethersProvider = new ethers.BrowserProvider(provider)
        const signer = await ethersProvider.getSigner()

        const walletAddress = await web3Service.connectWallet(signer)
        setAddress(walletAddress)

        return walletAddress
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    try {
      await logout()
      setAddress(null)
      web3Service.provider = null
      web3Service.signer = null
      web3Service.contract = null
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  useEffect(() => {
    const autoConnect = async () => {
      if (ready && authenticated && activeWallet && !address) {
        console.log('Auto-connecting wallet on page load...')
        setIsConnecting(true)

        // Add minimum delay to ensure spinner is visible
        const minDelay = new Promise(resolve => setTimeout(resolve, 500))

        try {
          if (activeWallet) {
            try {
              await activeWallet.switchChain(0x221) // Flow EVM Testnet
            } catch (chainError) {
              console.warn('Chain switch failed, continuing with current chain:', chainError)
            }

            const provider = await activeWallet.getEthereumProvider()
            const ethersProvider = new ethers.BrowserProvider(provider)
            const signer = await ethersProvider.getSigner()

            const walletAddress = await web3Service.connectWallet(signer)

            // Wait for both connection and minimum delay
            await minDelay
            setAddress(walletAddress)
          }
        } catch (error) {
          console.error('Auto-connect failed:', error)
          await minDelay // Still wait for delay even on error
        } finally {
          setIsConnecting(false)
        }
      } else if (!authenticated) {
        setAddress(null)
      }
    }

    autoConnect()
  }, [ready, authenticated, activeWallet])

  return {
    address,
    isConnected: !!address,
    isConnecting,
    connectWallet,
    disconnectWallet,
    user,
    authenticated,
    ready
  }
}