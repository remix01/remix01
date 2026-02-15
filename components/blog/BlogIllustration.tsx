import React from 'react'

type IllustrationCategory = 'kopalnica' | 'elektrikar' | 'vodovod' | 'fasada' | 'parket' | 'vzdrzevanje'

interface BlogIllustrationProps {
  category: IllustrationCategory
  className?: string
}

export function BlogIllustration({ category, className = '' }: BlogIllustrationProps) {
  const renderIllustration = () => {
    switch (category) {
      case 'kopalnica':
        // Bathroom (kopalnica) with bathtub, water, steam, and tiles
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes steamFloat1 { 
                  0% { opacity: 0; transform: translateY(0); } 
                  40% { opacity: 0.4; } 
                  100% { opacity: 0; transform: translateY(-20px); } 
                }
                @keyframes steamFloat2 { 
                  0% { opacity: 0; transform: translateY(0); } 
                  40% { opacity: 0.4; } 
                  100% { opacity: 0; transform: translateY(-20px); } 
                }
                @keyframes steamFloat3 { 
                  0% { opacity: 0; transform: translateY(0); } 
                  40% { opacity: 0.4; } 
                  100% { opacity: 0; transform: translateY(-20px); } 
                }
                @keyframes drip { 
                  0% { opacity: 1; transform: translateY(0); } 
                  100% { opacity: 0; transform: translateY(15px); } 
                }
                @keyframes wave {
                  0%, 100% { d: path('M 80,135 Q 120,130 160,135 T 240,135 T 320,135'); }
                  50% { d: path('M 80,135 Q 120,140 160,135 T 240,135 T 320,135'); }
                }
                .steam1 { fill: #bfdbfe; opacity: 0.3; animation: steamFloat1 3s ease-in-out infinite; }
                .steam2 { fill: #bfdbfe; opacity: 0.3; animation: steamFloat2 3s ease-in-out infinite 1s; }
                .steam3 { fill: #bfdbfe; opacity: 0.3; animation: steamFloat3 3s ease-in-out infinite 2s; }
                .droplet { fill: #93c5fd; animation: drip 1.5s ease-in infinite 0.5s; }
              `}</style>
              
              {/* Tile grid pattern */}
              <pattern id="tileGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <rect width="24" height="24" fill="#0d1b2e"/>
                <rect x="0.5" y="0.5" width="23" height="23" fill="none" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.1"/>
              </pattern>
            </defs>
            
            {/* Background with tile pattern */}
            <rect width="400" height="225" fill="url(#tileGrid)"/>
            
            {/* Bathtub */}
            <path 
              d="M 80,150 Q 80,180 100,190 L 300,190 Q 320,180 320,150 L 320,140 L 80,140 Z" 
              fill="none" 
              stroke="rgba(99,179,237,0.4)" 
              strokeWidth="3"
            />
            <ellipse cx="200" cy="140" rx="120" ry="8" fill="rgba(99,179,237,0.2)"/>
            
            {/* Water in tub with wavy top */}
            <path 
              d="M 80,135 Q 120,133 160,135 T 240,135 T 320,135 L 320,185 Q 310,188 300,188 L 100,188 Q 90,188 80,185 Z" 
              fill="#3b82f6" 
              fillOpacity="0.4"
            >
              <animate 
                attributeName="d" 
                dur="3s" 
                repeatCount="indefinite"
                values="
                  M 80,135 Q 120,133 160,135 T 240,135 T 320,135 L 320,185 Q 310,188 300,188 L 100,188 Q 90,188 80,185 Z;
                  M 80,135 Q 120,137 160,135 T 240,135 T 320,135 L 320,185 Q 310,188 300,188 L 100,188 Q 90,188 80,185 Z;
                  M 80,135 Q 120,133 160,135 T 240,135 T 320,135 L 320,185 Q 310,188 300,188 L 100,188 Q 90,188 80,185 Z
                "
              />
            </path>
            
            {/* Steam/mist curves */}
            <path className="steam1" d="M 100,120 Q 120,110 140,120 T 180,120" fill="none" stroke="#bfdbfe" strokeWidth="4" strokeLinecap="round" opacity="0.3"/>
            <path className="steam2" d="M 160,115 Q 180,105 200,115 T 240,115" fill="none" stroke="#bfdbfe" strokeWidth="4" strokeLinecap="round" opacity="0.3"/>
            <path className="steam3" d="M 220,118 Q 240,108 260,118 T 300,118" fill="none" stroke="#bfdbfe" strokeWidth="4" strokeLinecap="round" opacity="0.3"/>
            
            {/* Wall shelf */}
            <rect x="280" y="60" width="80" height="4" rx="2" fill="#475569"/>
            <rect x="278" y="64" width="2" height="10" fill="#334155"/>
            <rect x="360" y="64" width="2" height="10" fill="#334155"/>
            
            {/* Bottles on shelf */}
            <g transform="translate(295, 40)">
              <rect x="0" y="0" width="12" height="20" rx="2" fill="#93c5fd" opacity="0.6"/>
              <circle cx="6" cy="-2" r="4" fill="#60a5fa" opacity="0.8"/>
            </g>
            <g transform="translate(315, 35)">
              <rect x="0" y="0" width="14" height="25" rx="2" fill="#3b82f6" opacity="0.5"/>
              <circle cx="7" cy="-2" r="5" fill="#2563eb" opacity="0.7"/>
            </g>
            <g transform="translate(337, 42)">
              <rect x="0" y="0" width="10" height="18" rx="2" fill="#60a5fa" opacity="0.7"/>
              <circle cx="5" cy="-2" r="3.5" fill="#3b82f6" opacity="0.8"/>
            </g>
            
            {/* Faucet */}
            <g transform="translate(200, 80)">
              {/* Faucet pipe */}
              <rect x="-3" y="-30" width="6" height="30" rx="3" fill="#cbd5e1"/>
              {/* Faucet spout */}
              <ellipse cx="0" cy="-30" rx="8" ry="4" fill="#cbd5e1"/>
              <path d="M -8,-30 Q -12,-20 -10,0" fill="none" stroke="#cbd5e1" strokeWidth="4"/>
              <path d="M 8,-30 Q 12,-20 10,0" fill="none" stroke="#cbd5e1" strokeWidth="4"/>
              <ellipse cx="0" cy="0" rx="12" ry="6" fill="#94a3b8"/>
              
              {/* Water droplet */}
              <ellipse className="droplet" cx="0" cy="8" rx="3" ry="5"/>
            </g>
            
            {/* Category badge */}
            <rect x="20" y="185" width="85" height="24" rx="12" fill="#3b82f6" opacity="0.8"/>
            <text x="62.5" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Gradnja</text>
          </svg>
        )

      case 'elektrikar':
        // Electrical theme with lightbulb, PCB traces, and lightning bolt
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes glowPulse { 
                  0%, 100% { opacity: 0.8; } 
                  50% { opacity: 0.3; } 
                }
                @keyframes filamentFlicker { 
                  0% { opacity: 0.9; } 
                  33% { opacity: 0.6; } 
                  66% { opacity: 0.9; } 
                  100% { opacity: 0.6; } 
                }
                @keyframes pcbFlow1 { 
                  0% { stroke-dashoffset: 40; } 
                  100% { stroke-dashoffset: 0; } 
                }
                @keyframes pcbFlow2 { 
                  0% { stroke-dashoffset: 60; } 
                  100% { stroke-dashoffset: 0; } 
                }
                @keyframes pcbFlow3 { 
                  0% { stroke-dashoffset: 50; } 
                  100% { stroke-dashoffset: 0; } 
                }
                .glow-circle { fill: #fef08a; }
                .filament { stroke: #fbbf24; stroke-width: 2.5; fill: none; animation: filamentFlicker 0.15s steps(3) infinite; }
                .pcb-trace { stroke: #92400e; stroke-width: 2; fill: none; opacity: 0.15; }
                .pcb-active1 { stroke: #f59e0b; stroke-width: 2; fill: none; stroke-dasharray: 8 4; animation: pcbFlow1 4s linear infinite; }
                .pcb-active2 { stroke: #f59e0b; stroke-width: 2; fill: none; stroke-dasharray: 8 4; animation: pcbFlow2 4s linear infinite 1.3s; }
                .pcb-active3 { stroke: #f59e0b; stroke-width: 2; fill: none; stroke-dasharray: 8 4; animation: pcbFlow3 4s linear infinite 2.6s; }
                .solder-point { fill: #92400e; opacity: 0.2; }
              `}</style>
              
              <radialGradient id="bulbGlow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8">
                  <animate attributeName="stop-opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
                </stop>
                <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.5">
                  <animate attributeName="stop-opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite"/>
                </stop>
                <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.2">
                  <animate attributeName="stop-opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite"/>
                </stop>
                <stop offset="100%" stopColor="#09090e" stopOpacity="0"/>
              </radialGradient>
            </defs>
            
            {/* Background */}
            <rect width="400" height="225" fill="#09090e"/>
            
            {/* PCB traces - horizontal and vertical lines */}
            <g className="pcb-trace">
              <path d="M 40,60 L 180,60"/>
              <path d="M 220,60 L 360,60"/>
              <path d="M 60,40 L 60,100"/>
              <path d="M 340,40 L 340,120"/>
              <path d="M 100,140 L 300,140"/>
              <path d="M 150,100 L 150,180"/>
              <path d="M 250,90 L 250,160"/>
            </g>
            
            {/* Solder points */}
            <circle className="solder-point" cx="60" cy="60" r="3"/>
            <circle className="solder-point" cx="180" cy="60" r="3"/>
            <circle className="solder-point" cx="60" cy="100" r="3"/>
            <circle className="solder-point" cx="340" cy="60" r="3"/>
            <circle className="solder-point" cx="100" cy="140" r="3"/>
            <circle className="solder-point" cx="300" cy="140" r="3"/>
            <circle className="solder-point" cx="150" cy="180" r="3"/>
            
            {/* Active PCB traces with animation */}
            <path className="pcb-active1" d="M 30,170 L 120,170 L 120,200"/>
            <path className="pcb-active2" d="M 280,180 L 350,180 L 350,120"/>
            <path className="pcb-active3" d="M 80,30 L 80,90 L 140,90"/>
            
            {/* Radial glow background */}
            <circle cx="200" cy="100" r="80" fill="url(#bulbGlow)"/>
            
            {/* Light bulb - glass envelope */}
            <ellipse cx="200" cy="95" rx="38" ry="43" fill="none" stroke="#f59e0b" strokeWidth="3"/>
            
            {/* Filament - M-shape */}
            <path className="filament" d="M 185,90 L 192,105 L 200,85 L 208,105 L 215,90"/>
            
            {/* Bulb base - screw threads */}
            <rect x="188" y="135" width="24" height="18" fill="#92400e" rx="2"/>
            <line x1="188" y1="140" x2="212" y2="140" stroke="#78350f" strokeWidth="1.5"/>
            <line x1="188" y1="145" x2="212" y2="145" stroke="#78350f" strokeWidth="1.5"/>
            <line x1="188" y1="150" x2="212" y2="150" stroke="#78350f" strokeWidth="1.5"/>
            
            {/* Bulb cap */}
            <ellipse cx="200" cy="135" rx="14" ry="5" fill="#78350f"/>
            
            {/* Lightning bolt - left side */}
            <polygon points="90,80 105,110 95,110 110,140 75,105 85,105" fill="#fbbf24" opacity="0.7"/>
            
            {/* Electrical symbols in corners */}
            <text x="30" y="30" fill="#92400e" fontSize="20" fontWeight="bold" opacity="0.2">Ω</text>
            <text x="360" y="35" fill="#92400e" fontSize="18" fontWeight="bold" opacity="0.2">V</text>
            <text x="370" y="210" fill="#92400e" fontSize="18" fontWeight="bold" opacity="0.2">A</text>
            <text x="25" y="215" fill="#92400e" fontSize="16" fontWeight="bold" opacity="0.2">~</text>
            
            {/* Category badge */}
            <rect x="20" y="185" width="90" height="24" rx="12" fill="#f59e0b" opacity="0.85"/>
            <text x="65" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Elektrika</text>
          </svg>
        )

      case 'vodovod':
        // Isometric plumbing system with pipes, valves, and leaks
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes drop1 { 
                  0% { opacity: 1; transform: translateY(0); } 
                  100% { opacity: 0; transform: translateY(25px); } 
                }
                @keyframes drop2 { 
                  0% { opacity: 1; transform: translateY(0); } 
                  100% { opacity: 0; transform: translateY(25px); } 
                }
                @keyframes drop3 { 
                  0% { opacity: 1; transform: translateY(0); } 
                  100% { opacity: 0; transform: translateY(25px); } 
                }
                @keyframes gaugeTremor { 
                  0%, 100% { transform: rotate(-3deg); } 
                  50% { transform: rotate(3deg); } 
                }
                @keyframes shimmer { 
                  0% { offset: 0%; } 
                  100% { offset: 100%; } 
                }
                .drop1 { fill: #67e8f9; animation: drop1 1.2s ease-in infinite; }
                .drop2 { fill: #67e8f9; animation: drop2 1.5s ease-in infinite 0.4s; }
                .drop3 { fill: #67e8f9; animation: drop3 1.8s ease-in infinite 0.8s; }
                .gauge-needle { animation: gaugeTremor 0.5s ease-in-out infinite alternate; transform-origin: 330px 130px; }
              `}</style>
              
              {/* Hexagon pattern */}
              <pattern id="hexPattern" width="20" height="17.32" patternUnits="userSpaceOnUse">
                <path d="M10,0 L15,8.66 L10,17.32 L5,8.66 Z" fill="none" stroke="#164e63" strokeWidth="0.5" opacity="0.06"/>
              </pattern>
              
              {/* Water shimmer gradient */}
              <linearGradient id="waterShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#164e63" stopOpacity="0.6"/>
                <stop offset="50%" stopColor="#0e7490" stopOpacity="0.9">
                  <animate attributeName="offset" values="0;1;0" dur="3s" repeatCount="indefinite"/>
                </stop>
                <stop offset="100%" stopColor="#164e63" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
            
            {/* Background with hexagon pattern */}
            <rect width="400" height="225" fill="#060f14"/>
            <rect width="400" height="225" fill="url(#hexPattern)"/>
            
            {/* Main horizontal pipe across width */}
            <rect x="30" y="90" width="340" height="24" rx="12" fill="#164e63" stroke="#0e7490" strokeWidth="3"/>
            <rect x="35" y="95" width="330" height="14" rx="7" fill="url(#waterShimmer)"/>
            
            {/* Left branching pipe - down */}
            <rect x="88" y="102" width="24" height="80" rx="12" fill="#164e63" stroke="#0e7490" strokeWidth="3"/>
            <rect x="93" y="107" width="14" height="70" rx="7" fill="url(#waterShimmer)"/>
            
            {/* Left T-junction with rust */}
            <circle cx="100" cy="102" r="18" fill="#92400e" opacity="0.7"/>
            <circle cx="100" cy="102" r="16" fill="#164e63" stroke="#0e7490" strokeWidth="2"/>
            
            {/* Right branching pipe - down (different height) */}
            <rect x="288" y="102" width="24" height="60" rx="12" fill="#164e63" stroke="#0e7490" strokeWidth="3"/>
            <rect x="293" y="107" width="14" height="50" rx="7" fill="url(#waterShimmer)"/>
            
            {/* Right T-junction */}
            <circle cx="300" cy="102" r="18" fill="#164e63" stroke="#0e7490" strokeWidth="3"/>
            
            {/* Valve on left pipe - OPEN (green indicator) */}
            <g transform="translate(100, 145)">
              <circle cx="0" cy="0" r="14" fill="#334155" stroke="#0e7490" strokeWidth="2"/>
              <circle cx="0" cy="0" r="10" fill="#475569"/>
              <rect x="-1" y="-12" width="2" height="10" fill="#0e7490" rx="1"/>
              <circle cx="0" cy="-12" r="3" fill="#10b981"/>
            </g>
            
            {/* Valve on right pipe - CLOSED (red indicator) */}
            <g transform="translate(300, 135)">
              <circle cx="0" cy="0" r="14" fill="#334155" stroke="#0e7490" strokeWidth="2"/>
              <circle cx="0" cy="0" r="10" fill="#475569"/>
              <rect x="-10" y="-1" width="20" height="2" fill="#f43f5e" rx="1"/>
              <circle cx="-10" cy="0" r="3" fill="#f43f5e"/>
            </g>
            
            {/* Pressure gauge */}
            <g transform="translate(330, 130)">
              <circle cx="0" cy="0" r="28" fill="#1e293b" stroke="#0e7490" strokeWidth="3"/>
              {/* Gauge scale arc */}
              <path d="M -20,-15 A 25 25 0 0 1 20,-15" fill="none" stroke="#334155" strokeWidth="2"/>
              {/* Red zone */}
              <path d="M 12,-20 A 25 25 0 0 1 20,-15" fill="none" stroke="#f43f5e" strokeWidth="3"/>
              {/* Scale markers */}
              <line x1="-22" y1="-12" x2="-18" y2="-10" stroke="#64748b" strokeWidth="1"/>
              <line x1="-15" y1="-20" x2="-13" y2="-16" stroke="#64748b" strokeWidth="1"/>
              <line x1="0" y1="-24" x2="0" y2="-20" stroke="#64748b" strokeWidth="1"/>
              <line x1="15" y1="-20" x2="13" y2="-16" stroke="#64748b" strokeWidth="1"/>
              <line x1="22" y1="-12" x2="18" y2="-10" stroke="#64748b" strokeWidth="1"/>
              {/* Needle in red zone - trembling */}
              <line className="gauge-needle" x1="0" y1="0" x2="15" y2="-18" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="0" cy="0" r="3" fill="#f43f5e"/>
              {/* Bar label */}
              <text x="0" y="20" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">bar</text>
            </g>
            
            {/* Water drops falling from rusty T-junction */}
            <ellipse className="drop1" cx="100" cy="125" rx="3" ry="5"/>
            <ellipse className="drop2" cx="95" cy="128" rx="2.5" ry="4"/>
            <ellipse className="drop3" cx="105" cy="130" rx="3.5" ry="5.5"/>
            
            {/* Category badge */}
            <rect x="20" y="185" width="90" height="24" rx="12" fill="#0e7490" opacity="0.85"/>
            <text x="65" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Vodovod</text>
          </svg>
        )

      case 'fasada':
        // House facade cross-section with insulation layers
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes arrowPulse { 
                  0%, 100% { transform: scale(1); } 
                  50% { transform: scale(1.15); } 
                }
                @keyframes crackDraw { 
                  0% { stroke-dashoffset: 80; } 
                  100% { stroke-dashoffset: 0; } 
                }
                @keyframes windowGlow { 
                  0%, 100% { opacity: 0.4; } 
                  50% { opacity: 0.7; } 
                }
                .warning-arrow { animation: arrowPulse 1.5s ease-in-out infinite; transform-origin: center; }
                .crack-line { stroke-dasharray: 80; stroke-dashoffset: 80; animation: crackDraw 2s ease forwards; }
                .window-light { animation: windowGlow 2s ease-in-out alternate infinite; }
              `}</style>
              
              {/* Brick texture pattern */}
              <pattern id="brickPattern" width="20" height="10" patternUnits="userSpaceOnUse">
                <rect width="20" height="10" fill="#2d2d35"/>
                <rect x="0" y="0" width="9" height="4" fill="#3a3a42" stroke="#2d2d35" strokeWidth="0.5"/>
                <rect x="10" y="0" width="9" height="4" fill="#3a3a42" stroke="#2d2d35" strokeWidth="0.5"/>
                <rect x="5" y="5" width="9" height="4" fill="#3a3a42" stroke="#2d2d35" strokeWidth="0.5"/>
              </pattern>
            </defs>
            
            {/* Night sky background */}
            <rect width="400" height="225" fill="#0d111a"/>
            
            {/* Stars */}
            <circle cx="50" cy="30" r="1.5" fill="white" opacity="0.8"/>
            <circle cx="350" cy="50" r="1" fill="white" opacity="0.6"/>
            <circle cx="320" cy="25" r="1.2" fill="white" opacity="0.7"/>
            
            {/* House silhouette */}
            <g opacity="0.4">
              {/* House body */}
              <rect x="80" y="100" width="160" height="100" fill="none" stroke="#f97316" strokeWidth="2"/>
              {/* Roof */}
              <polygon points="80,100 160,50 240,100" fill="none" stroke="#f97316" strokeWidth="2"/>
            </g>
            
            {/* Window with glow */}
            <g>
              <rect x="130" y="130" width="30" height="35" fill="#1a1a2e" stroke="#f97316" strokeWidth="1.5" opacity="0.5"/>
              <rect x="144" y="130" width="2" height="35" fill="#f97316" opacity="0.3"/>
              <rect x="130" y="147" width="30" height="2" fill="#f97316" opacity="0.3"/>
              {/* Window glow */}
              <rect className="window-light" x="132" y="132" width="26" height="31" fill="#fbbf24" opacity="0.4"/>
            </g>
            
            {/* Facade cross-section (exploded view) - right side */}
            <g transform="translate(260, 90)">
              {/* Wall with brick texture */}
              <rect x="0" y="0" width="20" height="100" fill="url(#brickPattern)" stroke="#2d2d35" strokeWidth="1"/>
              <text x="10" y="115" textAnchor="middle" fill="#64748b" fontSize="8">Zid</text>
              
              {/* Adhesive layer */}
              <rect x="25" y="0" width="3" height="100" fill="#64748b"/>
              
              {/* Insulation board */}
              <rect x="33" y="0" width="15" height="100" fill="#fbbf24" opacity="0.3" stroke="#f97316" strokeWidth="1"/>
              <text x="40.5" y="50" textAnchor="middle" fill="#fbbf24" fontSize="7" fontWeight="600" transform="rotate(-90 40.5 50)">EPS 12cm</text>
              
              {/* Outer facade paint */}
              <rect x="53" y="0" width="3" height="100" fill="#f97316"/>
              
              {/* Layer labels */}
              <line x1="56" y1="20" x2="75" y2="15" stroke="#64748b" strokeWidth="0.5" opacity="0.5"/>
              <text x="77" y="17" fill="#64748b" fontSize="7">Fasada</text>
              
              <line x1="40" y1="30" x2="75" y2="30" stroke="#64748b" strokeWidth="0.5" opacity="0.5"/>
              <text x="77" y="32" fill="#64748b" fontSize="7">Izolacija</text>
            </g>
            
            {/* Crack in facade */}
            <path 
              className="crack-line"
              d="M 200,120 L 205,130 L 198,145 L 203,160 L 200,175" 
              fill="none" 
              stroke="#f43f5e" 
              strokeWidth="2"
            />
            
            {/* Warning arrow pointing to crack */}
            <g className="warning-arrow" transform="translate(220, 145)">
              <polygon points="0,-8 8,0 0,8 2,0" fill="#f43f5e"/>
              <line x1="8" y1="0" x2="16" y2="0" stroke="#f43f5e" strokeWidth="2"/>
            </g>
            
            {/* Thermometer icon */}
            <g transform="translate(40, 150)">
              {/* Thermometer body */}
              <rect x="0" y="0" width="8" height="40" rx="4" fill="#334155" stroke="#64748b" strokeWidth="1"/>
              <rect x="2" y="2" width="4" height="36" rx="2" fill="#1e293b"/>
              {/* Mercury - cold */}
              <rect x="2.5" y="30" width="3" height="6" rx="1.5" fill="#3b82f6"/>
              {/* Bulb */}
              <circle cx="4" cy="42" r="5" fill="#334155" stroke="#64748b" strokeWidth="1"/>
              <circle cx="4" cy="42" r="3.5" fill="#3b82f6"/>
              {/* Temperature labels */}
              <text x="15" y="15" fill="#f43f5e" fontSize="9" fontWeight="600">50°F</text>
              <text x="15" y="38" fill="#3b82f6" fontSize="9" fontWeight="600">20°F</text>
              <text x="4" y="60" textAnchor="middle" fill="#64748b" fontSize="7">Zunaj</text>
            </g>
            
            {/* Category badge */}
            <rect x="20" y="185" width="85" height="24" rx="12" fill="#f97316" opacity="0.85"/>
            <text x="62.5" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Gradnja</text>
          </svg>
        )

      case 'parket':
        // Parquet flooring top-down view with offset brick pattern
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes liftPlank { 
                  0%, 100% { transform: translateY(0); } 
                  50% { transform: translateY(-2px); } 
                }
                @keyframes sanderVibrate { 
                  0%, 100% { transform: translateX(0); } 
                  50% { transform: translateX(1px); } 
                }
                @keyframes grainShimmer { 
                  0%, 100% { stop-opacity: 0.3; } 
                  50% { stop-opacity: 0.6; } 
                }
                .lifted-plank { animation: liftPlank 2s ease-in-out infinite alternate; }
                .sander-tool { animation: sanderVibrate 0.1s linear infinite; }
              `}</style>
              
              {/* Background gradient */}
              <linearGradient id="woodBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0d0905"/>
                <stop offset="100%" stopColor="#130d07"/>
              </linearGradient>
              
              {/* Wood grain gradients for planks */}
              <linearGradient id="grain1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#78350f"/>
                <stop offset="50%" stopColor="#92400e"/>
                <stop offset="100%" stopColor="#78350f"/>
              </linearGradient>
              
              <linearGradient id="grain2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6b2d0a"/>
                <stop offset="50%" stopColor="#78350f"/>
                <stop offset="100%" stopColor="#6b2d0a"/>
              </linearGradient>
              
              <linearGradient id="grain3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#92400e"/>
                <stop offset="50%" stopColor="#b45309">
                  <animate attributeName="stop-opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
                </stop>
                <stop offset="100%" stopColor="#92400e"/>
              </linearGradient>
            </defs>
            
            {/* Background */}
            <rect width="400" height="225" fill="url(#woodBg)"/>
            
            {/* Parquet planks - offset brick pattern */}
            {/* Row 1 */}
            <rect x="20" y="30" width="90" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            <rect x="115" y="30" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            <rect x="210" y="30" width="90" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            <rect x="305" y="30" width="75" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            
            {/* Row 2 - offset */}
            <rect x="20" y="65" width="45" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            <rect x="70" y="65" width="90" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            <rect x="165" y="65" width="90" height="30" fill="url(#grain3)" stroke="#000" strokeWidth="1"/>
            <rect x="260" y="65" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            <rect x="355" y="65" width="25" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            
            {/* Row 3 */}
            <rect x="20" y="100" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            
            {/* LIFTED PLANK - with shadow */}
            <g className="lifted-plank">
              <ellipse cx="160" cy="118" rx="48" ry="8" fill="#000" opacity="0.3"/>
              <rect x="115" y="100" width="90" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
              {/* Red X badge */}
              <circle cx="160" cy="115" r="8" fill="#f43f5e" opacity="0.9"/>
              <line x1="156" y1="111" x2="164" y2="119" stroke="#fff" strokeWidth="2"/>
              <line x1="164" y1="111" x2="156" y2="119" stroke="#fff" strokeWidth="2"/>
            </g>
            
            <rect x="210" y="100" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            <rect x="305" y="100" width="75" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            
            {/* Row 4 - offset with WIDE GROUT ERROR */}
            <rect x="20" y="135" width="45" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            <rect x="70" y="135" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            {/* Wide grout marked in red */}
            <rect x="163" y="135" width="3" height="30" fill="#f43f5e" opacity="0.8"/>
            <rect x="171" y="135" width="90" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            <rect x="266" y="135" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            <rect x="361" y="135" width="19" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            
            {/* Row 5 - MISMATCHED PATTERN */}
            <rect x="20" y="170" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            {/* This plank is LIGHT among dark - mismatched */}
            <rect x="115" y="170" width="90" height="30" fill="#b45309" stroke="#000" strokeWidth="1"/>
            <circle cx="160" cy="185" r="6" fill="none" stroke="#f43f5e" strokeWidth="2"/>
            <text x="160" y="188" textAnchor="middle" fill="#f43f5e" fontSize="10" fontWeight="bold">!</text>
            
            <rect x="210" y="170" width="90" height="30" fill="url(#grain2)" stroke="#000" strokeWidth="1"/>
            <rect x="305" y="170" width="75" height="30" fill="url(#grain1)" stroke="#000" strokeWidth="1"/>
            
            {/* Sander tool - bottom right */}
            <g className="sander-tool" transform="translate(330, 30)">
              <rect x="0" y="0" width="50" height="30" rx="4" fill="#9ca3af"/>
              <rect x="5" y="5" width="40" height="20" rx="2" fill="#6b7280"/>
              <circle cx="25" cy="35" r="12" fill="#4b5563" opacity="0.6"/>
              <circle cx="25" cy="35" r="8" fill="#374151"/>
              {/* Motion blur effect */}
              <ellipse cx="25" cy="35" rx="14" ry="6" fill="#9ca3af" opacity="0.2"/>
              <text x="25" y="60" textAnchor="middle" fill="#6b7280" fontSize="7">Brusilnik</text>
            </g>
            
            {/* Category badge */}
            <rect x="20" y="185" width="125" height="24" rx="12" fill="#7c3aed" opacity="0.85"/>
            <text x="82.5" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Zaključna dela</text>
          </svg>
        )

      case 'vzdrzevanje':
        // Maintenance split view - tools left, checklist right
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes checkDraw1 { 
                  0% { stroke-dashoffset: 20; } 
                  100% { stroke-dashoffset: 0; } 
                }
                @keyframes checkDraw2 { 
                  0% { stroke-dashoffset: 20; } 
                  100% { stroke-dashoffset: 0; } 
                }
                @keyframes checkDraw3 { 
                  0% { stroke-dashoffset: 20; } 
                  100% { stroke-dashoffset: 0; } 
                }
                @keyframes progressFill { 
                  0% { width: 0; } 
                  100% { width: 60%; } 
                }
                @keyframes toolShimmer { 
                  0% { stop-offset: -100%; } 
                  100% { stop-offset: 200%; } 
                }
                .check1 { stroke-dasharray: 20; stroke-dashoffset: 20; animation: checkDraw1 0.6s ease forwards; }
                .check2 { stroke-dasharray: 20; stroke-dashoffset: 20; animation: checkDraw2 0.6s ease forwards 0.3s; }
                .check3 { stroke-dasharray: 20; stroke-dashoffset: 20; animation: checkDraw3 0.6s ease forwards 0.6s; }
                .progress-bar { animation: progressFill 1.5s ease-out forwards; }
              `}</style>
              
              {/* Diamond/dot pattern */}
              <pattern id="dotPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="0.8" fill="#10b981" opacity="0.05"/>
              </pattern>
              
              {/* Tool shimmer gradient */}
              <linearGradient id="toolShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="-50%" stopColor="transparent"/>
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4">
                  <animate attributeName="offset" values="-0.5;2" dur="4s" repeatCount="indefinite"/>
                </stop>
                <stop offset="50%" stopColor="transparent"/>
              </linearGradient>
            </defs>
            
            {/* Background */}
            <rect width="400" height="225" fill="#070e0b"/>
            <rect width="400" height="225" fill="url(#dotPattern)"/>
            
            {/* LEFT SIDE - TOOLS */}
            
            {/* French wrench (diagonal) */}
            <g transform="translate(90, 80) rotate(-25)">
              <rect x="-8" y="-50" width="16" height="100" rx="3" fill="#6b7280"/>
              <rect x="-8" y="-50" width="16" height="100" rx="3" fill="url(#toolShimmer)"/>
              {/* Wrench head */}
              <path d="M -12,-55 L -8,-50 L 8,-50 L 12,-55 L 8,-60 L -8,-60 Z" fill="#6b7280"/>
              <circle cx="0" cy="-55" r="6" fill="#374151"/>
            </g>
            
            {/* Screwdriver (crossing the wrench) */}
            <g transform="translate(70, 120) rotate(35)">
              {/* Handle - red */}
              <rect x="-6" y="0" width="12" height="40" rx="6" fill="#ef4444"/>
              <rect x="-6" y="0" width="12" height="40" rx="6" fill="url(#toolShimmer)"/>
              {/* Shaft - gray */}
              <rect x="-2" y="40" width="4" height="50" fill="#6b7280"/>
              {/* Tip */}
              <rect x="-3" y="88" width="6" height="8" fill="#475569"/>
            </g>
            
            {/* Hammer (bottom, diagonal) */}
            <g transform="translate(100, 160) rotate(-15)">
              {/* Handle */}
              <rect x="-3" y="0" width="6" height="50" fill="#6b7280"/>
              <rect x="-3" y="0" width="6" height="50" fill="url(#toolShimmer)"/>
              {/* Hammer head */}
              <rect x="-15" y="-12" width="30" height="12" rx="2" fill="#6b7280"/>
              <rect x="10" y="-8" width="8" height="4" fill="#475569"/>
            </g>
            
            {/* RIGHT SIDE - CHECKLIST */}
            
            {/* Clipboard background */}
            <rect x="220" y="45" width="150" height="140" rx="8" fill="#0d1f17"/>
            {/* Clip at top */}
            <rect x="280" y="40" width="30" height="8" rx="4" fill="#374151"/>
            <circle cx="295" cy="44" r="3" fill="#6b7280"/>
            
            {/* Checklist items */}
            
            {/* Item 1 - DONE (green check) */}
            <g transform="translate(235, 65)">
              <rect x="0" y="0" width="16" height="16" rx="3" stroke="#10b981" strokeWidth="2" fill="none"/>
              <path className="check1" d="M 3,8 L 6,11 L 13,4" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="25" y="4" width="90" height="3" rx="1.5" fill="#475569"/>
              <rect x="25" y="9" width="70" height="2" rx="1" fill="#374151"/>
            </g>
            
            {/* Item 2 - DONE (green check) */}
            <g transform="translate(235, 90)">
              <rect x="0" y="0" width="16" height="16" rx="3" stroke="#10b981" strokeWidth="2" fill="none"/>
              <path className="check2" d="M 3,8 L 6,11 L 13,4" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="25" y="4" width="85" height="3" rx="1.5" fill="#475569"/>
              <rect x="25" y="9" width="65" height="2" rx="1" fill="#374151"/>
            </g>
            
            {/* Item 3 - DONE (green check) */}
            <g transform="translate(235, 115)">
              <rect x="0" y="0" width="16" height="16" rx="3" stroke="#10b981" strokeWidth="2" fill="none"/>
              <path className="check3" d="M 3,8 L 6,11 L 13,4" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="25" y="4" width="80" height="3" rx="1.5" fill="#475569"/>
              <rect x="25" y="9" width="75" height="2" rx="1" fill="#374151"/>
            </g>
            
            {/* Item 4 - IN PROGRESS (amber, partial) */}
            <g transform="translate(235, 140)">
              <rect x="0" y="0" width="16" height="16" rx="3" stroke="#f59e0b" strokeWidth="2" fill="none"/>
              <path d="M 3,8 L 8,8" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <rect x="25" y="4" width="88" height="3" rx="1.5" fill="#475569"/>
              <rect x="25" y="9" width="60" height="2" rx="1" fill="#374151"/>
            </g>
            
            {/* Item 5 - NOT DONE (red, empty) */}
            <g transform="translate(235, 165)">
              <rect x="0" y="0" width="16" height="16" rx="3" stroke="#f43f5e" strokeWidth="2" fill="none"/>
              <rect x="25" y="4" width="95" height="3" rx="1.5" fill="#475569"/>
              <rect x="25" y="9" width="55" height="2" rx="1" fill="#374151"/>
            </g>
            
            {/* Progress bar container */}
            <rect x="235" y="195" width="110" height="8" rx="4" fill="#1e293b"/>
            {/* Progress bar fill - 60% */}
            <rect className="progress-bar" x="235" y="195" width="0" height="8" rx="4" fill="#10b981"/>
            
            {/* Category badge */}
            <rect x="20" y="185" width="115" height="24" rx="12" fill="#10b981" opacity="0.85"/>
            <text x="77.5" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Vzdrževanje</text>
          </svg>
        )

      default:
        return null
    }
  }

  return renderIllustration()
}
