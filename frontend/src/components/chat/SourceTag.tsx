interface SourceTagProps {
  page?: number | null;
  version?: number | null;
}

export function SourceTag({ page, version }: SourceTagProps) {
  if (!page && !version) return null;

  const parts: string[] = [];
  if (version) parts.push(`v${version}`);
  if (page) parts.push(`Page ${page}`);
  const label = parts.join(" · ");

  const titleParts: string[] = [];
  if (version) titleParts.push(`Version ${version}`);
  if (page) titleParts.push(`Page ${page}`);

  return (
    <span
      className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
      title={`Sourced from ${titleParts.join(", ")}`}
    >
      {label}
    </span>
  );
}
