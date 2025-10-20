export const privyConfig = {
  appearance: {
    accentColor: "#EF8977",
    theme: "#222224",
    showWalletLoginFirst: false,
    logo: "https://auth.privy.io/logos/privy-logo-dark.png",
    walletChainType: "ethereum-only",
    walletList: [
      "detected_wallets",
      "metamask",
      "coinbase_wallet",
      "rainbow",
      "okx_wallet",
      "wallet_connect"
    ]
  },
  loginMethods: [
    "wallet",
    "google"
  ],
  fundingMethodConfig: {
    moonpay: {
      useSandbox: true
    }
  },
  embeddedWallets: {
    requireUserPasswordOnCreate: false,
    showWalletUIs: true,
    ethereum: {
      createOnLogin: "users-without-wallets"
    }
  },
  mfa: {
    noPromptOnMfaRequired: false
  }
};

export const flowEvmTestnet = {
  id: 545,
  name: 'Flow EVM Testnet',
  network: 'flow-evm-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow EVM Explorer',
      url: 'https://evm-testnet.flowscan.io'
    },
  },
};