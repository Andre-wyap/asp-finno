import { redirect } from 'next/navigation';
import {
  getAnnualPremium,
  plans,
  type AgeBand,
  type OccupationCategory,
} from '@asp/pricing';
import { ApplicationForm } from '../../components/ApplicationForm';

const VALID_AGE_BANDS: AgeBand[] = ['age_50_and_below', 'age_51_to_65'];
const VALID_CATEGORIES: OccupationCategory[] = ['A', 'B'];

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const plan = plans.find((p) => p.code === params.plan);
  const ageBand = params.ageBand as AgeBand | undefined;
  const occupationCategory = params.occupationCategory as OccupationCategory | undefined;

  if (
    !plan ||
    !ageBand ||
    !occupationCategory ||
    !VALID_AGE_BANDS.includes(ageBand) ||
    !VALID_CATEGORIES.includes(occupationCategory)
  ) {
    redirect('/#plans');
  }

  const premium = getAnnualPremium(plan.code, ageBand, occupationCategory);

  if (premium === null) {
    redirect('/#plans');
  }

  return (
    <ApplicationForm
      plan={plan}
      ageBand={ageBand}
      occupationCategory={occupationCategory}
      premium={premium}
    />
  );
}
