import type { Metadata } from "next";
import { Inter, Orbitron, Rajdhani, Fira_Code, Special_Elite } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import Background from "@/components/background";
import { ToastHost } from "@/components/toast";
import SessionWatchdog from "@/components/session-watchdog";

const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--f-orbitron", display: "swap" });
const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--f-rajdhani",
  weight: ["500", "600", "700"],
  display: "swap",
});
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--f-fira", display: "swap" });
const specialElite = Special_Elite({ subsets: ["latin"], variable: "--f-special", weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: "TekQbe - Hack the Pattern",
  description:
    "Write algorithms, compile pattern matrices, execute test cases, and claim your place on the live hacker leaderboard.",
};

const fontVariables = [inter.variable, orbitron.variable, rajdhani.variable, firaCode.variable, specialElite.variable]
  .filter(Boolean)
  .join(" ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} scroll-smooth h-full`}>
      <body className="font-sans antialiased relative min-h-screen flex flex-col selection:bg-cyan-500 selection:text-black">
        <Background />
        {children}
        <ToastHost />
        <SessionWatchdog />
      </body>
    </html>
  );
}
