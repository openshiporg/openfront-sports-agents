import LookupPage from "@/features/storefront/screens/LookupPage";
import { StoreLogoMark } from "@/features/storefront/components/StoreLogoMark";
import { getRoster } from "@/features/storefront/lib/data";

export const metadata = { title: "Pay an invoice" };

export default async function Page() {
  return <LookupPage mark={<StoreLogoMark />} name={(await getRoster()).name} />;
}
