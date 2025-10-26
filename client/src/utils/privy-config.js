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

export const somniaTestnet = {
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
  },
  blockExplorers: {
    default: {
      name: 'Somnia Testnet Explorer',
      url: 'https://shannon-explorer.somnia.network/'
    },
  },
};