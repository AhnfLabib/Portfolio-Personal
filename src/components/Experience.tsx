import Section from "./Section";
import Timeline from "./Timeline";
import { experience } from "../data/content";

export default function Experience() {
  return (
    <Section id="experience" label="Career" title="Work Experience">
      <Timeline entries={experience} />
    </Section>
  );
}
