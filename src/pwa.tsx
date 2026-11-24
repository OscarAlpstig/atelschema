import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

type InstallPromptEvent = Event & { prompt(): Promise<unknown> }

export function InstallMenu() {
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    function captureInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const clearInstallPrompt = () => setInstallPrompt(null)
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    window.addEventListener('appinstalled', clearInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
      window.removeEventListener('appinstalled', clearInstallPrompt)
    }
  }, [])

  async function install() {
    setInstallPrompt(null)
    try {
      await installPrompt?.prompt()
    } catch {
      // The manual instructions are available if the browser prompt fails.
    }
  }

  return <>
    <button ref={trigger} className="button install-trigger" aria-haspopup="dialog" aria-controls="install-guide"
      onClick={() => dialog.current?.showModal()}>
      Installera appen
    </button>
    <dialog ref={dialog} id="install-guide" className="install-dialog" aria-labelledby="install-title"
      onClose={() => trigger.current?.focus()}>
      <header className="install-heading">
        <h2 id="install-title">Installera Åtelschema</h2>
        <form method="dialog">
          <button className="icon-button" aria-label="Stäng installationsguiden">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </form>
      </header>
      {installPrompt && <button className="button install-direct" onClick={install}>Installera på den här enheten</button>}
      <div className="install-platforms">
        <section className="surface install-platform">
          <h3>iPhone <span>Safari</span></h3>
          <ol>
            <li>Öppna Åtelschema i <strong>Safari</strong>.</li>
            <li>Tryck på <strong>Dela</strong>, fyrkanten med pil uppåt.</li>
            <li>Välj <strong>Lägg till på hemskärmen</strong>. Tryck på <strong>Visa mer</strong> om valet är dolt.</li>
            <li>Slå på <strong>Öppna som webbapp</strong> om valet finns och tryck på <strong>Lägg till</strong>.</li>
          </ol>
        </section>
        <section className="surface install-platform">
          <h3>Android <span>Chrome</span></h3>
          <ol>
            <li>Öppna Åtelschema i <strong>Chrome</strong>.</li>
            <li>Tryck på <strong>Mer</strong>, menyn med tre punkter.</li>
            <li>Välj <strong>Installera och skapa genväg</strong> och sedan <strong>Installera</strong>. Valet kan också heta <strong>Installera app</strong> eller <strong>Lägg till på startskärmen</strong>.</li>
            <li>Bekräfta och öppna Åtelschema från appikonen.</li>
          </ol>
        </section>
      </div>
      <p className="install-note">Öppna appen en gång med internet. Sedan kan du läsa det senast nedladdade schemat offline.</p>
    </dialog>
  </>
}

export function PwaUpdateNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    immediate: true,
  })

  if (!needRefresh) return null
  return <section className="surface pwa-update" aria-label="Appuppdatering">
    <p role="status">En ny version av Åtelschema finns.</p>
    <button className="button" onClick={() => void updateServiceWorker()}>Uppdatera</button>
    <button className="text-button" onClick={() => setNeedRefresh(false)}>Senare</button>
  </section>
}
