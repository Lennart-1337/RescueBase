import type { PropsWithChildren } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fadeVariants, scaleFadeVariants, slideUpVariants } from "./presets";
import { useMotionMode } from "./use-motion-mode";

export function AnimatedContentSwap({
  children,
  contentKey
}: PropsWithChildren<{ contentKey: string }>) {
  const mode = useMotionMode();

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate="visible"
        data-motion-mode={mode}
        data-motion-preset="panel-enter"
        exit="exit"
        initial="hidden"
        key={contentKey}
        variants={slideUpVariants(mode)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AnimatedRouteView({
  children,
  routeKey
}: PropsWithChildren<{ routeKey: string }>) {
  const mode = useMotionMode();

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate="visible"
        data-motion-mode={mode}
        data-motion-preset="fade"
        exit="exit"
        initial="hidden"
        key={routeKey}
        variants={fadeVariants(mode)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AnimatedStateSection(props: PropsWithChildren<{ className: string }>) {
  const mode = useMotionMode();

  return (
    <motion.section
      animate="visible"
      className={props.className}
      data-motion-mode={mode}
      data-motion-preset="scale-fade"
      initial="hidden"
      variants={scaleFadeVariants(mode)}
    >
      {props.children}
    </motion.section>
  );
}
