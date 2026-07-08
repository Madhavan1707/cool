import type { Metadata } from "next";
import Home from "./home";

// The interactive app lives in the client component ./home; this server shell
// exists so generateMetadata can read the share URL's params and point
// og:image at /api/og with the same state — link previews then show the very
// shape the link opens to.

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const MAX_TEXT = 64; // same clamp the app applies when restoring from the URL

function first(value: string | string[] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  return single ? single.slice(0, MAX_TEXT) : null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const a = first(params.a);
  const b = first(params.b);
  const blend = first(params.v) === "blend" && !!a && !!b;
  const palette = first(params.p);

  const og = new URLSearchParams();
  if (a) og.set("a", a);
  if (b) og.set("b", b);
  if (blend) og.set("v", "blend");
  if (palette) og.set("p", palette);
  const query = og.toString();
  const ogUrl = query ? `/api/og?${query}` : "/api/og";

  const title =
    a && b
      ? `${blend ? `${a} × ${b}` : `${a} & ${b}`} — Fractals of You`
      : a
        ? `${a} — Fractals of You`
        : "Fractals of You";
  const description =
    a && b
      ? `Two living particle shapes, grown from "${a}" and "${b}". Open the link to play with them.`
      : a
        ? `A one-of-a-kind living particle shape, grown from "${a}". Open the link to play with it.`
        : "Turn your name into a one-of-a-kind particle shape you can play with.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Fractals of You",
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function Page() {
  return <Home />;
}
