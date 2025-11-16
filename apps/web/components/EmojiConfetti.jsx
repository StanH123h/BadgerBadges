'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function EmojiConfetti({ show, emoji, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      // 生成 30 个撒花粒子
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100, // 0-100% 横向位置
        delay: Math.random() * 0.5, // 延迟
        duration: 2 + Math.random() * 1, // 2-3秒下落时间
        rotation: Math.random() * 360, // 初始旋转角度
        rotationSpeed: (Math.random() - 0.5) * 720, // 旋转速度
        scale: 0.8 + Math.random() * 0.4, // 0.8-1.2 大小
      }));
      setParticles(newParticles);

      // 动画结束后清理
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9998,
            overflow: 'hidden',
          }}
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{
                x: `${particle.x}vw`,
                y: '-10%',
                rotate: particle.rotation,
                scale: particle.scale,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: particle.rotation + particle.rotationSpeed,
                opacity: [1, 1, 0.5],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeIn',
              }}
              style={{
                position: 'absolute',
                fontSize: '3rem',
                userSelect: 'none',
              }}
            >
              {emoji}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
