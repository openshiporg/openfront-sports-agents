import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { platformQuery } from '../../lib/query'

export default async function SettingsPage() {
  let data: any
  try { data = await platformQuery(`{ agencies(take: 1) { id name defaultPlayingCommissionBps defaultEndorsementCommissionBps currencyCode fiscalYearStart refundApprovalThresholdCents } }`) }
  catch (e: any) { return <PlatformPage title="Settings"><ErrorState message={e.message} /></PlatformPage> }
  const a = data.agencies[0]
  return (
    <PlatformPage title="Settings">
      <Section title="Agency">
        {a ? [['Name', a.name], ['Playing commission', `${(a.defaultPlayingCommissionBps / 100).toFixed(2)}%`], ['Endorsement commission', `${(a.defaultEndorsementCommissionBps / 100).toFixed(2)}%`], ['Currency', a.currencyCode], ['Fiscal year starts', `Month ${a.fiscalYearStart}`], ['Refund approval above', `${(a.refundApprovalThresholdCents / 100).toLocaleString('en-US', { style: 'currency', currency: a.currencyCode })}`]].map(([k, v]) => <Row key={k}><Cell muted>{k}</Cell><Cell>{v}</Cell></Row>) : <Empty>Run setup from the sidebar.</Empty>}
      </Section>
    </PlatformPage>
  )
}
