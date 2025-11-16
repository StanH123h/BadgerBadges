'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import Tilt from 'react-parallax-tilt';

export default function NFTBadge({ achievement, mintNumber, imageUrl, signature }) {
  const badgeRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    // GSAP glow animation
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0.8,
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    // Badge entrance animation
    if (badgeRef.current) {
      gsap.fromTo(
        badgeRef.current,
        {
          scale: 0,
          rotation: -180,
          opacity: 0,
        },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'back.out(1.7)',
        }
      );
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <Tilt
        tiltMaxAngleX={25}
        tiltMaxAngleY={25}
        scale={1.05}
        transitionSpeed={400}
        glareEnable={true}
        glareMaxOpacity={0.5}
        glareColor="#ffffff"
        glarePosition="all"
      >
        <div
          ref={badgeRef}
          className="relative w-64 h-80 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Glow effect */}
          <div
            ref={glowRef}
            className="absolute inset-0 opacity-0"
            style={{
              background: `radial-gradient(circle at center, rgba(197, 5, 12, 0.4), transparent 70%)`,
              filter: 'blur(20px)',
              transform: 'translateZ(-10px)',
            }}
          />

          {/* Main badge container */}
          <div
            className="relative w-full h-full bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-6 flex flex-col items-center justify-between"
            style={{
              transform: 'translateZ(20px)',
            }}
          >
            {/* Header */}
            <div className="w-full text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1 mb-3"
              >
                <span className="text-white text-xs font-bold tracking-wider">
                  BADGER BADGE
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1 inline-block"
              >
                <span className="text-white/90 text-xs font-mono">
                  #{mintNumber}
                </span>
              </motion.div>
            </div>

            {/* NFT Image */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.6, type: 'spring' }}
              className="relative w-40 h-40 rounded-xl overflow-hidden shadow-xl"
              style={{
                transform: 'translateZ(40px)',
              }}
            >
              <img
                src={imageUrl}
                alt={achievement.name}
                className="w-full h-full object-cover"
              />

              {/* Image overlay shimmer */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
            </motion.div>

            {/* Achievement Info */}
            <div className="w-full text-center space-y-2">
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-white text-lg font-bold drop-shadow-lg"
              >
                {achievement.name}
              </motion.h3>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-2"
              >
                <span className="text-white/80 text-xs bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
                  {achievement.category}
                </span>
                <span className="text-4xl">
                  {achievement.icon}
                </span>
              </motion.div>

              {/* Transaction Link */}
              {signature && (
                <motion.a
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-white/70 hover:text-white text-xs underline"
                  style={{
                    transform: 'translateZ(30px)',
                  }}
                >
                  View on Explorer ↗
                </motion.a>
              )}
            </div>

            {/* Decorative corner accents */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-white/30 rounded-tl-lg" />
            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-white/30 rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-white/30 rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-white/30 rounded-br-lg" />
          </div>

          {/* Shine effect on hover */}
          <div
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
              backgroundSize: '200% 200%',
              animation: 'shine 3s ease-in-out infinite',
            }}
          />
        </div>
      </Tilt>

      <style jsx>{`
        @keyframes shine {
          0% {
            background-position: -200% -200%;
          }
          100% {
            background-position: 200% 200%;
          }
        }
      `}</style>
    </motion.div>
  );
}
