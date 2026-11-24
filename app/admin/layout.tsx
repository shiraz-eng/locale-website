import type {ReactNode} from "react";
import AdminShell from "../../components/admin/shell";
import "./admin.css";
export const metadata={title:{default:"Studio admin",template:"%s · Studio admin"},robots:{index:false,follow:false}};
export default function AdminLayout({children}:{children:ReactNode}){
  return <AdminShell>{children}</AdminShell>
}
