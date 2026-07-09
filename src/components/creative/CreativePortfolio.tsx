import CreativeHero from "./CreativeHero";
import CreativeStatement from "./CreativeStatement";
import CreativeCrafts from "./CreativeCrafts";
import CreativeGallery from "./CreativeGallery";
import CreativeQuote from "./CreativeQuote";
import CreativeContact from "./CreativeContact";

export default function CreativePortfolio() {
  return (
    <main id="creative-portfolio">
      <CreativeHero />
      <CreativeStatement />
      <CreativeCrafts />
      <CreativeGallery />
      <CreativeQuote />
      <CreativeContact />
    </main>
  );
}
