import HeroSection from './sections/HeroSection'
import AIScopeSection from './sections/AIScopeSection'
import ExplorerBentoSection from './sections/ExplorerBentoSection'
import MushafEcosystemSection from './sections/MushafEcosystemSection'
import RoadmapSection from './sections/RoadmapSection'
import FooterCTA from './sections/FooterCTA'
import { Navbar, useLandingTheme } from './primitives'

export default function LandingPage() {
  const { theme, toggle } = useLandingTheme()

  return (
    <div
      className={`landing-root ${theme === 'dark' ? 'landing-dark' : ''} min-h-screen overflow-x-hidden`}
    >
      <Navbar theme={theme} onToggleTheme={toggle} />

      <main className="pt-14">
        <HeroSection />
        <AIScopeSection />
        <ExplorerBentoSection />
        <MushafEcosystemSection />
        <RoadmapSection />
        <FooterCTA />
      </main>
    </div>
  )
}
