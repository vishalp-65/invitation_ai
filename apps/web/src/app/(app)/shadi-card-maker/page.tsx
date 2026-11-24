import { MakerLanding, makerMetadata } from '@/features/makers/maker-landing';

export const metadata = makerMetadata('shadi-card-maker');

export default function Page() {
  return <MakerLanding slug="shadi-card-maker" />;
}
