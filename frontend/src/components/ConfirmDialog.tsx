import { Resource } from '../types'

interface Props {
  resource: Resource
  liveMode: boolean
  isAws: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ resource, liveMode, isAws, onConfirm, onCancel }: Props) {
  let warning: string
  if (isAws && liveMode) {
    warning = `This will send a REAL EC2 stop command. The instance (${resource.instanceType ?? resource.id}) will stop and billing will pause.`
  } else if (isAws && !liveMode) {
    warning = 'Live Mode is OFF — no real EC2 action will occur. Only the local state will update (simulation).'
  } else {
    warning = 'This will stop the simulated resource and halt metrics collection.'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '28px 32px', maxWidth: 420, width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Stop {resource.name}?</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#495057', lineHeight: 1.5 }}>
          {warning}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 18px', background: 'none', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 18px', background: '#dc3545', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600 }}
          >
            Confirm Stop
          </button>
        </div>
      </div>
    </div>
  )
}
