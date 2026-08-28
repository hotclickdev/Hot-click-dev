import FooterCtaStrip from './footer/FooterCtaStrip'
import FooterColumns from './footer/FooterColumns'
import FooterBottomBar from './footer/FooterBottomBar'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ fontFamily: 'inherit', marginTop: 'auto' }}>
      <FooterCtaStrip />

      <div style={{ background: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <FooterColumns />
          <FooterBottomBar year={year} />
        </div>
      </div>
    </footer>
  )
}
