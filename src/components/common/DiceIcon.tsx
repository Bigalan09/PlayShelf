interface DiceIconProps {
  className?: string
  value?: number
}

const DiceIcon = ({ className = "h-8 w-8", value = 6 }: DiceIconProps) => {
  const dots = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 25], [30, 50], [30, 75], [70, 25], [70, 50], [70, 75]]
  }

  const currentDots = dots[value as keyof typeof dots] || dots[6]

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="15"
        fill="white"
        stroke="url(#gradient)"
        strokeWidth="3"
      />
      {currentDots.map((dot, index) => (
        <circle
          key={index}
          cx={dot[0]}
          cy={dot[1]}
          r="8"
          fill="url(#dotGradient)"
        />
      ))}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="dotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default DiceIcon
