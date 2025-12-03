"use client"

import { useState } from "react"
import { PortfolioPage } from "@/components/pages/portfolio-page"
import { MarketsPage } from "@/components/pages/markets-page"
import { PositionsPage } from "@/components/pages/positions-page"
import { HistoryPage } from "@/components/pages/history-page"
import { BottomNav } from "@/components/navigation/bottom-nav"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"portfolio" | "markets" | "positions" | "history">("portfolio")

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
      <div className="flex-1 overflow-y-auto pb-20">{renderPage()}</div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  )
}
