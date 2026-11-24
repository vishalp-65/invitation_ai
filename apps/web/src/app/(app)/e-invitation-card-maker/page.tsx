import { MakerLanding, makerMetadata } from '@/features/makers/maker-landing';

export const metadata = makerMetadata('e-invitation-card-maker');

export default function Page() {
  return <MakerLanding slug="e-invitation-card-maker" />;
}
