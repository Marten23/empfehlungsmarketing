type AdvisorBusinessImageProps = {
  imageUrl: string | null;
  name: string;
  ratio?: "portrait" | "landscape";
  className?: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "B";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function AdvisorBusinessImage({
  imageUrl,
  name,
  ratio = "portrait",
  className = "",
}: AdvisorBusinessImageProps) {
  const ratioClass = ratio === "landscape" ? "aspect-[16/9]" : "aspect-[9/16]";

  return (
    <div
      className={`relative ${ratioClass} overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_24%_14%,rgba(143,98,255,0.35),transparent_46%),linear-gradient(180deg,rgba(109,69,221,0.24),rgba(109,69,221,0.04))] ${className}`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="inline-flex h-24 w-24 items-center justify-center rounded-full border border-orange-300/70 bg-orange-100/90 text-2xl font-semibold text-orange-800">
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  );
}
