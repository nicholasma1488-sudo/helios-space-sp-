import { leavePay } from '../product/pay'
import { useEffect } from 'react'
import { Check, Gift, Sparkles } from 'lucide-react'
import { Logo } from '../components/Logo'
import './PaymentPage.css'

/** Legacy /pay route — Helios Space is completely free. */
export function PaymentPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => leavePay('/'), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="pay-page">
      <header className="pay-top">
        <Logo size="sm" />
        <button type="button" className="liquid-glass-btn" onClick={() => leavePay('/')}>
          返回 Helios
        </button>
      </header>
      <main className="pay-main">
        <span className="pay-kicker"><Gift size={14} /> FREE FOREVER</span>
        <h1>Helios Space 完全免费</h1>
        <p>没有套餐，没有升级，也没有银行卡。正在带你回到协作空间…</p>
        <ul className="pay-free-list">
          <li><Check size={14} /> 五个 Create 工具全部可用</li>
          <li><Check size={14} /> Space · Messages · Home</li>
          <li><Check size={14} /> 文稿不限篇数与字数</li>
        </ul>
        <button type="button" className="liquid-glass-btn is-primary" onClick={() => leavePay('/')}>
          <Sparkles size={15} /> 进入 Helios
        </button>
      </main>
    </div>
  )
}
