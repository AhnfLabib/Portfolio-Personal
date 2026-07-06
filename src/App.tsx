import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Education from "./components/Education";
import Experience from "./components/Experience";
import Leadership from "./components/Leadership";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Quote from "./components/Quote";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Education />
        <Experience />
        <Leadership />
        <Projects />
        <Contact />
        <Quote />
      </main>
      <Footer />
    </div>
  );
}
