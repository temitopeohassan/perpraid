"use client"

import { useState } from "react"
import Image from "next/image"
import { Menu, Home, TrendingUp, Wallet } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  onMenuClick?: (item: "home" | "positions" | "wallet") => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "positions" as const, label: "Positions", icon: TrendingUp },
    { id: "wallet" as const, label: "Wallet", icon: Wallet },
  ]

  const handleMenuClick = (item: "home" | "positions" | "wallet") => {
    setIsOpen(false)
    onMenuClick?.(item)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-24 items-center px-4">
        <Drawer open={isOpen} onOpenChange={setIsOpen} direction="left">
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 h-10 w-10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="w-3/4 sm:max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Menu</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-2 p-4">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <DrawerClose key={item.id} asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => handleMenuClick(item.id)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Button>
                  </DrawerClose>
                )
              })}
            </div>
          </DrawerContent>
        </Drawer>

        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="PERP Raid Logo"
            width={80}
            height={80}
            className="h-16 w-16 object-contain"
            priority
          />
          <span className="text-xl font-semibold">PERP Raid</span>
        </div>
      </div>
    </header>
  )
}

