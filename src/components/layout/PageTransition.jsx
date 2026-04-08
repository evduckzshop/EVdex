import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useNav } from '../../context/NavigationContext'

const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeInOut' },
}

const SLIDE_LEFT = {
  initial: { x: '40%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-20%', opacity: 0 },
  transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] },
}

const SLIDE_RIGHT = {
  initial: { x: '-40%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '20%', opacity: 0 },
  transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] },
}

const VARIANTS = {
  'fade': FADE,
  'slide-left': SLIDE_LEFT,
  'slide-right': SLIDE_RIGHT,
}

export default function PageTransition({ children }) {
  const location = useLocation()
  const { transitionType } = useNav()
  const currentVariant = useRef(FADE)

  // Capture the variant at the moment of navigation
  const variant = VARIANTS[transitionType.current] || FADE
  currentVariant.current = variant

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={variant.transition}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
