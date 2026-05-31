import React, { useEffect } from 'react'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      background: '#1C1C1A', color: '#fff', borderRadius: 24,
      padding: '10px 20px', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.22)', zIndex: 999,
      animation: 'toastIn .2s ease',
      whiteSpace: 'nowrap'
    }}>
      <span style={{ color: '#5DCAA5', fontSize: 15 }}>✓</span>
      {message}
    </div>
  )
}
