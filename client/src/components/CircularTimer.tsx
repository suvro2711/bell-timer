import { motion } from "framer-motion";

interface CircularTimerProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export function CircularTimer({ 
  progress, 
  size = 280, 
  strokeWidth = 12,
  color = "currentColor",
  children 
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Circle */}
      <svg className="absolute inset-0 rotate-[-90deg]" width={size} height={size}>
        <circle
          stroke="hsl(var(--muted))"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Circle */}
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "linear" }} // Smooth updates
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      
      {/* Center Content */}
      <div className="z-10 text-center">
        {children}
      </div>
    </div>
  );
}
