import DevHero from "./DevHero";
import DevAbout from "./DevAbout";
import DevExperience from "./DevExperience";
import DevProjects from "./DevProjects";
import DevEducation from "./DevEducation";
import DevLeadership from "./DevLeadership";
import DevContact from "./DevContact";

export default function DevPortfolio() {
  return (
    <main id="dev-portfolio">
      <DevHero />
      <DevAbout />
      <DevExperience />
      <DevProjects />
      <DevEducation />
      <DevLeadership />
      <DevContact />
    </main>
  );
}
