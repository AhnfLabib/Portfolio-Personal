import Section from "./Section";
import Timeline from "./Timeline";
import { leadership } from "../data/content";

export default function Leadership() {
  return (
    <Section id="leadership" label="Community" title="Leadership Experience">
      <Timeline entries={leadership} />
    </Section>
  );
}
