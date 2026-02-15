import React from 'react'

type IllustrationCategory = 'Vodovod' | 'Elektrika' | 'Gradnja' | 'Zaključna dela' | 'Vzdrževanje'

interface BlogIllustrationProps {
  category: IllustrationCategory
  className?: string
}

export function BlogIllustration({ category, className = '' }: BlogIllustrationProps) {
  const renderIllustration = () => {
    switch (category) {
      case 'Gradnja':
        // Bathroom renovation theme with blue tiles and steam
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
                @keyframes steam { 0% { opacity: 0.3; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-30px); } }
                .tile { fill: #1e3a8a; }
                .tile-grout { fill: #0c0e14; }
                .water { fill: #3b82f6; animation: float 3s ease-in-out infinite; }
                .steam { fill: #60a5fa; animation: steam 2.5s ease-out infinite; }
              `}</style>
            </defs>
            <rect width="400" height="225" fill="#0c0e14"/>
            
            {/* Tiles background */}
            {[...Array(6)].map((_, row) => 
              [...Array(8)].map((_, col) => (
                <g key={`${row}-${col}`}>
                  <rect className="tile" x={col * 50 + 2} y={row * 37.5 + 2} width="46" height="33.5" rx="2"/>
                  <rect className="tile-grout" x={col * 50} y={row * 37.5} width="50" height="37.5" rx="2" fillOpacity="0.15"/>
                </g>
              ))
            )}
            
            {/* Shower head */}
            <rect fill="#94a3b8" x="160" y="30" width="80" height="8" rx="4"/>
            <circle fill="#94a3b8" cx="200" cy="60" r="25"/>
            {[...Array(9)].map((_, i) => (
              <circle key={i} fill="#1e293b" cx={180 + (i % 3) * 20} cy={52 + Math.floor(i / 3) * 8} r="2"/>
            ))}
            
            {/* Water drops */}
            {[...Array(7)].map((_, i) => (
              <ellipse key={i} className="water" cx={185 + i * 5} cy={100 + i * 15} rx="3" ry="6" opacity="0.7" style={{ animationDelay: `${i * 0.2}s` }}/>
            ))}
            
            {/* Steam effects */}
            {[...Array(4)].map((_, i) => (
              <ellipse key={i} className="steam" cx={150 + i * 30} cy={180} rx="20" ry="10" style={{ animationDelay: `${i * 0.6}s` }}/>
            ))}
            
            {/* Category badge */}
            <rect x="20" y="185" width="100" height="24" rx="12" fill="#3b82f6" opacity="0.9"/>
            <text x="70" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Kopalnica</text>
          </svg>
        )

      case 'Elektrika':
        // Electrical theme with lightbulb and circuits
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
                @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 5px #f59e0b); } 50% { filter: drop-shadow(0 0 15px #fbbf24); } }
                .circuit { stroke: #78350f; stroke-width: 2; fill: none; }
                .circuit-active { stroke: #f59e0b; stroke-width: 3; animation: pulse 2s ease-in-out infinite; }
                .bulb { fill: #fbbf24; animation: glow 2s ease-in-out infinite; }
              `}</style>
            </defs>
            <rect width="400" height="225" fill="#0c0e14"/>
            
            {/* Circuit board pattern */}
            <g className="circuit">
              <path d="M50,50 L150,50 L150,100 L250,100" opacity="0.3"/>
              <path d="M100,30 L100,80 L200,80 L200,150" opacity="0.3"/>
              <path d="M300,60 L250,60 L250,120 L150,120" opacity="0.3"/>
            </g>
            
            {/* Active circuits with animation */}
            <g className="circuit-active">
              <path d="M50,150 L100,150 L100,180 L200,180"/>
              <circle cx="50" cy="150" r="4" fill="#f59e0b"/>
              <circle cx="100" cy="180" r="4" fill="#f59e0b"/>
              <circle cx="200" cy="180" r="4" fill="#f59e0b"/>
            </g>
            
            {/* Light bulb */}
            <g transform="translate(200, 50)">
              <ellipse className="bulb" cx="0" cy="0" rx="40" ry="45"/>
              <path d="M-20,40 L-15,55 L15,55 L20,40" fill="#92400e"/>
              <rect x="-8" y="55" width="16" height="15" fill="#78350f" rx="2"/>
              <line x1="-25" y1="-10" x2="-40" y2="-15" stroke="#fbbf24" strokeWidth="2" opacity="0.6"/>
              <line x1="25" y1="-10" x2="40" y2="-15" stroke="#fbbf24" strokeWidth="2" opacity="0.6"/>
              <line x1="-20" y1="15" x2="-35" y2="25" stroke="#fbbf24" strokeWidth="2" opacity="0.6"/>
              <line x1="20" y1="15" x2="35" y2="25" stroke="#fbbf24" strokeWidth="2" opacity="0.6"/>
            </g>
            
            {/* Electrical symbols */}
            <circle cx="320" cy="140" r="20" stroke="#f59e0b" strokeWidth="2" fill="none"/>
            <line x1="305" y1="140" x2="335" y2="140" stroke="#f59e0b" strokeWidth="2"/>
            <line x1="320" y1="125" x2="320" y2="155" stroke="#f59e0b" strokeWidth="2"/>
            
            {/* Category badge */}
            <rect x="20" y="185" width="100" height="24" rx="12" fill="#f59e0b" opacity="0.9"/>
            <text x="70" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Elektrika</text>
          </svg>
        )

      case 'Vodovod':
        // Plumbing theme with pipes and water flow
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes flow { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
                @keyframes drip { 0%, 100% { cy: 180; opacity: 1; } 50% { cy: 210; opacity: 0; } }
                .pipe { fill: #155e75; stroke: #0e7490; stroke-width: 2; }
                .water-flow { fill: #06b6d4; animation: flow 3s linear infinite; }
                .droplet { fill: #22d3ee; animation: drip 1.5s ease-in infinite; }
              `}</style>
              <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4"/>
              </linearGradient>
            </defs>
            <rect width="400" height="225" fill="#0c0e14"/>
            
            {/* Pipe system */}
            <rect className="pipe" x="80" y="40" width="30" height="140" rx="4"/>
            <rect className="pipe" x="80" y="160" width="200" height="30" rx="4"/>
            <rect className="pipe" x="260" y="80" width="30" height="110" rx="4"/>
            
            {/* Pipe joints */}
            <circle cx="95" cy="175" r="20" fill="#0e7490"/>
            <circle cx="275" cy="175" r="20" fill="#0e7490"/>
            
            {/* Water flow inside pipes */}
            <rect x="90" y="50" width="10" height="40" fill="url(#waterGradient)" opacity="0.8"/>
            <rect x="90" y="168" width="180" height="14" fill="url(#waterGradient)" opacity="0.8"/>
            <rect x="268" y="90" width="14" height="90" fill="url(#waterGradient)" opacity="0.8"/>
            
            {/* Valve */}
            <g transform="translate(145, 175)">
              <rect x="-15" y="-25" width="30" height="50" fill="#334155" rx="3"/>
              <circle cx="0" cy="0" r="18" fill="#475569"/>
              <circle cx="0" cy="0" r="12" fill="#64748b"/>
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#0c0e14" strokeWidth="3"/>
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#0c0e14" strokeWidth="3"/>
            </g>
            
            {/* Water droplets */}
            {[0, 1, 2].map(i => (
              <circle key={i} className="droplet" cx={90 + i * 15} cy="180" r="4" style={{ animationDelay: `${i * 0.5}s` }}/>
            ))}
            
            {/* Pressure gauge */}
            <circle cx="330" cy="130" r="30" fill="#1e293b" stroke="#06b6d4" strokeWidth="3"/>
            <path d="M330,130 L345,115" stroke="#06b6d4" strokeWidth="2"/>
            <text x="330" y="165" textAnchor="middle" fill="#06b6d4" fontSize="10">PSI</text>
            
            {/* Category badge */}
            <rect x="20" y="185" width="90" height="24" rx="12" fill="#06b6d4" opacity="0.9"/>
            <text x="65" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Vodovod</text>
          </svg>
        )

      case 'Zaključna dela':
        // Parquet/flooring theme with wooden planks
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .plank { fill: #92400e; }
                .plank-light { fill: #b45309; }
                .grain { stroke: #78350f; stroke-width: 1; opacity: 0.3; }
                .sander { animation: rotate 4s linear infinite; transform-origin: center; }
              `}</style>
              <pattern id="woodGrain" width="100" height="30" patternUnits="userSpaceOnUse">
                <path className="grain" d="M0,15 Q25,10 50,15 T100,15"/>
                <path className="grain" d="M0,20 Q30,18 60,20 T100,20"/>
              </pattern>
            </defs>
            <rect width="400" height="225" fill="#0c0e14"/>
            
            {/* Wooden planks in perspective */}
            {[...Array(8)].map((_, i) => (
              <g key={i}>
                <rect className={i % 2 === 0 ? 'plank' : 'plank-light'} 
                  x={i * 50} y={60 + i * 15} width="50" height={150 - i * 15} 
                  fill="url(#woodGrain)"/>
                <line x1={i * 50} y1={60 + i * 15} x2={i * 50} y2={210} 
                  stroke="#78350f" strokeWidth="2"/>
              </g>
            ))}
            
            {/* Floor sander tool */}
            <g transform="translate(250, 100)">
              <rect x="-30" y="-10" width="60" height="50" fill="#475569" rx="5"/>
              <rect x="-25" y="20" width="50" height="30" fill="#64748b" rx="3"/>
              <circle className="sander" cx="0" cy="35" r="20" fill="#b45309"/>
              <circle cx="0" cy="35" r="15" fill="#92400e"/>
              <circle cx="0" cy="35" r="10" fill="#78350f"/>
              
              {/* Handle */}
              <rect x="-3" y="-40" width="6" height="35" fill="#334155" rx="3"/>
              <ellipse cx="0" cy="-40" rx="12" ry="8" fill="#475569"/>
              
              {/* Sawdust particles */}
              {[...Array(5)].map((_, i) => (
                <circle key={i} cx={-20 + i * 10} cy={60 + i * 5} r="2" fill="#d97706" opacity="0.4"/>
              ))}
            </g>
            
            {/* Tools */}
            <g transform="translate(80, 30)">
              <rect x="-15" y="0" width="30" height="8" fill="#71717a" rx="2"/>
              <text x="0" y="25" textAnchor="middle" fill="#a1a1aa" fontSize="10">Lac</text>
            </g>
            
            {/* Category badge */}
            <rect x="20" y="185" width="120" height="24" rx="12" fill="#92400e" opacity="0.9"/>
            <text x="80" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Zaključna dela</text>
          </svg>
        )

      case 'Vzdrževanje':
        // Maintenance theme with tools and checklist
        return (
          <svg viewBox="0 0 400 225" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <style>{`
                @keyframes checkmark { 0% { stroke-dashoffset: 50; } 100% { stroke-dashoffset: 0; } }
                @keyframes wrench { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
                .check { stroke: #10b981; stroke-width: 3; fill: none; stroke-dasharray: 50; animation: checkmark 1.5s ease-in-out infinite; }
                .tool { fill: #6b7280; animation: wrench 2s ease-in-out infinite; transform-origin: center; }
              `}</style>
            </defs>
            <rect width="400" height="225" fill="#0c0e14"/>
            
            {/* Clipboard/Checklist */}
            <rect x="50" y="40" width="160" height="150" fill="#1f2937" rx="8"/>
            <rect x="50" y="30" width="160" height="20" fill="#374151" rx="8"/>
            <rect x="110" y="25" width="40" height="10" fill="#4b5563" rx="5"/>
            
            {/* Checklist items */}
            {[0, 1, 2, 3].map(i => (
              <g key={i} transform={`translate(70, ${65 + i * 30})`}>
                <rect x="0" y="0" width="20" height="20" fill="#10b981" rx="4" opacity={i < 2 ? 1 : 0.3}/>
                {i < 2 && (
                  <path className="check" d="M5,10 L9,14 L15,6" style={{ animationDelay: `${i * 0.5}s` }}/>
                )}
                <rect x="30" y="5" width="90" height="4" fill="#4b5563" rx="2"/>
                <rect x="30" y="11" width="70" height="3" fill="#374151" rx="1.5"/>
              </g>
            ))}
            
            {/* Wrench */}
            <g transform="translate(280, 100)">
              <rect className="tool" x="-10" y="-60" width="20" height="80" fill="#9ca3af" rx="3"/>
              <circle cx="0" cy="-65" r="18" fill="#6b7280"/>
              <circle cx="0" cy="-65" r="12" fill="#4b5563"/>
              <rect x="-8" y="10" width="16" height="30" fill="#9ca3af" rx="8"/>
            </g>
            
            {/* Screwdriver */}
            <g transform="translate(320, 140) rotate(30)">
              <rect x="-3" y="-40" width="6" height="50" fill="#fbbf24"/>
              <polygon points="0,-40 -4,-48 4,-48" fill="#9ca3af"/>
            </g>
            
            {/* Gears */}
            <g transform="translate(300, 60)">
              <circle cx="0" cy="0" r="20" fill="none" stroke="#10b981" strokeWidth="3"/>
              {[...Array(8)].map((_, i) => (
                <rect key={i} x="-3" y="-24" width="6" height="8" fill="#10b981" 
                  transform={`rotate(${i * 45})`} transformOrigin="0 0"/>
              ))}
              <circle cx="0" cy="0" r="8" fill="#065f46"/>
            </g>
            
            {/* Category badge */}
            <rect x="20" y="185" width="110" height="24" rx="12" fill="#10b981" opacity="0.9"/>
            <text x="75" y="202" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Vzdrževanje</text>
          </svg>
        )

      default:
        return null
    }
  }

  return renderIllustration()
}
