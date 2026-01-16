"use client"

interface BottomNavProps {
  activeTab: "portfolio" | "markets" | "positions" | "history" | "staking"
  onTabChange: (tab: "portfolio" | "markets" | "positions" | "history" | "staking") => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs = [
    { id: "portfolio" as const, label: "Portfolio", icon: "💼" },
    { id: "markets" as const, label: "Markets", icon: "📊" },
    { id: "positions" as const, label: "Positions", icon: "📈" },
    { id: "staking" as const, label: "Staking", icon: "💰" },
    { id: "history" as const, label: "History", icon: "📋" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-red-200 flex justify-around items-center h-20 shadow-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
            activeTab === tab.id
              ? "text-blue-600 bg-blue-50 border-t-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <span className="text-2xl mb-1">{tab.icon}</span>
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
