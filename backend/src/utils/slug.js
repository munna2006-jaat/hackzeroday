export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(prisma, model, baseSlug, excludeId = null) {
  const root = slugify(baseSlug) || "item";
  let slug = root;
  let counter = 1;

  while (true) {
    const existing = await prisma[model].findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }
    slug = `${root}-${counter}`;
    counter += 1;
  }
}
