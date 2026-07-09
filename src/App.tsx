import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PersonaProvider, usePersona } from "./persona/PersonaContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import IntroLoader from "./components/IntroLoader";
import DevPortfolio from "./components/dev/DevPortfolio";
import CreativePortfolio from "./components/creative/CreativePortfolio";

function PortfolioShell() {
  const { persona } = usePersona();
  const reduceMotion = useReducedMotion();

  // Reset scroll when flipping personas — the two sites have no shared anchors.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [persona]);

  const variants = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -12 },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.div
          key={persona}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="flex-1 pt-16"
        >
          {persona === "dev" ? <DevPortfolio /> : <CreativePortfolio />}
        </motion.div>
      </AnimatePresence>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <PersonaProvider>
      <IntroLoader />
      <PortfolioShell />
    </PersonaProvider>
  );
}
