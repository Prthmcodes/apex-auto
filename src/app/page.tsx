import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { siteContent } from "@/content/site";

export const metadata: Metadata = {
  title: siteContent.seo.home.title,
  description: siteContent.seo.home.description,
  openGraph: {
    title: siteContent.seo.home.title,
    description: siteContent.seo.home.description,
    type: "website",
  },
};

export default function Home() {
  return <HomeClient />;
}
