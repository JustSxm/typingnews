"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame } from "lucide-react"

interface StreakCounterProps {
  streak: number
  animated?: boolean
}

export default function StreakCounter({ streak, animated = false }: StreakCounterProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (animated) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [animated, streak])

  return (
    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950 px-3 py-2 rounded-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={streak}
          initial={animated ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <motion.div
            animate={
              isAnimating
                ? {
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.2, 1.1, 1.2, 1.1, 1],
                  }
                : {}
            }
            transition={{ duration: 0.5 }}
          >
            <Flame className="h-5 w-5 text-orange-500" />
          </motion.div>
          <div className="font-bold text-orange-700 dark:text-orange-300">
            {streak} day{streak !== 1 ? "s" : ""} streak
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
