import React from 'react'

export default function ConfirmModal({ title, message, confirmLabel = 'Eliminar', confirmColor = '#D85A30', onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, padding: 20
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px 22px',
        width: '100%', maxWidth: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--gray-600)', textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="btn-ghost" style={{ flex: 1, padding: '10px 0' }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{
              flex: 1, padding: '10px 0', border: 'none', borderRadius: 10,
              background: confirmColor, color: '#fff', fontWeight: 600,
              fontSize: 14, cursor: 'pointer'
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
