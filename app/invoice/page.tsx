import LookupPage from "@/features/storefront/screens/LookupPage";
import { StoreLogoMark } from "@/features/storefront/components/StoreLogoMark";
import { getAgencyName } from "@/features/storefront/lib/data";

export default async function Page() {
  return <LookupPage name={await getAgencyName()} mark={<StoreLogoMark />} />;
}
