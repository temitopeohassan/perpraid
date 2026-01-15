"use client"

import { useState, useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { PortfolioPage } from "@/components/pages/portfolio-page"
import { MarketsPage } from "@/components/pages/markets-page"
import { PositionsPage } from "@/components/pages/positions-page"
import { HistoryPage } from "@/components/pages/history-page"
import { BottomNav } from "@/components/navigation/bottom-nav"
import { Header } from "@/components/navigation/header"
import { isFarcasterEnvironment } from "@/lib/farcaster-detection"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const [activeTab, setActiveTab] = useState<"portfolio" | "markets" | "positions" | "history">("portfolio")

  // Initialize Farcaster Mini App SDK and signal readiness only when inside Farcaster
  useEffect(() => {
    if (isFarcasterEnvironment()) {
      // Signal to Farcaster client that the app is ready to display
      try {
        sdk.actions.ready()
      } catch (error) {
        // Silently fail if SDK is not available
        console.debug('Farcaster SDK not available:', error)
      }
    }
  }, [])

  const handleMenuClick = (item: "home" | "positions" | "wallet") => {
    switch (item) {
      case "home":
        setActiveTab("portfolio")
        break
      case "positions":
        setActiveTab("positions")
        break
      case "wallet":
        setActiveTab("portfolio")
        break
    }
  }

  const renderPage = () => {
    switch (activeTab) {
      case "portfolio":
        return <PortfolioPage />
      case "markets":
        return <MarketsPage />
      case "positions":
        return <PositionsPage />
      case "history":
        return <HistoryPage />
      default:
        return <PortfolioPage />
    }
  }

  return (
    <main className="flex flex-col h-screen bg-background">
      <Header onMenuClick={handleMenuClick} />
      <div className="flex-1 overflow-y-auto pb-20 pt-24">{renderPage()}</div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  )
}
