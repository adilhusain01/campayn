import './polyfills.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { privyConfig, flowEvmTestnet } from './utils/privy-config.js'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID || "your-privy-app-id"}
        config={{
            ...privyConfig,
            supportedChains: [flowEvmTestnet],
            defaultChain: flowEvmTestnet
          }}
      >
        <App />
      </PrivyProvider>
    </QueryClientProvider>
  </StrictMode>,
)
