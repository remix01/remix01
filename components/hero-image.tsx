"use client"

import { useState } from "react"
import Image from "next/image"

interface HeroImageProps {
  className?: string
}

function HeroPlaceholderSVG({ className }: { className?: string }) {
  const isDev = process.env.NODE_ENV === "development"

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 600 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        {/* Gradient Background */}
        <defs>
          <linearGradient id="heroGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width="600" height="700" fill="url(#heroGradient)" />

        {/* Background Elements - House outline */}
        <path
          d="M100 250 L150 200 L200 250 L200 320 L100 320 Z"
          stroke="#475569"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />
        <rect x="130" y="270" width="20" height="30" stroke="#475569" strokeWidth="2" fill="none" opacity="0.3" />
        <rect x="160" y="270" width="20" height="20" stroke="#475569" strokeWidth="2" fill="none" opacity="0.3" />

        {/* Pipe elements */}
        <path
          d="M420 180 L480 180 L480 280 L420 280"
          stroke="#475569"
          strokeWidth="3"
          fill="none"
          opacity="0.25"
        />
        <circle cx="450" cy="230" r="15" stroke="#475569" strokeWidth="2" fill="none" opacity="0.25" />

        {/* Light bulb icon */}
        <circle cx="500" cy="400" r="20" stroke="#475569" strokeWidth="2" fill="none" opacity="0.3" />
        <path
          d="M490 420 L510 420 M492 425 L508 425"
          stroke="#475569"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* Central craftsman figure */}
        <g transform="translate(250, 280)">
          {/* Head */}
          <circle cx="50" cy="30" r="25" stroke="white" strokeWidth="3" fill="none" />
          
          {/* Body */}
          <path
            d="M50 55 L50 150"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Arms */}
          <path
            d="M50 75 L20 110 M50 75 L80 105"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Legs */}
          <path
            d="M50 150 L30 200 M50 150 L70 200"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Tool - wrench in hand */}
          <g transform="translate(78, 100)">
            <path
              d="M0 0 L15 -15 M0 0 L-5 5"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="15" cy="-15" r="5" stroke="#06b6d4" strokeWidth="2" fill="none" />
          </g>
          
          {/* Hardhat */}
          <path
            d="M25 25 Q50 15 75 25"
            stroke="#fbbf24"
            strokeWidth="3"
            fill="none"
          />
        </g>

        {/* Tool icons scattered */}
        <g opacity="0.2">
          {/* Hammer */}
          <path
            d="M120 450 L140 430 M140 430 L155 430 L155 440 L140 440"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Screwdriver */}
          <path
            d="M480 520 L500 540 M500 540 L505 545"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="505" cy="545" r="8" stroke="white" strokeWidth="2" fill="none" />
        </g>

        {/* Dev environment text */}
        {isDev && (
          <text
            x="300"
            y="650"
            textAnchor="middle"
            fill="white"
            fontSize="18"
            fontFamily="system-ui, sans-serif"
            opacity="0.8"
          >
            Fotografija kmalu
          </text>
        )}
      </svg>
    </div>
  )
}

export function HeroImage({ className }: HeroImageProps) {
  const [imgError, setImgError] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  const localSrc = "/images/hero-craftsman.jpg"
  const unsplashFallback = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"

  // If both local and Unsplash fail, show SVG placeholder
  if (imgError && useFallback) {
    return <HeroPlaceholderSVG className={className} />
  }

  return (
    <Image
      src={imgError ? unsplashFallback : localSrc}
      alt="LiftGO preverjen obrtnik pri delu na domu v Sloveniji"
      width={600}
      height={700}
      sizes="(max-width: 768px) 100vw, 50vw"
      className={className}
      priority
      onError={() => {
        if (!imgError) {
          setImgError(true)
        } else {
          setUseFallback(true)
        }
      }}
    />
  )
}
