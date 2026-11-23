/** Full-screen editors: a calm canvas placeholder while the editor chunk and the design load. */
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-ivory" aria-busy aria-label="Loading editor">
      <div className="h-14 border-b border-ink/10" />
      <div className="flex flex-1 gap-4 p-4">
        <div className="skeleton hidden w-64 lg:block" />
        <div className="grid flex-1 place-items-center">
          <div className="skeleton aspect-[3/4] w-[min(80vw,420px)]" />
        </div>
        <div className="skeleton hidden w-72 xl:block" />
      </div>
    </div>
  );
}
