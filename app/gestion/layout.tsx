import { NavGestion } from "@/components/nav-gestion";

export default function LayoutGestion({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavGestion />
      <div className="main">{children}</div>
    </>
  );
}
