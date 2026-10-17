interface BreadcrumbProps {
  items: string[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <p className="text-sm text-gray-500">
      {items.join(" — ")}
    </p>
  );
}
