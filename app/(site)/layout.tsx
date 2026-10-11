import Navbar from "@/components/navbar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="relative z-10 flex-1 flex flex-col">{children}</div>
    </>
  );
}
