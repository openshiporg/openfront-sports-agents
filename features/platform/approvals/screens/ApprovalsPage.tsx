import { PlatformPage, Section, Row, Cell, Empty, ErrorState } from '../../components/Section'
import { StatusLabel } from '../../components/StatusLabel'
import { DecideButtons, UseApprovalButton } from '../../components/ApprovalControls'
import { platformQuery, moneyExact, day } from '../../lib/query'

const LABEL: Record<string, string> = { exclusivity_override: 'Exclusivity override', commission_writeoff: 'Commission write-off', refund_payment: 'Refund' }

export default async function ApprovalsPage() {
  let data: any
  try {
    data = await platformQuery(`{ authenticatedItem { ... on User { id role { canApproveActions } } }
      managerApprovals(orderBy: { requestedAt: desc }, take: 100) { id actionType targetId amountCents reason status requestedAt expiresAt requestedBy { id name } approvedBy { name } } }`)
  } catch (e: any) { return <PlatformPage title="Approvals"><ErrorState message={e.message} /></PlatformPage> }
  const me = data.authenticatedItem
  const canDecide = Boolean(me?.role?.canApproveActions)
  const rows = data.managerApprovals as any[]
  const group = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status))
  const render = (a: any) => (
    <Row key={a.id}>
      <Cell className="font-medium"><StatusLabel value={a.status === 'requested' ? 'pending' : a.status} className="mr-2" />{LABEL[a.actionType] || a.actionType}</Cell>
      <Cell muted>{a.reason} · {a.requestedBy?.name}{a.amountCents ? ` · ${moneyExact(a.amountCents)}` : ''} · {day(a.requestedAt)}</Cell>
      {a.status === 'requested' && canDecide && a.requestedBy?.id !== me.id ? <DecideButtons approvalId={a.id} /> : null}
      {a.status === 'requested' && a.requestedBy?.id === me?.id ? <Cell muted>Needs another approver</Cell> : null}
      {a.status === 'approved' && a.requestedBy?.id === me?.id && a.actionType === 'exclusivity_override' ? <UseApprovalButton operation="activateEndorsementDeal" args={{ dealId: a.targetId, approvalId: a.id }} label="Activate deal" /> : null}
      {a.status === 'approved' && a.requestedBy?.id === me?.id && a.actionType === 'commission_writeoff' ? <UseApprovalButton operation="writeOffCommissionInvoice" args={{ invoiceId: a.targetId, approvalId: a.id, reason: a.reason }} label="Write off" /> : null}
    </Row>
  )
  return (
    <PlatformPage title="Approvals">
      <Section title="Waiting" hint={String(group(['requested']).length)}>{group(['requested']).length ? group(['requested']).map(render) : <Empty>Nothing waiting</Empty>}</Section>
      <Section title="Approved, not yet used">{group(['approved']).length ? group(['approved']).map(render) : <Empty>None</Empty>}</Section>
      <Section title="Decided and used">{group(['rejected', 'consumed']).length ? group(['rejected', 'consumed']).map(render) : <Empty>None</Empty>}</Section>
    </PlatformPage>
  )
}
