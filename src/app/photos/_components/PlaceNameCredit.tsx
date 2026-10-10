/** OpenStreetMap's terms require visible credit wherever place names that came from its data are shown. */
export function PlaceNameCredit() {
  return (
    <p className="mt-10 text-center font-sans text-[0.75rem] text-muted">
      Place names ©{' '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent">
        OpenStreetMap contributors
      </a>
    </p>
  );
}
